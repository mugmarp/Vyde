const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader}=require('./helpers/load-typescript.cjs');
for (const [method, arg, extractor] of [
 ['fetchYouTubeVideo','abcdefghijk','extractPlayer'], ['fetchYouTubeComments','abcdefghijk','extractComments'],
 ['searchYouTube','music','extractSearch'], ['fetchLiveFeed','US','extractBrowse'],
]) {
 test(`${method} preserves the direct error when no optional proxy exists`,async()=>{
  const original=new Error('Original provider failure'); let requests=0;
  const api=createLoader({'react-native':{Platform:{OS:'android'}},'@/services/innertube':{[extractor]:async()=>{throw original}}},async()=>{requests++;throw new Error('Unexpected proxy')})('api/youtube.ts');
  await assert.rejects(api[method](arg),e=>e===original);
  assert.equal(requests,0);
 });
}
for(const result of [{commentCount:0,items:[]},{commentCount:null,items:[],disabled:true}]) {
 test(`valid ${result.disabled?'disabled':'empty'} comments do not require a proxy`,async()=>{
  const api=createLoader({'react-native':{Platform:{OS:'android'}},'@/services/innertube':{extractComments:async()=>result}})('api/youtube.ts');
  assert.equal(await api.fetchYouTubeComments('abcdefghijk'),result);
 });
}
test('a valid empty search is returned without inventing a proxy requirement',async()=>{
 const api=createLoader({'react-native':{Platform:{OS:'android'}},'@/services/innertube':{extractSearch:async()=>[]}})('api/youtube.ts');
 assert.equal((await api.searchYouTube('music')).items.length,0);
});

test('a failing configured proxy cannot replace the original player error',async()=>{
 const original=new Error('Original player failure');let requests=0;
 const api=createLoader({'react-native':{Platform:{OS:'android'}},'@/services/innertube':{extractPlayer:async()=>{throw original}}},async()=>{
  requests++;return {ok:false,json:async()=>({message:'Proxy unavailable'})};
 },{EXPO_PUBLIC_API_URL:'https://example.com'})('api/youtube.ts');
 await assert.rejects(api.fetchYouTubeVideo('abcdefghijk'),e=>e===original);assert.equal(requests,1);
});
test('a configured successful proxy remains available after a direct failure',async()=>{
 const fallback={provider:'proxy',nativePlaybackCandidates:[]};
 const api=createLoader({'react-native':{Platform:{OS:'android'}},'@/services/innertube':{extractPlayer:async()=>{throw new Error('direct failure')}}},async()=>({ok:true,json:async()=>fallback}),{EXPO_PUBLIC_API_URL:'https://example.com'})('api/youtube.ts');
 assert.equal(await api.fetchYouTubeVideo('abcdefghijk'),fallback);
});
test('comments continuation reaches the direct extractor without sending tokens to a proxy',async()=>{
 let token;
 const api=createLoader({'react-native':{Platform:{OS:'android'}},'@/services/innertube':{extractComments:async(id,next)=>{token=next;return {items:[],commentCount:null}}}},async()=>{throw new Error('Unexpected proxy')},{EXPO_PUBLIC_API_URL:'https://example.com'})('api/youtube.ts');
 await api.fetchYouTubeComments('abcdefghijk','continuation-fixture');assert.equal(token,'continuation-fixture');
});
