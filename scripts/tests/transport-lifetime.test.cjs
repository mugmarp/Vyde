const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader,deferred,settle}=require('./helpers/load-typescript.cjs');
const platform={'react-native':{Platform:{OS:'android'}}};
const profile={clientName:'WEB',clientVersion:'test',userAgent:'test'};
const never=()=>new Promise(()=>{});

test('request deadline bounds work that ignores cancellation',async()=>{
 const {runBoundedRequest}=createLoader()('services/innertube/request.ts');let signal;
 await assert.rejects(runBoundedRequest(async current=>{signal=current;await never();},{timeoutMs:10}),e=>e.name==='RequestTimeoutError');
 assert.equal(signal.aborted,true);
});
test('caller cancellation rejects promptly and aborts the underlying request',async()=>{
 const {runBoundedRequest}=createLoader()('services/innertube/request.ts');const controller=new AbortController();let signal;
 const result=runBoundedRequest(async current=>{signal=current;await never();},{signal:controller.signal});
 await settle();controller.abort();await assert.rejects(result,e=>e.name==='AbortError');assert.equal(signal.aborted,true);
});
test('already cancelled callers start no transport or visitor work',async()=>{
 let calls=0;const {InnerTubeClient}=createLoader(platform,async()=>{calls++;return {};})('services/innertube/innertubeClient.ts');
 const controller=new AbortController();controller.abort();
 await assert.rejects(new InnerTubeClient().post('browse',{},profile,{signal:controller.signal}),e=>e.name==='AbortError');assert.equal(calls,0);
});
test('HTTP success with stalled body parsing still obeys the deadline',async()=>{
 const {InnerTubeClient}=createLoader(platform,async url=>url.endsWith('/guide')?{ok:false}:{ok:true,status:200,json:never})('services/innertube/innertubeClient.ts');
 await assert.rejects(new InnerTubeClient().post('browse',{},profile,{timeoutMs:10}),e=>e.name==='RequestTimeoutError');
});
test('visitor warmup is shared and cannot block concurrent discovery',async()=>{
 const guide=deferred();let warmups=0;let primary=0;
 const {InnerTubeClient}=createLoader(platform,async url=>{
  if(url.endsWith('/guide')){warmups++;return guide.promise;}
  primary++;return {ok:true,status:200,json:async()=>({contents:{}})};
 })('services/innertube/innertubeClient.ts');
 const client=new InnerTubeClient();await Promise.all([client.post('browse',{},profile),client.post('search',{},profile)]);
 assert.equal(warmups,1);assert.equal(primary,2);guide.resolve({ok:false});await settle();
});
test('failed visitor warmup has a cooldown rather than repeating on every request',async()=>{
 let warmups=0;
 const {InnerTubeClient}=createLoader(platform,async url=>{
  if(url.endsWith('/guide')){warmups++;return {ok:false};}
  return {ok:true,status:200,json:async()=>({})};
 })('services/innertube/innertubeClient.ts');
 const client=new InnerTubeClient();await client.post('search',{},profile);await settle();await client.post('search',{},profile);assert.equal(warmups,1);
});
test('a late visitor warmup cannot overwrite a fresher primary-response token',async()=>{
 const guide=deferred();const bodies=[];let primary=0;
 const {InnerTubeClient}=createLoader(platform,async(url,options)=>{
  if(url.endsWith('/guide'))return guide.promise;
  bodies.push(JSON.parse(options.body));primary++;
  return {ok:true,status:200,json:async()=>primary===1?{responseContext:{visitorData:'fresh-token'}}:{}};
 })('services/innertube/innertubeClient.ts');
 const client=new InnerTubeClient();await client.post('search',{},profile);
 guide.resolve({ok:true,json:async()=>({responseContext:{visitorData:'older-token'}})});await settle();
 await client.post('search',{},profile);assert.equal(bodies[1].context.client.visitorData,'fresh-token');
});
test('visitor data is isolated by client identity and content region',async()=>{
 const bodies=[];
 const {InnerTubeClient}=createLoader(platform,async(url,options)=>{
  if(url.endsWith('/guide'))return {ok:false};
  bodies.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>({responseContext:{visitorData:'isolated-token'}})};
 })('services/innertube/innertubeClient.ts');
 const client=new InnerTubeClient();await client.post('search',{},profile);
 await client.post('search',{}, {...profile,clientName:'ANDROID'});
 await client.post('search',{},profile,{region:'UG'});
 assert.equal(bodies[1].context.client.visitorData,undefined);assert.equal(bodies[2].context.client.visitorData,undefined);assert.equal(bodies[2].context.client.gl,'UG');
});

test('a response finishing after the deadline is rejected even when synchronous work delayed the timer',async()=>{
 const {runBoundedRequest}=createLoader()('services/innertube/request.ts');
 await assert.rejects(runBoundedRequest(async()=>{
  const end=Date.now()+15;while(Date.now()<end){}return 'late';
 },{timeoutMs:5}),e=>e.name==='RequestTimeoutError');
});
