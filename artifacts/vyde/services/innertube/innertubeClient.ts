/**
 * InnerTube Direct HTTP Client
 * Handles requests with client context injection, visitorData acquisition,
 * and multi-client cascade fallback.
 */

import { Platform } from 'react-native';
import { RequestOptions, runBoundedRequest } from './request';
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

interface VisitorSession {
  value?: string;
  fetchedAt: number;
  attemptedAt: number;
  generation: number;
  pending: boolean;
}
const visitorSessions = new Map<string, VisitorSession>();
const VISITOR_DATA_TTL_MS = 6 * 60 * 60 * 1000;
const VISITOR_RETRY_MS = 30000;

function visitorSession(config: InnerTubeClientConfig, region: string): VisitorSession {
  const key = `${config.clientName}:${config.clientVersion}:${region}`;
  let session = visitorSessions.get(key);
  if (!session) {
    session = { fetchedAt: 0, attemptedAt: 0, generation: 0, pending: false };
    visitorSessions.set(key, session);
  }
  return session;
}

function learnVisitor(session: VisitorSession, response: any) {
  const value = response?.responseContext?.visitorData;
  if (typeof value === 'string' && value) {
    session.value = value;
    session.fetchedAt = Date.now();
    ++session.generation;
  }
}

// Optional warmup never blocks discovery. One bounded request per identity is
// shared; a failure gets a cooldown rather than delaying every category click.
function warmVisitorData(config: InnerTubeClientConfig, region: string, session: VisitorSession): void {
  const now = Date.now();
  if (session.pending || (session.value && now - session.fetchedAt < VISITOR_DATA_TTL_MS)
      || (session.attemptedAt && now - session.attemptedAt < VISITOR_RETRY_MS)) return;
  session.pending = true;
  session.attemptedAt = now;
  const generation = session.generation;
  void runBoundedRequest(async signal => {
    const response = await fetch(`${INNERTUBE_BASE_URL}/guide`, {
      method: 'POST', signal, headers: buildHeaders(config),
      body: JSON.stringify({ context: buildContext(config, undefined, 'en', region) }),
    });
    if (response.ok) {
      const data = await response.json();
      if (!signal.aborted && generation === session.generation) learnVisitor(session, data);
    }
  }, { timeoutMs: 4000 }).catch(() => {
    // Warmup is optional. The primary request reports its own failure/timing.
  }).finally(() => { session.pending = false; });
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
    options: RequestOptions = {},
  ): Promise<T> {
    const startedAt = Date.now();
    let outcome = 'error';
    let httpStatus: number | undefined;
    try {
      const result = await runBoundedRequest(async signal => {
        const region = options.region ?? 'US';
        const session = visitorSession(clientConfig, region);
        warmVisitorData(clientConfig, region, session);
        const visitorData = Date.now() - session.fetchedAt < VISITOR_DATA_TTL_MS ? session.value : undefined;
        const payload = { ...body, context: buildContext(clientConfig, visitorData, 'en', region) };
        try {
          const response = await fetch(`${INNERTUBE_BASE_URL}/${endpoint.replace(/^\//, '')}`, {
            method: 'POST', headers: buildHeaders(clientConfig), body: JSON.stringify(payload), signal,
          });
          httpStatus = response.status;
          if (!response.ok) throw new InnerTubeRequestError(endpoint, clientConfig.clientName, response.status);
          const data = await response.json();
          if (!signal.aborted) learnVisitor(session, data);
          return data as T;
        } catch (directError) {
          if (signal.aborted) throw directError;
          if (Platform.OS === 'web' && this.apiServerUrl) {
            try {
              const proxy = await fetch(`${this.apiServerUrl}/api/innertube/${endpoint.replace(/^\//, '')}`, {
                method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: payload, clientName: clientConfig.clientName }),
              });
              if (proxy.ok) return await proxy.json() as T;
            } catch { /* Keep the original direct failure. */ }
          }
          throw directError;
        }
      }, options);
      outcome = 'success';
      return result;
    } catch (error) {
      outcome = error instanceof Error ? error.name : 'error';
      throw error;
    } finally {
      // No query, video ID, visitor data, tokens or response bodies are logged.
      console.log('[InnerTube] request', { endpoint, client: clientConfig.clientName,
        elapsedMs: Date.now() - startedAt, httpStatus, outcome });
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
