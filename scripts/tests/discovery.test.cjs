const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader}=require('./helpers/load-typescript.cjs');
const video=(id='abcdefghijk')=>({videoRenderer:{videoId:id,title:{runs:[{text:'A '},{text:'video'}]},ownerText:{runs:[{text:'Channel',navigationEndpoint:{browseEndpoint:{browseId:'UCexample'}}}]}}});
const browse=response=>createLoader({'./innertubeClient':{defaultInnerTube:{post:async()=>response}}})('services/innertube/browseExtractor.ts');
const grid=contents=>({contents:{twoColumnBrowseResultsRenderer:{tabs:[{tabRenderer:{selected:true,content:{richGridRenderer:{contents}}}}]}}});
test('browse reads rich-grid cards and combines title runs',async()=>{
 const result=await browse(grid([{richItemRenderer:{content:video()}}])).extractBrowse();
 assert.equal(result.length,1);assert.equal(result[0].title,'A video');assert.equal(result[0].channelId,'UCexample');
});
test('browse reads video lockup view models without guessing missing metadata',async()=>{
 const response=grid([{richItemRenderer:{content:{lockupViewModel:{contentType:'LOCKUP_CONTENT_TYPE_VIDEO',contentId:'abcdefghijk',metadata:{lockupMetadataViewModel:{title:{content:'Modern video'}}}}}}}]);
 const result=await browse(response).extractBrowse();assert.equal(result.length,1);assert.equal(result[0].title,'Modern video');assert.equal(result[0].channel,'');
});
test('unknown browse schema is an error rather than an empty feed',async()=>{
 await assert.rejects(browse({contents:{newUnknownRenderer:{}}}).extractBrowse(),/format/);
});
test('unreadable cards cannot masquerade as a valid empty feed',async()=>{
 await assert.rejects(browse(grid([{richItemRenderer:{content:{unknownVideoRenderer:{videoId:'abcdefghijk'}}}}])).extractBrowse(),/format/);
});
test('a recognized empty rich-grid is a valid empty result',async()=>{
 assert.equal((await browse(grid([])).extractBrowse()).length,0);
});
test('only the selected browse tab contributes cards; duplicate video IDs are merged',async()=>{
 const response=grid([{richItemRenderer:{content:video()}},{richItemRenderer:{content:video()}}]);
 response.contents.twoColumnBrowseResultsRenderer.tabs.push({tabRenderer:{selected:false,content:{richGridRenderer:{contents:[{richItemRenderer:{content:video('other123456')}}]}}}});
 assert.equal((await browse(response).extractBrowse()).length,1);
});
test('the native home feed uses the home browse ID and preserves an earlier failure if fallback is empty',async()=>{
 const original=new Error('Home request failed');const calls=[];
 const api=createLoader({'react-native':{Platform:{OS:'android'}},'@/services/innertube':{extractBrowse:async(id)=>{calls.push(id);if(id==='FEwhat_to_watch')throw original;return [];}}})('api/youtube.ts');
 await assert.rejects(api.fetchLiveFeed(),e=>e===original);assert.deepEqual(calls,['FEwhat_to_watch','FEtrending']);
});

test('malformed required card text is rejected instead of reaching React as an object',async()=>{
 const entry=video();entry.videoRenderer.title={simpleText:{unexpected:true}};
 await assert.rejects(browse(grid([{richItemRenderer:{content:entry}}])).extractBrowse(),/format/);
});
