/**
 * InnerTube Direct HTTP Client
 * Handles requests with client context injection, visitorData acquisition,
 * and multi-client cascade fallback.
 */

import { Platform } from 'react-native';
import {
  INNERTUBE_BASE_URL,
  CLIENT_CONFIGS,
  InnerTubeClientConfig,
  buildHeaders,
  buildContext,
} from './constants';

export class InnerTubeRequestError extends Error {
  constructor(public readonly endpoint: string, public readonly client: string, public readonly httpStatus: number) {
    super(`YouTube ${endpoint} request failed (HTTP ${httpStatus}, client ${client}).`);
    this.name = 'InnerTubeRequestError';
  }
}

export interface InnerTubeAttemptFailure {
  client: string;
  message: string;
  httpStatus?: number;
  playabilityStatus?: string;
}

export class InnerTubeCascadeError extends Error {
  constructor(public readonly endpoint: string, public readonly attempts: InnerTubeAttemptFailure[]) {
    super(attempts[attempts.length - 1]?.message ?? `All YouTube ${endpoint} requests failed.`);
    this.name = 'InnerTubeCascadeError';
  }
}

// ─── visitorData cache ────────────────────────────────────────────────────────

let cachedVisitorData: string | null = null;
let visitorDataFetchedAt = 0;
const VISITOR_DATA_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function acquireVisitorData(): Promise<string | null> {
  const now = Date.now();
  if (cachedVisitorData && now - visitorDataFetchedAt < VISITOR_DATA_TTL_MS) {
    return cachedVisitorData;
  }
  try {
    const url = `${INNERTUBE_BASE_URL}/guide`;
    const payload = { context: buildContext(CLIENT_CONFIGS.IOS) };
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(CLIENT_CONFIGS.IOS),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json() as any;
      const vd: string | undefined =
        data?.responseContext?.visitorData ||
        data?.header?.pageHeaderRenderer?.visitorData;
      if (vd) {
        cachedVisitorData = vd;
        visitorDataFetchedAt = now;
        return vd;
      }
    }
  } catch (err) {
    console.warn('[InnerTube] visitorData acquisition failed:', err);
  }
  return null;
}

// ─── InnerTubeClient ──────────────────────────────────────────────────────────

export class InnerTubeClient {
  private apiServerUrl: string | null = null;

  constructor() {
    const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DOMAIN;
    if (envUrl) {
      this.apiServerUrl = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.apiServerUrl = 'http://localhost:3000';
    }
  }

  /**
   * Executes a direct POST request to an InnerTube endpoint.
   * Injects visitorData into the client context automatically.
   * Falls back to CORS proxy on web if direct call fails.
   */
  async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    clientConfig: InnerTubeClientConfig = CLIENT_CONFIGS.IOS,
  ): Promise<T> {
    const url = `${INNERTUBE_BASE_URL}/${endpoint.replace(/^\//, '')}`;

    // Acquire visitorData (non-blocking — uses cached value after first fetch)
    const visitorData = await acquireVisitorData();

    const context = buildContext(clientConfig, visitorData ?? undefined);
    const payload = {
      ...body,
      context,
    };
    const headers = buildHeaders(clientConfig);

    // Try direct client-side fetch (works natively on Android & iOS without CORS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const errorText = await response.text();
      console.warn(
        `[InnerTube] Direct ${endpoint} failed (${response.status}):`,
        errorText.slice(0, 200),
      );
      throw new InnerTubeRequestError(endpoint, clientConfig.clientName, response.status);
    } catch (directErr) {
      console.warn(`[InnerTube] Direct ${endpoint} threw:`, directErr);

      // On web browser, CORS may block direct request → try server proxy
      if (Platform.OS === 'web' && this.apiServerUrl) {
        try {
          const proxyUrl = `${this.apiServerUrl}/api/innertube/${endpoint.replace(/^\//, '')}`;
          const proxyRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: payload, clientName: clientConfig.clientName }),
          });
          if (proxyRes.ok) {
            return (await proxyRes.json()) as T;
          }
        } catch (proxyErr) {
          console.warn(`[InnerTube] Proxy ${endpoint} failed:`, proxyErr);
        }
      }

      throw directErr;
    }

  }

  /**
   * Executes a multi-client cascade for endpoints like /player.
   * Returns the first successful response that satisfies the optional validator.
   */
  async postWithCascade<T>(
    endpoint: string,
    bodyBuilder: (config: InnerTubeClientConfig) => Record<string, unknown>,
    clientOrder: InnerTubeClientConfig[] = [
      CLIENT_CONFIGS.IOS,
      CLIENT_CONFIGS.ANDROID,
      CLIENT_CONFIGS.TV_EMBEDDED,
      CLIENT_CONFIGS.WEB,
    ],
    validator?: (data: T) => boolean | Promise<boolean>,
  ): Promise<{ data: T; successfulClient: InnerTubeClientConfig }> {
    const attempts: InnerTubeAttemptFailure[] = [];

    for (const config of clientOrder) {
      try {
        const body = bodyBuilder(config);
        const data = await this.post<T>(endpoint, body, config);
        if (data) {
          if (!validator || await validator(data)) {
            return { data, successfulClient: config };
          }
          console.warn(
            `[InnerTube] Cascade client ${config.clientName} returned unplayable data for ${endpoint}, falling back...`
          );
          const status = (data as any)?.playabilityStatus;
          const providerStatus = typeof status?.status === 'string' ? status.status : undefined;
          const reason = typeof status?.reason === 'string' ? status.reason : 'No usable stream formats were resolved.';
          attempts.push({ client: config.clientName, playabilityStatus: providerStatus,
            message: `Client ${config.clientName} returned unplayable data${providerStatus ? ` (${providerStatus})` : ''}: ${reason}` });
        } else {
          attempts.push({ client: config.clientName, message: `Client ${config.clientName} returned no data.` });
        }
      } catch (err) {
        attempts.push({ client: config.clientName,
          message: err instanceof Error ? err.message : `Client ${config.clientName} request failed.`,
          ...(err instanceof InnerTubeRequestError ? { httpStatus: err.httpStatus } : {}),
        });
      }
    }

    throw new InnerTubeCascadeError(endpoint, attempts);
  }
}

export const defaultInnerTube = new InnerTubeClient();
