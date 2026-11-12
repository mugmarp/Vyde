/**
 * Phase 1 Benchmark Validation Script
 *
 * Tests the Phase 1 InnerTube stream extraction pipeline against a fixed suite
 * of 15 real YouTube videos across 5 categories:
 *   1. Trending / Popular
 *   2. Music / Vevo
 *   3. Long-form (1h+)
 *   4. HD / 1080p
 *   5. Shorts / Short-form
 *
 * Measures:
 *   - Playability status (OK vs UNPLAYABLE)
 *   - Native stream candidates resolved (HLS, Progressive MP4, Adaptive Video, Audio)
 *   - In-app playback feasibility
 *
 * Target: >= 70% in-app playback pass rate.
 */

const BENCHMARK_VIDEOS = [
  // 1. Trending / Popular
  { id: 'dQw4w9WgXcQ', category: 'Popular', expected: 'High-volume classic' },
  { id: '9bZkp7q19f0', category: 'Popular', expected: 'Gangnam Style - billion views' },
  { id: 'kJQP7kiw5Fk', category: 'Popular', expected: 'Despacito' },

  // 2. Music / Vevo (Cipher-heavy)
  { id: 'fJ9rUzIMcZQ', category: 'Music / Vevo', expected: 'Bohemian Rhapsody' },
  { id: 'JGwWNGJdvx8', category: 'Music / Vevo', expected: 'Shape of You' },
  { id: 'k2qgadSvNyU', category: 'Music / Vevo', expected: 'New Rules' },

  // 3. Long-Form (1h+)
  { id: 'jfKfPfyJRdk', category: 'Long-Form', expected: 'Lofi Girl Live/Long stream' },
  { id: 'lTRiuFIWV54', category: 'Long-Form', expected: 'Relaxing Jazz 3+ hours' },
  { id: 'SjxJkff0Y0E', category: 'Long-Form', expected: 'Nature documentary' },

  // 4. Standard / 1080p HD
  { id: 'M7lc1UVf-VE', category: 'HD / 1080p', expected: 'YouTube Dev test' },
  { id: 'aqz-KE-bpKQ', category: 'HD / 1080p', expected: 'Big Buck Bunny 4K' },
  { id: 'YE7VzlLtp-4', category: 'HD / 1080p', expected: 'Big Buck Bunny 60fps' },

  // 5. Shorts / Short-form
  { id: '8jPQjjsBbIc', category: 'Shorts', expected: 'Vertical Short 1' },
  { id: 'qX_q_u_gqss', category: 'Shorts', expected: 'Vertical Short 2' },
  { id: '60ItHLz5WEA', category: 'Shorts', expected: 'Vertical Short 3' },
];

const CLIENT_CONFIGS = {
  IOS: {
    clientName: 'IOS',
    clientVersion: '20.01.1',
    deviceModel: 'iPhone16,2',
    osName: 'iOS',
    osVersion: '18.1',
    userAgent: 'com.google.ios.youtube/20.01.1 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)',
    code: '5',
  },
  ANDROID: {
    clientName: 'ANDROID',
    clientVersion: '20.03.36',
    androidSdkVersion: 34,
    osName: 'Android',
    osVersion: '14',
    userAgent: 'com.google.android.youtube/20.03.36 (Linux; U; Android 14; US) gzip',
    code: '3',
  },
  VISIONOS: {
    clientName: 'VISIONOS',
    clientVersion: '0.1',
    osName: 'visionOS',
    osVersion: '1.0',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    code: '5',
  },
  ANDROID_VR: {
    clientName: 'ANDROID_VR',
    clientVersion: '1.60.19',
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12)',
    code: '28',
  },
};

function buildContext(config, visitorData) {
  const client = {
    hl: 'en',
    gl: 'US',
    clientName: config.clientName,
    clientVersion: config.clientVersion,
  };
  if (config.deviceModel) client.deviceModel = config.deviceModel;
  if (config.androidSdkVersion) client.androidSdkVersion = config.androidSdkVersion;
  if (config.osName) client.osName = config.osName;
  if (config.osVersion) client.osVersion = config.osVersion;
  if (visitorData) client.visitorData = visitorData;

  return {
    client,
    user: { lockedSafetyMode: false },
    request: { useSsl: true },
  };
}

