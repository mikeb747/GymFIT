export interface StravaActivity {
  id: number | string;
  name: string;
  distance: number; // in meters
  moving_time: number; // in seconds
  elapsed_time: number; // in seconds
  total_elevation_gain?: number;
  type: string;
  sport_type?: string;
  start_date: string;
  start_date_local: string;
  timezone?: string;
  kudos_count?: number;
  achievement_count?: number;
  pr_count?: number;
  average_speed?: number; // m/s
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
}

export const STRAVA_ACTIVITIES_CACHE_KEY = 'gymfit_strava_activities_cache';

export function getCachedStravaActivities(): StravaActivity[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STRAVA_ACTIVITIES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedStravaActivities(activities: StravaActivity[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STRAVA_ACTIVITIES_CACHE_KEY, JSON.stringify(activities));
  } catch {
    // Local storage full or unavailable
  }
}

export async function fetchStravaAthleteActivities(
  accessToken: string,
  page = 1,
  perPage = 30
): Promise<StravaActivity[]> {
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

  // Try local Express server proxy first if not on static GitHub Pages
  if (!isGitHubPages) {
    try {
      const res = await fetch(`/api/strava/activities?page=${page}&per_page=${perPage}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          saveCachedStravaActivities(data);
          return data;
        }
      }
    } catch {
      // Fall through to direct fetch
    }
  }

  // Direct fetch to Strava API v3
  const stravaRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  const data = await stravaRes.json();
  if (!stravaRes.ok) {
    throw new Error(data.message || data.error || `Strava activities request failed (${stravaRes.status})`);
  }

  if (!Array.isArray(data)) {
    throw new Error('Invalid activities response from Strava');
  }

  saveCachedStravaActivities(data);
  return data;
}
