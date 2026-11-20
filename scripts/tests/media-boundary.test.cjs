const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-typescript.cjs');

test('the public video API retains source metadata required by playback/download adapters', async () => {
  const sources = [{
    uri: 'https://example.com/audio', contentType: 'audio', qualityLabel: 'Original',
    formatId: '251', mimeType: 'audio/webm', container: 'webm', codecs: ['opus'],
    expiresAt: 1234567890000, headers: { 'X-Fixture': 'context' }, audioChannels: 2,
  }];
  const api = createLoader({
    'react-native': { Platform: { OS: 'android' } },
    '@/services/innertube': { extractPlayer: async () => ({ nativePlaybackCandidates: sources }) },
  })('api/youtube.ts');
  const details = await api.fetchYouTubeVideo('fixture1234');
  assert.equal(details.nativePlaybackCandidates, sources);
  assert.equal(details.nativePlaybackCandidates[0].headers['X-Fixture'], 'context');
});
