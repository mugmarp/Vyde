const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader}=require('./helpers/load-typescript.cjs');
const continuation=token=>({continuationItemRenderer:{continuationEndpoint:{continuationCommand:{token}}}});
const legacy=(id='comment1')=>({commentThreadRenderer:{comment:{commentRenderer:{commentId:id,contentText:{runs:[{text:'Hello '},{text:'world'}]},authorText:{simpleText:'Author'},voteCount:{simpleText:'1.2K'},publishedTimeText:{runs:[{text:'Yesterday'}]},authorEndpoint:{browseEndpoint:{browseId:'UCexample'}}}}}});
const initial=contents=>({contents:{twoColumnWatchNextResults:{results:{results:{contents:[{itemSectionRenderer:{targetId:'comments-section',contents}}]}}}}});
const page=items=>({onResponseReceivedEndpoints:[{reloadContinuationItemsCommand:{targetId:'comments-section',continuationItems:items}}]});
function fixture(responses) {
 const calls=[];
 const service=createLoader({'./innertubeClient':{defaultInnerTube:{post:async(endpoint,body,client)=>{
  calls.push({endpoint,body,client});const next=responses.shift();if(next instanceof Error)throw next;return next;
 }}}})('services/innertube/commentsExtractor.ts');
 return {calls,...service};
}
test('initial comment continuation is followed with the WEB context',async()=>{
 const f=fixture([initial([continuation('initial-token')]),page([legacy(),continuation('page-two')])]);
 const result=await f.extractComments('abcdefghijk');
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[0].client.clientName,'WEB');
 assert.equal(f.calls[1].body.continuation,'initial-token');
 assert.equal(result.items[0].text,'Hello world');
 assert.equal(result.items[0].likes,1200);
 assert.equal(result.items[0].authorUrl,'https://www.youtube.com/channel/UCexample');
 assert.equal(result.nextPage,'page-two');
});
test('next page sends only its continuation and does not repeat initial discovery',async()=>{
 const f=fixture([page([legacy()])]);await f.extractComments('abcdefghijk','page-two');
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.continuation,'page-two');assert.equal(f.calls[0].body.videoId,undefined);
});
test('legacy inline comments and header count remain supported',async()=>{
 const f=fixture([initial([{commentsHeaderRenderer:{countText:{runs:[{text:'2,345 Comments'}]}}},legacy()])]);
 const result=await f.extractComments('abcdefghijk');assert.equal(result.commentCount,2345);assert.equal(result.items.length,1);
});
test('entity-backed comments resolve their payload by entity key',async()=>{
 const response=page([{commentThreadRenderer:{commentViewModel:{commentViewModel:{commentKey:'entity-1'}}}}]);
 response.frameworkUpdates={entityBatchUpdate:{mutations:[{entityKey:'entity-1',payload:{commentEntityPayload:{properties:{commentId:'modern1',content:{content:'Modern comment'},publishedTime:'1 hour ago'},author:{displayName:'Modern author',channelId:'UCmodern',avatarThumbnailUrl:'https://example.com/avatar'},toolbar:{likeCountNotliked:'42'}}}}]}};
 const result=await fixture([response]).extractComments('abcdefghijk','token');
 assert.equal(result.items[0].id,'modern1');assert.equal(result.items[0].text,'Modern comment');assert.equal(result.items[0].author,'Modern author');assert.equal(result.items[0].likes,42);
});
test('request failures propagate instead of becoming empty comments',async()=>{
 const error=new Error('HTTP 403 fixture');const f=fixture([error]);await assert.rejects(f.extractComments('abcdefghijk'),e=>e===error);
});
test('unknown response schema fails instead of pretending comments are disabled',async()=>{
 await assert.rejects(fixture([{unexpected:{}}]).extractComments('abcdefghijk'),/could not be read/);
});
test('missing modern entity data is a parsing error',async()=>{
 await assert.rejects(fixture([page([{commentViewModel:{commentKey:'missing'}}])]).extractComments('abcdefghijk','token'),/incomplete/);
});
test('explicit disabled message has its own state and no continuation request',async()=>{
 const f=fixture([initial([{messageRenderer:{text:{simpleText:'Comments are turned off. Learn more'}}}])]);
 const result=await f.extractComments('abcdefghijk');assert.equal(result.disabled,true);assert.equal(result.items.length,0);assert.equal(f.calls.length,1);
});
test('a recognized empty comments page remains an empty success',async()=>{
 const result=await fixture([page([{commentsHeaderRenderer:{countText:{simpleText:'0 Comments'}}}])]).extractComments('abcdefghijk','token');
 assert.equal(result.disabled,false);assert.equal(result.commentCount,0);assert.equal(result.items.length,0);
});
test('unrelated continuation tokens are not mistaken for comments',async()=>{
 await assert.rejects(fixture([{contents:{relatedVideos:[continuation('unrelated')]}}]).extractComments('abcdefghijk'),/could not be read/);
});
