import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {Payments,sameSecret} from './payments.mjs';

function fixture(t,mode='live'){
  const directory=mkdtempSync(path.join(tmpdir(),'laptop-payment-test-'));
  let tx;let lastCheckout;let maliciousLink=false;
  const fetcher=async(url,options)=>{if(url.endsWith('/payments')){lastCheckout=JSON.parse(options.body);return Response.json({status:'success',data:{link:maliciousLink?'https://example.com/pay':'https://checkout.flutterwave.com/v3/hosted/pay/test'}})}return Response.json({status:'success',data:tx});};
  const config={directory,mode,secret:mode==='live'?'FLWSECK-fixture':'FLWSECK_TEST-fixture',webhookHash:'fixture-webhook-secret',origin:'https://fund.example.com',fetcher};
  const service=new Payments(config);
  t.after(()=>{service.close();rmSync(directory,{recursive:true,force:true})});
  return {service,config,directory,get checkout(){return lastCheckout},set tx(value){tx=value},set malicious(value){maliciousLink=value}};
}
async function ready(f){const checkout=await f.service.checkout({amount:5000,email:'donor@example.com'});f.tx={id:1234,status:'successful',tx_ref:checkout.reference,currency:'NGN',amount:5000};return checkout.reference;}
test('verified payments are counted once even with duplicate webhook/return verification',async t=>{const f=fixture(t);const ref=await ready(f);await f.service.verify(1234,ref);await f.service.verify(1234,ref);assert.equal(f.service.total().amount,5000);assert.equal(f.service.total().count,1);assert.equal(f.checkout.redirect_url,'https://fund.example.com/?payment_return=1');});
test('test-mode transactions never increase live totals',async t=>{const f=fixture(t,'test');const ref=await ready(f);await f.service.verify(1234,ref);assert.equal(f.service.total().amount,0);assert.equal(f.service.total().count,0);});
test('rejects mismatched amount, currency, reference, status and transaction ID',async t=>{const f=fixture(t);const ref=await ready(f);const original={id:1234,status:'successful',tx_ref:ref,currency:'NGN',amount:5000};for(const change of [{amount:1},{currency:'USD'},{tx_ref:'unrelated'},{status:'pending'},{id:9876}]){f.tx={...original,...change};await assert.rejects(f.service.verify(1234,ref));assert.equal(f.service.total().amount,0)}});
test('rejects invalid input and unexpected checkout hosts',async t=>{const f=fixture(t);for(const amount of [0,-1,1.5,'5000',Infinity,10000001])await assert.rejects(f.service.checkout({amount,email:'donor@example.com'}));await assert.rejects(f.service.checkout({amount:5000,email:'invalid'}));f.malicious=true;await assert.rejects(f.service.checkout({amount:5000,email:'donor@example.com'}));});
test('pending reconciliation verifies payments missed by redirects and webhooks',async t=>{const f=fixture(t);await ready(f);await f.service.reconcilePending();assert.equal(f.service.total().amount,5000);});
test('confirmed records survive a process/database restart',async t=>{const f=fixture(t);const ref=await ready(f);await f.service.verify(1234,ref);const second=new Payments(f.config);assert.equal(second.total().amount,5000);second.close();});
test('webhook shared secret fails closed and compares exact values',()=>{assert.equal(sameSecret('',''),false);assert.equal(sameSecret(undefined,'key'),false);assert.equal(sameSecret('wrong','key'),false);assert.equal(sameSecret('key','key'),true)});
test('mode/key mismatch cannot enable live payments',t=>{const f=fixture(t);assert.throws(()=>new Payments({...f.config,mode:'live',secret:'FLWSECK_TEST-fixture'}));});
test('HTTP server protects secrets/source and disables unconfigured checkout',async t=>{
  const directory=mkdtempSync(path.join(tmpdir(),'laptop-http-test-'));const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,PORT:'0',PUBLIC_ORIGIN:'http://127.0.0.1:4182',DATA_DIRECTORY:directory,FLW_SECRET_KEY:'',FLW_SECRET_HASH:''},stdio:['ignore','pipe','pipe']});
  t.after(async()=>{child.kill();await new Promise(resolve=>child.once('exit',resolve));rmSync(directory,{recursive:true,force:true})});
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server start timeout')),10000);child.stdout.on('data',chunk=>{const match=String(chunk).match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1])}});child.once('error',reject)});const base='http://127.0.0.1:'+port;
  for(const file of ['/.env','/.env.example','/data/payments.sqlite','/payments.mjs','/.git/config'])assert.equal((await fetch(base+file)).status,404);
  assert.equal((await (await fetch(base+'/api/config')).json()).flutterwave,false);
  const total=await (await fetch(base+'/api/fund')).json();assert.equal(total.onlineRaised,0);assert.equal(total.raised,total.manualRaised);
  assert.equal((await fetch(base+'/api/flutterwave/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  assert.equal((await fetch(base+'/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://wrong.example'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:4182'},body:JSON.stringify({amount:5000,email:'donor@example.com'})})).status,503);
});
