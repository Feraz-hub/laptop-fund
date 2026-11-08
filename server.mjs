import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Payments,PaymentError,sameSecret} from './payments.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT||4174);
const origin=process.env.PUBLIC_ORIGIN||'http://127.0.0.1:'+port;
const payments=new Payments({directory:path.resolve(root,process.env.DATA_DIRECTORY||'data'),secret:process.env.FLW_SECRET_KEY||'',webhookHash:process.env.FLW_SECRET_HASH||'',mode:process.env.PAYMENT_MODE||'test',origin});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.txt':'text/plain'};
const limits=new Map();
function allowed(req,bucket,max){const key=bucket+':'+req.socket.remoteAddress;const now=Date.now();let entry=limits.get(key);if(!entry||entry.until<now){entry={until:now+60000,count:0};limits.set(key,entry)}return ++entry.count<=max;}
const cleanup=setInterval(()=>{for(const [key,value] of limits)if(value.until<Date.now())limits.delete(key)},60000);cleanup.unref();
let reconciling=false;
async function reconcile(){if(reconciling)return;reconciling=true;try{await payments.reconcilePending()}finally{reconciling=false}}
const reconciliation=setInterval(reconcile,300000);reconciliation.unref();
reconcile();
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536)throw new PaymentError('Request is too large.',413);chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new PaymentError('Send valid JSON.');}}
async function publicFund(){const manual=JSON.parse(await readFile(path.join(root,'fund.json'),'utf8'));if(!Number.isSafeInteger(manual.raised)||manual.raised<0||!Number.isSafeInteger(manual.confirmedContributions)||manual.confirmedContributions<0)throw Error('Invalid manual total');const online=payments.total();return {...manual,raised:manual.raised+online.amount,confirmedContributions:manual.confirmedContributions+online.count,updatedAt:[manual.updatedAt,online.updatedAt].filter(Boolean).sort().at(-1)||null,manualRaised:manual.raised,onlineRaised:online.amount,automatic:payments.enabled};}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self'; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try{
    const url=new URL(req.url,origin);const route=url.pathname;
    if(route==='/healthz'){json(res,200,{ok:true});return;}
    if(req.method==='GET'&&route==='/api/config'){json(res,200,{flutterwave:payments.enabled,mode:payments.mode});return;}
    if(req.method==='GET'&&route==='/api/fund'){json(res,200,await publicFund());return;}
    if(req.method==='POST'&&(route==='/api/checkout'||route==='/api/verify')){
      if(req.headers.origin!==origin)throw new PaymentError('Reload the website before trying again.',403);
      if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new PaymentError('JSON is required.',415);
      if(!allowed(req,route,route==='/api/checkout'?15:30))throw new PaymentError('Too many requests. Please wait a minute.',429);
      const input=await body(req);json(res,200,route==='/api/checkout'?await payments.checkout(input):await payments.verify(input.transactionId,input.reference));return;
    }
    if(req.method==='POST'&&route==='/api/flutterwave/webhook'){
      if(!sameSecret(req.headers['verif-hash'],payments.webhookHash))throw new PaymentError('Invalid webhook.',401);
      const event=await body(req);
      if(event.event==='charge.completed'&&event.data?.status==='successful')await payments.verify(event.data.id,event.data.tx_ref);
      json(res,200,{received:true});return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD')throw new PaymentError('Method not allowed.',405);
    const name=decodeURIComponent(route);let file;
    if(['/','/index.html','/style.css','/app.js','/fund.json'].includes(name))file=path.join(root,name==='/'?'index.html':name.slice(1));
    else if(/^\/assets\/[a-zA-Z0-9_-]+\.(jpg|webp|ttf|txt)$/.test(name))file=path.join(root,name.slice(1));
    else throw new PaymentError('Not found.',404);
    let data;try{data=await readFile(file)}catch{throw new PaymentError('Not found.',404);}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
  }catch(error){const status=error instanceof PaymentError?error.status:502;json(res,status,{error:error instanceof PaymentError?error.message:'The payment service is temporarily unavailable. Please try again.'});}
});
server.requestTimeout=20000;server.headersTimeout=15000;
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log('Fundraiser server listening on port '+server.address().port+'. Flutterwave '+(payments.enabled?payments.mode+' mode':'not configured')+'.'));
function shutdown(){server.close(()=>{payments.close();process.exit(0)});}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
