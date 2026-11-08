import { DatabaseSync } from 'node:sqlite';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
export class PaymentError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export function sameSecret(a,b){if(typeof a!=='string'||typeof b!=='string'||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function validAmount(amount){return typeof amount==='number'&&Number.isSafeInteger(amount)&&amount>=1&&amount<=10000000;}
export class Payments {
  constructor({directory,secret='',webhookHash='',mode='test',origin,fetcher=fetch}){
    this.secret=secret;this.webhookHash=webhookHash;this.mode=mode;this.origin=origin;this.fetcher=fetcher;
    if(!['test','live'].includes(mode))throw Error('PAYMENT_MODE must be test or live.');
    const url=new URL(origin);if(url.origin!==origin)throw Error('PUBLIC_ORIGIN must be an origin without a trailing slash or path.');
    if(mode==='live'&&url.protocol!=='https:')throw Error('Live payments require an HTTPS public origin.');
    if(secret&&((mode==='test'&&!secret.startsWith('FLWSECK_TEST-'))||(mode==='live'&&(!secret.startsWith('FLWSECK-')||secret.startsWith('FLWSECK_TEST-')))))throw Error('Flutterwave key does not match PAYMENT_MODE.');
    mkdirSync(directory,{recursive:true});this.db=new DatabaseSync(path.join(directory,'payments.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS payments(ref TEXT PRIMARY KEY,amount INTEGER NOT NULL,mode TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',transaction_id TEXT UNIQUE,confirmed_at TEXT,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS payments_status ON payments(mode,status);`);
    if(!this.db.prepare('PRAGMA table_info(payments)').all().some(column=>column.name==='checked_at'))this.db.exec('ALTER TABLE payments ADD COLUMN checked_at TEXT');
  }
  get enabled(){return Boolean(this.secret&&this.webhookHash);}
  async api(route,options={}){
    const response=await this.fetcher('https://api.flutterwave.com/v3/'+route,{...options,headers:{Authorization:'Bearer '+this.secret,'Content-Type':'application/json'},signal:AbortSignal.timeout(12000)});
    const result=await response.json();if(!response.ok||result.status!=='success')throw new PaymentError('Flutterwave could not complete this request. Please try again.',502);return result.data;
  }
  async checkout({amount,email,name}){
    if(!this.enabled)throw new PaymentError('Flutterwave is not available yet. You can use direct FCMB transfer.',503);
    if(!validAmount(amount))throw new PaymentError('Enter a whole-naira amount between ₦1 and ₦10,000,000.');
    if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new PaymentError('Enter a valid email address for the payment receipt.');
    if(name!==undefined&&(typeof name!=='string'||name.length>100))throw new PaymentError('Keep your name under 100 characters.');
    const ref='samuel-'+randomUUID();this.db.prepare('INSERT INTO payments(ref,amount,mode,created_at) VALUES(?,?,?,?)').run(ref,amount,this.mode,new Date().toISOString());
    const data=await this.api('payments',{method:'POST',body:JSON.stringify({tx_ref:ref,amount,currency:'NGN',redirect_url:this.origin+'/?payment_return=1',customer:{email:email.trim(),name:name?.trim()||'Supporter'},customizations:{title:"Samuel's laptop fund",description:'Blender, 3D modelling, animation and web design'},meta:{fundraiser:'samuel-laptop-fund'},session_duration:60})});
    let url;try{url=new URL(data.link);}catch{throw new PaymentError('The payment link could not be created.',502);}
    if(url.protocol!=='https:'||url.hostname!=='checkout.flutterwave.com')throw new PaymentError('Flutterwave returned an unexpected checkout address.',502);
    return {url:url.href,reference:ref,mode:this.mode};
  }
  async verify(id,expectedRef){
    if(!this.enabled)throw new PaymentError('Flutterwave verification is not configured.',503);
    if(!/^\d{1,20}$/.test(String(id)))throw new PaymentError('Invalid transaction identifier.');
    const data=await this.api('transactions/'+encodeURIComponent(id)+'/verify');
    return this.record(data,id,expectedRef);
  }
  record(data,id,expectedRef){
    const payment=this.db.prepare('SELECT * FROM payments WHERE ref=?').get(data.tx_ref);
    if(!payment||payment.mode!==this.mode||(expectedRef&&data.tx_ref!==expectedRef))throw new PaymentError('Payment reference could not be matched.',409);
    if(data.status!=='successful'||data.currency!=='NGN'||Number(data.amount)!==payment.amount||String(data.id)!==String(id))throw new PaymentError('Payment has not been confirmed for the expected amount and currency.',409);
    try{this.db.prepare("UPDATE payments SET status='confirmed',transaction_id=?,confirmed_at=? WHERE ref=? AND status='pending'").run(String(id),new Date().toISOString(),payment.ref);}catch{throw new PaymentError('This transaction has already been assigned.',409);}
    if(payment.transaction_id&&payment.transaction_id!==String(id))throw new PaymentError('Reference already confirmed with another transaction.',409);
    return {confirmed:true,mode:payment.mode,amount:payment.amount};
  }
  async reconcilePending(){
    if(!this.enabled)return;
    const pending=this.db.prepare("SELECT ref FROM payments WHERE status='pending' AND mode=? ORDER BY checked_at ASC LIMIT 20").all(this.mode);
    for(const item of pending){this.db.prepare('UPDATE payments SET checked_at=? WHERE ref=?').run(new Date().toISOString(),item.ref);try{const data=await this.api('transactions/verify_by_reference?tx_ref='+encodeURIComponent(item.ref));if(data.status==='successful')this.record(data,data.id,item.ref);}catch{/* Pending or unattempted checkouts are retried on a later pass. */}}
  }
  total(){return this.db.prepare("SELECT COALESCE(SUM(amount),0) AS amount,COUNT(*) AS count,MAX(confirmed_at) AS updatedAt FROM payments WHERE status='confirmed' AND mode='live'").get();}
  close(){this.db.close();}
}
