const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-typescript.cjs');

const cipherPath = 'services/innertube/cipher.ts';
const signatureJs = 'var ZZ={Rv:function(a){a.reverse()},Sp:function(a,b){a.splice(0,b)}};SS=function(a){a=a.split("");ZZ.Rv(a);ZZ.Sp(a,1);return a.join("")};';

test('R01: direct media does not depend on player-script availability', async () => {
  let requests = 0;
  const cipher = createLoader({}, async () => { requests++; throw new Error('offline'); })(cipherPath);
  const uri = 'https://example.com/video.mp4';
  assert.equal(await cipher.resolveFormatUrlWithDecipher({ url: uri }, 'fixture'), uri);
  const sources = await cipher.extractPlaybackCandidates({ formats: [{ url: uri }] });
  assert.equal(sources[0].uri, uri);
  assert.equal(requests, 0);
});

test('R02: no-argument reverse operation is applied before splice', async () => {
  const cipher = createLoader({}, async () => ({ ok: true, text: async () => signatureJs }))(cipherPath);
  const signatureCipher = new URLSearchParams({ url: 'https://example.com/v', s: 'abcdef', sp: 'sig' }).toString();
  const uri = await cipher.resolveFormatUrlWithDecipher({ signatureCipher }, 'fixture');
  assert.equal(new URL(uri).searchParams.get('sig'), 'edcba');
});

test('R03: client version is not a player ID; actual script asset is', () => {
  const cipher = createLoader()(cipherPath);
  assert.equal(cipher.extractPlayerId({ responseContext: { serviceTrackingParams: [{ params: [{ key: 'cver', value: '20.01.1' }] }] } }), null);
  assert.equal(cipher.extractPlayerId({ assets: { js: '/s/player/actual123/player_ias.vflset/en_US/base.js' } }), 'actual123');
});

test('HLS-only resolution does not fetch unrelated player JavaScript', async () => {
  const cipher = createLoader()(cipherPath);
  const sources = await cipher.extractPlaybackCandidates({ hlsManifestUrl: 'https://example.com/master.m3u8' });
  assert.equal(sources.length, 1);
  assert.equal(sources[0].contentType, 'hls');
});

test('resolution preserves format identity, codec/container and signed URL expiry', async () => {
  const cipher = createLoader()(cipherPath);
  const expire = Math.floor(Date.now() / 1000) + 60;
  const sources = await cipher.extractPlaybackCandidates({
    expiresInSeconds: '3600',
    adaptiveFormats: [{ itag: 251, url: `https://example.com/audio?expire=${expire}`, mimeType: 'audio/webm; codecs="opus"', contentLength: '12345' }],
  });
  assert.equal(sources[0].formatId, '251');
  assert.equal(sources[0].mimeType, 'audio/webm');
  assert.deepEqual(Array.from(sources[0].codecs), ['opus']);
  assert.equal(sources[0].container, 'webm');
  assert.equal(sources[0].expiresAt, expire * 1000);
  assert.equal(sources[0].contentLength, '12345');
});

test('unknown MIME/expiry stays unknown rather than becoming MP4 or an invalid timestamp', async () => {
  const cipher = createLoader()(cipherPath);
  const sources = await cipher.extractPlaybackCandidates({ formats: [{ url: 'https://example.com/media?expire=invalid', mimeType: 'application/octet-stream' }] });
  assert.equal(sources[0].container, undefined);
  assert.equal(sources[0].expiresAt, undefined);
});

test('a malformed HLS URL cannot discard a valid progressive source', async () => {
  const cipher = createLoader()(cipherPath);
  const sources = await cipher.extractPlaybackCandidates({ hlsManifestUrl: 'https://%', formats: [{ url: 'https://example.com/video.mp4' }] });
  assert.equal(sources.length, 1);
  assert.equal(sources[0].contentType, 'progressive');
});

