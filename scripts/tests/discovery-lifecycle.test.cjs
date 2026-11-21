const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader,deferred,settle}=require('./helpers/load-typescript.cjs');
const platform={'react-native':{Platform:{OS:'android'}}};
const never=()=>new Promise(()=>{});
function apiFixture(extractors) {return createLoader({...platform,'@/services/innertube':extractors})('api/youtube.ts');}
test('successful discovery is cached by query and can be explicitly refreshed',async()=>{
 let calls=0;const api=apiFixture({extractSearch:async()=>{calls++;return [{id:'abcdefghijk'}];}});
 await api.searchYouTube('Music');await api.searchYouTube('Music');assert.equal(calls,1);
 await api.searchYouTube('Gaming');assert.equal(calls,2);
 await api.searchYouTube('Music',{forceRefresh:true});assert.equal(calls,3);
});
test('empty results and errors are not cached',async()=>{
 let calls=0;const api=apiFixture({extractSearch:async()=>{calls++;if(calls===1)throw new Error('temporary');return [];}});
 await assert.rejects(api.searchYouTube('Music'));await api.searchYouTube('Music');await api.searchYouTube('Music');assert.equal(calls,3);
});
test('the result cache evicts its oldest entry after 24 distinct queries',async()=>{
 let calls=0;const api=apiFixture({extractSearch:async()=>{calls++;return [{id:'abcdefghijk'}];}});
 for(let i=0;i<25;i++)await api.searchYouTube('query'+i);
 await api.searchYouTube('query0');assert.equal(calls,26);
});
test('discovery cancellation stops fallbacks and late results cannot populate cache',async()=>{
 const pending=deferred();let calls=0;
 const api=apiFixture({extractBrowse:async()=>{calls++;return pending.promise;}});
 const controller=new AbortController();const result=api.fetchLiveFeed('US',{signal:controller.signal});await settle();controller.abort();
 await assert.rejects(result,e=>e.name==='AbortError');pending.resolve([{id:'abcdefghijk'}]);await settle();assert.equal(calls,1);
 await api.fetchLiveFeed();assert.equal(calls,2);
});
test('one discovery deadline covers the complete fallback sequence',async()=>{
 let calls=0;const api=apiFixture({extractBrowse:async()=>{calls++;if(calls===1)throw new Error('first attempt failed');await never();}});
 await assert.rejects(api.fetchLiveFeed('US',{timeoutMs:15}),e=>e.name==='RequestTimeoutError');assert.equal(calls,2);
});
test('a feed region reaches extraction and gets a distinct cache entry',async()=>{
 const regions=[];const api=apiFixture({extractBrowse:async(id,params,options)=>{regions.push(options.region);return [{id:'abcdefghijk'}];}});
 await api.fetchLiveFeed('ug');await api.fetchLiveFeed('US');assert.deepEqual(regions,['UG','US']);
});

