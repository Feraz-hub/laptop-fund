// Read-only credential check: no checkout is created and no money is moved.
const secret=process.env.FLW_SECRET_KEY||'';
const mode=process.env.PAYMENT_MODE||'test';
if(!secret){console.log('No Flutterwave key is configured. Run configure-payments.ps1 after getting a V3 test key from your dashboard.');process.exitCode=2;}
else if(mode!=='test'||!secret.startsWith('FLWSECK_TEST-')){console.log('This diagnostic accepts TEST keys only. No request was sent.');process.exitCode=2;}
else{
  try{
    const response=await fetch('https://api.flutterwave.com/v3/banks/NG',{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(!response.ok||result.status!=='success'||!Array.isArray(result.data)){console.log('Flutterwave did not accept the test API request. Check your V3 test secret key and dashboard access.');process.exitCode=1;}
    else{console.log('Flutterwave test API connection succeeded.');console.log('FCMB listed as a Nigerian bank: '+result.data.some(bank=>/monument|fcmb/i.test(bank.name||'')));console.log('Webhook secret configured: '+Boolean(process.env.FLW_SECRET_HASH));console.log('This check did not create a payment or configure a settlement account.');}
  }catch{console.log('Could not reach the Flutterwave API. Check your connection and try again. No payment was created.');process.exitCode=1;}
}
