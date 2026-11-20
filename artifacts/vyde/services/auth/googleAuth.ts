/**
 * Optional Google OAuth 2.0 PKCE Account Bridge
 *
 * Implements an optional authentication flow allowing users to connect their
 * Google account to sync their YouTube playlists and liked videos.
 *
 * Privacy & Offline-First Guarantees:
 *   - Completely OPT-IN: Vyde works 100% anonymously without any login.
 *   - No telemetry, tracking, or mandatory credentials.
 *   - Only requests read-only scopes (youtube.readonly) when activated.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants & Configuration ────────────────────────────────────────────────

const GOOGLE_AUTH_STORAGE_KEY = 'vyde_google_auth_token_v1';
const GOOGLE_USER_INFO_KEY = 'vyde_google_user_info_v1';

export interface GoogleAuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  connectedAt: number;
}

export interface GoogleAuthState {
  isConnected: boolean;
  user: GoogleAuthUser | null;
  accessToken: string | null;
}

// ─── Token & Profile Persistence ──────────────────────────────────────────────

/**
 * Retrieves the currently saved Google account profile, if connected.
 */
export async function getSavedGoogleUser(): Promise<GoogleAuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(GOOGLE_USER_INFO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GoogleAuthUser;
  } catch {
    return null;
  }
}

/**
 * Retrieves the cached access token, if valid.
 */
export async function getSavedAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(GOOGLE_AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves Google account connection details.
 */
export async function saveGoogleAuth(token: string, user: GoogleAuthUser): Promise<void> {
  try {
    await AsyncStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, token);
    await AsyncStorage.setItem(GOOGLE_USER_INFO_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('[GoogleAuth] Could not persist auth session:', err);
  }
}

/**
 * Disconnects the Google account and clears credentials locally.
 */
export async function disconnectGoogleAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(GOOGLE_USER_INFO_KEY);
  } catch (err) {
    console.warn('[GoogleAuth] Disconnect cleanup error:', err);
  }
}

/**
 * Fetches user profile from Google UserInfo endpoint using the access token.
 */
export async function fetchGoogleProfile(accessToken: string): Promise<GoogleAuthUser | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id || '',
      name: data.name || 'Google User',
      email: data.email || '',
      avatar: data.picture,
      connectedAt: Date.now(),
    };
  } catch (err) {
    console.warn('[GoogleAuth] fetchGoogleProfile error:', err);
    return null;
  }
}