function playerFixture(allInvalid = false) {
  const attempts = [];
  const fetch = async (url, options) => {
    let data = {};
    if (url.endsWith('/guide')) data = { responseContext: { visitorData: 'fixture' } };
    if (url.endsWith('/player')) {
      const client = JSON.parse(options.body).context.client.clientName;
      attempts.push(client);
      data = {
        playabilityStatus: { status: 'OK' }, videoDetails: { title: 'Fixture' },
        streamingData: client === 'IOS' || allInvalid
          ? { adaptiveFormats: [{ mimeType: 'video/mp4' }] }
          : { formats: [{ url: 'https://example.com/good.mp4' }] },
      };
    }
    return { ok: true, json: async () => data, text: async () => '' };
  };
  const player = createLoader({ 'react-native': { Platform: { OS: 'android' } } }, fetch)('services/innertube/playerExtractor.ts');
  return { player, attempts };
}

test('R06: unusable normalized formats continue to the next client', async () => {
  const { player, attempts } = playerFixture();
  const details = await player.extractPlayer('fixture1234');
  assert.deepEqual(attempts, ['IOS', 'ANDROID']);
  assert.equal(details.nativePlaybackCandidates[0].uri, 'https://example.com/good.mp4');
});

test('all unusable client responses fail rather than returning empty success', async () => {
  const { player, attempts } = playerFixture(true);
  await assert.rejects(player.extractPlayer('fixture1234'), /unplayable/);
  assert.equal(attempts.length, 6);
});

test('unresolved cipher signatures cannot become playable candidates', async () => {
  const cipher = createLoader({}, async () => ({ ok: false, status: 503 }))(cipherPath);
  const signatureCipher = new URLSearchParams({ url: 'https://example.com/media', s: 'encrypted', sp: 'sig' }).toString();
  assert.equal(cipher.resolveFormatUrl({ signatureCipher }), null);
  assert.equal((await cipher.extractPlaybackCandidates({ formats: [{ signatureCipher }] })).length, 0);
});

test('formats sharing a failed player script perform only one script fetch per resolution attempt', async () => {
  let requests = 0;
  const cipher = createLoader({}, async () => { requests++; return { ok: false, status: 503 }; })(cipherPath);
  const signatureCipher = new URLSearchParams({ url: 'https://example.com/media', s: 'encrypted', sp: 'sig' }).toString();
  await cipher.extractPlaybackCandidates({ formats: [{ signatureCipher }, { signatureCipher }] }, 'fixture');
  assert.equal(requests, 1);
});

test('missing n transform is not silently accepted as successful deciphering', async () => {
  const cipher = createLoader({}, async () => ({ ok: true, text: async () => signatureJs }))(cipherPath);
  assert.equal(await cipher.resolveFormatUrlWithDecipher({ url: 'https://example.com/media?n=fixture' }, 'fixture'), null);
});

test('a supported n transform still resolves a challenged URL', async () => {
  const js = signatureJs + 'x.get("n"))&&(b=NF(a));NF=function(a){a=a.split("");a.reverse();return a.join("")};';
  const cipher = createLoader({}, async () => ({ ok: true, text: async () => js }))(cipherPath);
  const uri = await cipher.resolveFormatUrlWithDecipher({ url: 'https://example.com/media?n=fixture' }, 'fixture');
  assert.equal(new URL(uri).searchParams.get('n'), 'erutxif');
});

test('n evaluator failure cannot return the unchanged challenge as success', async () => {
  const js = signatureJs + 'x.get("n"))&&(b=NF(a));NF=function(a){throw new Error("fixture")};';
  const cipher = createLoader({}, async () => ({ ok: true, text: async () => js }))(cipherPath);
  assert.equal(await cipher.resolveFormatUrlWithDecipher({ url: 'https://example.com/media?n=fixture' }, 'fixture'), null);
});

test('a failed script attempt is retryable during a later resolution', async () => {
  let requests = 0;
  const cipher = createLoader({}, async () => { requests++; return requests === 1 ? { ok: false, status: 503 } : { ok: true, text: async () => signatureJs }; })(cipherPath);
  const signatureCipher = new URLSearchParams({ url: 'https://example.com/media', s: 'abcdef', sp: 'sig' }).toString();
  assert.equal((await cipher.extractPlaybackCandidates({ formats: [{ signatureCipher }] }, 'fixture')).length, 0);
  const result = await cipher.extractPlaybackCandidates({ formats: [{ signatureCipher }] }, 'fixture');
  assert.equal(result.length, 1); assert.equal(new URL(result[0].uri).searchParams.get('sig'), 'edcba'); assert.equal(requests, 2);
});
