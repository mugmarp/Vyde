/**
 * InnerTube Direct HTTP Client
 * Handles requests with client context injection and multi-client fallback.
 */

import { Platform } from 'react-native';
import {
  INNERTUBE_BASE_URL,
  CLIENT_CONFIGS,
  InnerTubeClientConfig,
  buildHeaders,
  buildContext,
} from './constants';

export class InnerTubeClient {
  private apiServerUrl: string | null = null;

  constructor() {
    // Detect optional backend proxy URL
    const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DOMAIN;
    if (envUrl) {
      this.apiServerUrl = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // On web preview, if port 3000 is running locally
      this.apiServerUrl = 'http://localhost:3000';
    }
  }

  /**
   * Executes a direct POST request to an InnerTube endpoint.
   * If on web and CORS fails, attempts proxy via apiServerUrl if configured.
   */
  async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    clientConfig: InnerTubeClientConfig = CLIENT_CONFIGS.ANDROID,
  ): Promise<T> {
    const url = `${INNERTUBE_BASE_URL}/${endpoint.replace(/^\//, '')}`;
    const payload = {
      ...body,
      context: buildContext(clientConfig),
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

      // If response not ok on direct call
      const errorText = await response.text();
      console.warn(`[InnerTube] Direct ${endpoint} failed (${response.status}):`, errorText.slice(0, 150));
    } catch (directErr) {
      console.warn(`[InnerTube] Direct ${endpoint} threw:`, directErr);

      // On web browser, CORS may block direct request. Try server proxy if available.
      if (Platform.OS === 'web' && this.apiServerUrl) {
        try {
          const proxyUrl = `${this.apiServerUrl}/api/innertube/${endpoint.replace(/^\//, '')}`;
          const proxyRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body, clientName: clientConfig.clientName }),
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

    throw new Error(`InnerTube request to ${endpoint} failed.`);
  }

  /**
   * Executes a multi-client cascade for endpoints like /player
   */
  async postWithCascade<T>(
    endpoint: string,
    bodyBuilder: (config: InnerTubeClientConfig) => Record<string, unknown>,
    clientOrder: InnerTubeClientConfig[] = [
      CLIENT_CONFIGS.ANDROID,
      CLIENT_CONFIGS.IOS,
      CLIENT_CONFIGS.TV_EMBEDDED,
      CLIENT_CONFIGS.WEB,
    ],
  ): Promise<{ data: T; successfulClient: InnerTubeClientConfig }> {
    let lastError: unknown = null;

    for (const config of clientOrder) {
      try {
        const body = bodyBuilder(config);
        const data = await this.post<T>(endpoint, body, config);
        if (data) {
          return { data, successfulClient: config };
        }
      } catch (err) {
        lastError = err;
        // Proceed to next client in cascade
      }
    }

    throw lastError || new Error(`All client configurations failed for ${endpoint}.`);
  }
}

export const defaultInnerTube = new InnerTubeClient();
