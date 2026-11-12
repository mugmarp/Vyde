/**
 * InnerTube API Constants & Client Configurations
 * Used for direct client-side YouTube discovery and stream extraction.
 */

export const INNERTUBE_BASE_URL = 'https://www.youtube.com/youtubei/v1';

export interface InnerTubeClientConfig {
  clientName: string;
  clientVersion: string;
  userAgent: string;
  clientScreen?: string;
  androidSdkVersion?: number;
  deviceModel?: string;
  osName?: string;
  osVersion?: string;
}

export const CLIENT_CONFIGS: Record<string, InnerTubeClientConfig> = {
  IOS: {
    clientName: 'IOS',
    clientVersion: '20.01.1',
    deviceModel: 'iPhone16,2',
    osName: 'iOS',
    osVersion: '18.1',
    clientScreen: 'WATCH',
    userAgent: 'com.google.ios.youtube/20.01.1 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)',
  },
  ANDROID: {
    clientName: 'ANDROID',
    clientVersion: '20.03.36',
    androidSdkVersion: 34,
    osName: 'Android',
    osVersion: '14',
    clientScreen: 'WATCH',
    userAgent: 'com.google.android.youtube/20.03.36 (Linux; U; Android 14; US) gzip',
  },
  VISIONOS: {
    clientName: 'VISIONOS',
    clientVersion: '0.1',
    osName: 'visionOS',
    osVersion: '1.0',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  },
  ANDROID_VR: {
    clientName: 'ANDROID_VR',
    clientVersion: '1.60.19',
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12)',
  },
  TV_EMBEDDED: {
    clientName: 'TV_EMBEDDED',
    clientVersion: '2.0',
    userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.0 TV Safari/538.1',
  },
  WEB: {
    clientName: 'WEB',
    clientVersion: '2.20241025.01.00',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  },
};

/**
 * Common headers for InnerTube requests.
 */
export function buildHeaders(config: InnerTubeClientConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': config.userAgent,
    'X-YouTube-Client-Name': getClientCode(config.clientName),
    'X-YouTube-Client-Version': config.clientVersion,
    'Accept-Language': 'en-US,en;q=0.9',
  };
  return headers;
}

function getClientCode(name: string): string {
  switch (name) {
    case 'WEB': return '1';
    case 'ANDROID': return '3';
    case 'IOS': return '5';
    case 'VISIONOS': return '5';
    case 'ANDROID_VR': return '28';
    case 'TV_EMBEDDED': return '85';
    default: return '3';
  }
}

/**
 * Builds standard client context payload for InnerTube requests.
 * @param visitorData - optional session visitor token acquired from /guide
 */
export function buildContext(
  config: InnerTubeClientConfig,
  visitorData?: string,
  hl = 'en',
  gl = 'US',
) {
  const client: Record<string, unknown> = {
    hl,
    gl,
    clientName: config.clientName,
    clientVersion: config.clientVersion,
  };

  if (config.androidSdkVersion) {
    client.androidSdkVersion = config.androidSdkVersion;
  }
  if (config.osName) {
    client.osName = config.osName;
  }
  if (config.osVersion) {
    client.osVersion = config.osVersion;
  }
  if (config.deviceModel) {
    client.deviceModel = config.deviceModel;
  }
  if (config.clientScreen) {
    client.clientScreen = config.clientScreen;
  }
  if (visitorData) {
    client.visitorData = visitorData;
  }

  return {
    client,
    user: { lockedSafetyMode: false },
    request: { useSsl: true },
  };
}
