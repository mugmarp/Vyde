const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader}=require('./helpers/load-typescript.cjs');

test('HTTP failures retain endpoint, wire client identity and status',async()=>{
 const client=createLoader({'react-native':{Platform:{OS:'android'}}},async()=>({ok:false,status:400,text:async()=>''}))('services/innertube/innertubeClient.ts');
 const c=new client.InnerTubeClient();
 await assert.rejects(c.post('player',{}, {clientName:'WEB',clientVersion:'test',userAgent:'test'}),e=>e.name==='InnerTubeRequestError'&&e.httpStatus===400&&e.client==='WEB'&&e.endpoint==='player');
});
test('cascade retains playability reasons and HTTP failures across attempts',async()=>{
 const module=createLoader({'react-native':{Platform:{OS:'android'}}})('services/innertube/innertubeClient.ts');
 const client=new module.InnerTubeClient();
 client.post=async(endpoint,body,profile)=>{
  if(profile.clientName==='bad')throw new module.InnerTubeRequestError(endpoint,'bad',400);
  return {playabilityStatus:{status:'LOGIN_REQUIRED',reason:'Sign in to confirm availability.'}};
 };
 await assert.rejects(client.postWithCascade('player',()=>({}),[{clientName:'bad'},{clientName:'WEB'}],()=>false),e=>{
  assert.equal(e.name,'InnerTubeCascadeError');assert.equal(e.attempts.length,2);assert.equal(e.attempts[0].httpStatus,400);
  assert.equal(e.attempts[1].playabilityStatus,'LOGIN_REQUIRED');assert.match(e.message,/Sign in/);return true;
 });
});
