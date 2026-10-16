/**
 * IronFIT Strava OAuth & Direct API Integration
 * Handles 1-click authorization, token exchange (with direct CORS fallback for static GitHub Pages),
 * and automatic synchronization so users never have to manually type credentials.
 */

export const STRAVA_CONFIG = {
  DEFAULT_CLIENT_ID: '287214',
  DEFAULT_CLIENT_SECRET: '28e75ea249c01a4a3d281db096321467291d2c9e',
  STORAGE_KEYS: {
    CLIENT_ID: 'ironfit_strava_client_id',
    CLIENT_SECRET: 'ironfit_strava_client_secret',
    TOKEN: 'ironfit_strava_token',
    REFRESH_TOKEN: 'ironfit_strava_refresh_token',
    ATHLETE: 'ironfit_strava_athlete',
    EXPIRES_AT: 'ironfit_strava_expires_at',
  },
};

export function getEffectiveClientId(): string {
  if (typeof window === 'undefined') return STRAVA_CONFIG.DEFAULT_CLIENT_ID;
  const stored = localStorage.getItem(STRAVA_CONFIG.STORAGE_KEYS.CLIENT_ID);
  return (stored && stored.trim()) || STRAVA_CONFIG.DEFAULT_CLIENT_ID;
}

export function getEffectiveClientSecret(): string {
  if (typeof window === 'undefined') return STRAVA_CONFIG.DEFAULT_CLIENT_SECRET;
  const stored = localStorage.getItem(STRAVA_CONFIG.STORAGE_KEYS.CLIENT_SECRET);
  return (stored && stored.trim()) || STRAVA_CONFIG.DEFAULT_CLIENT_SECRET;
}

/**
 * Determine the OAuth redirect URI for Strava
 */
export function getStravaRedirectUri(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000/auth/callback';
  const isGitHubPages = window.location.hostname.includes('github.io');
  if (isGitHubPages) {
    // GitHub Pages static deployment
    return 'https://mikeb747.github.io/IronFIT/';
  }
  // Local or Cloud Run preview environment
  return `${window.location.origin}/auth/callback`;
}

/**
 * Build the Strava Authorization URL
 */
export function buildStravaAuthUrl(customClientId?: string): string {
  const clientId = customClientId || getEffectiveClientId();
  const redirectUri = getStravaRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:write,activity:read',
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export interface StravaTokenResponse {
  token_type: string;
  access_token: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  athlete?: {
    id: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    profile?: string;
  };
}

/**
 * Exchange an OAuth authorization code for an Access Token
 * Works both via full-stack Express server and directly via Strava CORS endpoint on static GitHub Pages.
 */
export async function exchangeStravaCode(
  code: string,
  clientId?: string,
  clientSecret?: string
): Promise<StravaTokenResponse> {
  const effectiveId = clientId || getEffectiveClientId();
  const effectiveSecret = clientSecret || getEffectiveClientSecret();

  // Try direct Strava token endpoint (Strava officially supports CORS on /oauth/token)
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: effectiveId,
      client_secret: effectiveSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || `Strava authorization exchange failed (${response.status})`);
  }

  // Persist tokens
  if (typeof window !== 'undefined' && data.access_token) {
    localStorage.setItem(STRAVA_CONFIG.STORAGE_KEYS.TOKEN, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(STRAVA_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
    if (data.expires_at) {
      localStorage.setItem(STRAVA_CONFIG.STORAGE_KEYS.EXPIRES_AT, String(data.expires_at));
    }
    if (data.athlete?.firstname) {
      const athleteName = `${data.athlete.firstname} ${data.athlete.lastname || ''}`.trim();
      localStorage.setItem(STRAVA_CONFIG.STORAGE_KEYS.ATHLETE, athleteName);
    }
  }

  return data as StravaTokenResponse;
}

/**
 * Detects if the current window was loaded as a redirect from Strava OAuth (contains ?code=).
 * Exchanges the code and either notifies the popup opener or updates local storage and cleans the URL.
 */
export async function checkAndProcessOAuthRedirect(): Promise<{
  handled: boolean;
  success: boolean;
  token?: string;
  athlete?: any;
  error?: string;
}> {
  if (typeof window === 'undefined') return { handled: false, success: false };

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error }, '*');
        setTimeout(() => window.close(), 1500);
      } catch {}
    }
    return { handled: true, success: false, error };
  }

  if (!code) {
    return { handled: false, success: false };
  }

  try {
    const tokenData = await exchangeStravaCode(code);

    // If loaded inside a popup window
    if (window.opener) {
      try {
        window.opener.postMessage(
          {
            type: 'OAUTH_AUTH_SUCCESS',
            payload: tokenData,
          },
          '*'
        );
        setTimeout(() => window.close(), 500);
      } catch {}
    } else {
      // In same tab / PWA mode: clean URL query parameters without reloading
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    return {
      handled: true,
      success: true,
      token: tokenData.access_token,
      athlete: tokenData.athlete,
    };
  } catch (err: any) {
    if (window.opener) {
      try {
        window.opener.postMessage(
          {
            type: 'OAUTH_AUTH_ERROR',
            error: err.message || 'Token exchange failed',
          },
          '*'
        );
        setTimeout(() => window.close(), 2000);
      } catch {}
    }
    return {
      handled: true,
      success: false,
      error: err.message || 'Token exchange failed',
    };
  }
}