async function extractVideoWithCascade(videoId, visitorData) {
  const cascadeOrder = [
    CLIENT_CONFIGS.IOS,
    CLIENT_CONFIGS.ANDROID,
    CLIENT_CONFIGS.VISIONOS,
    CLIENT_CONFIGS.ANDROID_VR,
  ];

  for (const client of cascadeOrder) {
    try {
      const payload = {
        videoId,
        playbackContext: {
          contentPlaybackContext: {
            html5Preference: 'HTML5_PREF_WANTS',
          },
        },
        context: buildContext(client, visitorData),
      };

      const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
          'X-YouTube-Client-Name': client.code,
          'X-YouTube-Client-Version': client.clientVersion,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const status = data.playabilityStatus?.status;
      if (status !== 'OK') continue;

      const streamingData = data.streamingData || {};
      const candidates = [];

      // 1. HLS Manifest
      if (streamingData.hlsManifestUrl && streamingData.hlsManifestUrl.startsWith('https://')) {
        candidates.push({
          type: 'hls',
          label: 'HLS Adaptive (.m3u8)',
          uri: streamingData.hlsManifestUrl,
        });
      }

      // 2. Progressive formats
      const formats = streamingData.formats || [];
      for (const fmt of formats) {
        if (fmt.url && fmt.url.startsWith('https://')) {
          candidates.push({
            type: 'progressive',
            label: fmt.qualityLabel || `${fmt.height || 360}p MP4`,
            uri: fmt.url,
          });
        }
      }

      // 3. Adaptive formats (both video and audio)
      const adaptive = streamingData.adaptiveFormats || [];
      for (const fmt of adaptive) {
        if (fmt.url && fmt.url.startsWith('https://')) {
          const mime = (fmt.mimeType || '').toLowerCase();
          if (mime.startsWith('video/')) {
            candidates.push({
              type: 'adaptive-video',
              label: fmt.qualityLabel || `${fmt.height}p Video`,
              uri: fmt.url,
            });
          } else if (mime.startsWith('audio/')) {
            candidates.push({
              type: 'audio',
              label: fmt.audioQuality || 'Audio',
              uri: fmt.url,
            });
          }
        }
      }

      if (candidates.length === 0) continue;

      const title = data.videoDetails?.title || 'Unknown Title';
      const duration = parseInt(data.videoDetails?.lengthSeconds || '0', 10);

      return {
        success: true,
        status,
        client: client.clientName,
        title,
        duration,
        candidates,
      };
    } catch {
      // try next in cascade
    }
  }

  return {
    success: false,
    status: 'FAILED',
    client: 'NONE',
    title: '',
    duration: 0,
    candidates: [],
  };
}

async function runBenchmark() {
  console.log('='.repeat(80));
  console.log('VYDE PHASE 1 PLAYBACK EXTRACTION BENCHMARK (InnerTube 2026 Engine)');
  console.log('='.repeat(80));

  const results = [];
  let passedCount = 0;

  for (let i = 0; i < BENCHMARK_VIDEOS.length; i++) {
    const item = BENCHMARK_VIDEOS[i];
    process.stdout.write(`[${i + 1}/15] Testing ${item.id} (${item.category}: ${item.expected})... `);

    const startTime = Date.now();
    const result = await extractVideoWithCascade(item.id, null);
    const elapsed = Date.now() - startTime;

    const hasHls = result.candidates.some(c => c.type === 'hls');
    const hasProgressive = result.candidates.some(c => c.type === 'progressive');
    const hasAdaptive = result.candidates.some(c => c.type === 'adaptive-video');
    const playable = result.success && (hasHls || hasProgressive || hasAdaptive);

    if (playable) passedCount++;

    const summary = {
      id: item.id,
      category: item.category,
      title: result.title.slice(0, 32),
      status: result.status,
      client: result.client,
      candidatesCount: result.candidates.length,
      hasHls,
      hasProgressive,
      hasAdaptive,
      playable,
      elapsedMs: elapsed,
    };
    results.push(summary);

    if (playable) {
      console.log(`PASS (${result.client}, ${result.candidates.length} streams, HLS: ${hasHls}, Prog: ${hasProgressive}, ${elapsed}ms)`);
    } else {
      console.log(`FAIL (Status: ${result.status}, Client: ${result.client})`);
    }
  }

  const passRate = (passedCount / BENCHMARK_VIDEOS.length) * 100;
  console.log('\n' + '='.repeat(80));
  console.log(`BENCHMARK RESULTS: ${passedCount}/${BENCHMARK_VIDEOS.length} passed (${passRate.toFixed(1)}%)`);
  console.log(`Target DoD: >= 70.0%`);
  console.log(`Status: ${passRate >= 70 ? 'CRITERIA MET (SUCCESS)' : 'CRITERIA NOT MET'}`);
  console.log('='.repeat(80));

  return { passRate, results };
}

runBenchmark().catch(err => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
