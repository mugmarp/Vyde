const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader}=require('./helpers/load-typescript.cjs');
test('client wire identities match the embedded TV and VisionOS profiles',()=>{
 const c=createLoader()('services/innertube/constants.ts');
 assert.equal(c.buildContext(c.CLIENT_CONFIGS.TV_EMBEDDED).client.clientName,'TVHTML5_SIMPLY_EMBEDDED_PLAYER');
 assert.equal(c.buildHeaders(c.CLIENT_CONFIGS.TV_EMBEDDED)['X-YouTube-Client-Name'],'85');
 assert.equal(c.buildHeaders(c.CLIENT_CONFIGS.VISIONOS)['X-YouTube-Client-Name'],'101');
});
