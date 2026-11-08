import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return}const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file;if(['/','/index.html','/style.css','/app.js','/fund.json'].includes(route))file=path.join(root,route==='/'?'index.html':route.slice(1));else if(/^\/assets\/[a-zA-Z0-9_-]+\.(jpg|webp|ttf|txt)$/.test(route))file=path.join(root,route.slice(1));else{res.writeHead(404);res.end('Not found');return}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(404);res.end('Not found')}});
server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log('FCMB fundraiser preview: http://127.0.0.1:'+server.address().port));
process.on('SIGTERM',()=>server.close());process.on('SIGINT',()=>server.close());
