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

export interface StravaActivityDetailsRecord {
  id: string;
  activity?: Record<string, unknown>;
  streams?: Record<string, unknown>;
  streamsError?: string;
  fetchedAt?: string;
  analysedAt?: string;
  googleDrivePublishedAt?: string;
}

export interface StravaActivityDetailsResponse {
  activity: Record<string, unknown>;
  streams?: Record<string, unknown>;
  streamsError?: string;
}

export const STRAVA_ACTIVITIES_CACHE_KEY = 'gymfit_strava_activities_cache';
export const STRAVA_NEW_ACTIVITY_IDS_KEY = 'gymfit_strava_new_activity_ids';

export function isStravaAuthorizationError(error: unknown): boolean {
  return error instanceof Error &&
    /authorization|unauthorized|access token/i.test(error.message);
}

const STRAVA_ACTIVITY_DB_NAME = 'gymfit_strava_activity_data';
const STRAVA_ACTIVITY_DB_VERSION = 1;
const STRAVA_ACTIVITY_STORE_NAME = 'activities';

export function getCachedStravaActivitiesSnapshot(): StravaActivity[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STRAVA_ACTIVITIES_CACHE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as StravaActivity[] : null;
  } catch {
    return null;
  }
}

export function getCachedStravaActivities(): StravaActivity[] {
  return getCachedStravaActivitiesSnapshot() || [];
}

export function getCachedStravaNewActivityIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STRAVA_NEW_ACTIVITY_IDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function saveCachedStravaNewActivityIds(activityIds: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STRAVA_NEW_ACTIVITY_IDS_KEY, JSON.stringify(activityIds));
}

export function saveCachedStravaActivities(activities: StravaActivity[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STRAVA_ACTIVITIES_CACHE_KEY, JSON.stringify(activities));
}

function openStravaActivityDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Activity details storage is unavailable in this browser'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STRAVA_ACTIVITY_DB_NAME, STRAVA_ACTIVITY_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STRAVA_ACTIVITY_STORE_NAME)) {
        database.createObjectStore(STRAVA_ACTIVITY_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open activity details storage'));
  });
}

async function updateStravaActivityRecord(
  activityId: number | string,
  update: (record: StravaActivityDetailsRecord) => StravaActivityDetailsRecord
): Promise<StravaActivityDetailsRecord> {
  const id = String(activityId);
  const database = await openStravaActivityDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STRAVA_ACTIVITY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STRAVA_ACTIVITY_STORE_NAME);
    let updatedRecord: StravaActivityDetailsRecord | undefined;
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as StravaActivityDetailsRecord | undefined;
      updatedRecord = update(existing || { id });
      store.put(updatedRecord);
    };
    getRequest.onerror = () => transaction.abort();
    transaction.oncomplete = () => {
      database.close();
      if (updatedRecord) resolve(updatedRecord);
      else reject(new Error('Could not update activity details'));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Could not update activity details'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || getRequest.error || new Error('Could not update activity details'));
    };
  });
}

export async function getCachedStravaActivityRecord(
  activityId: number | string
): Promise<StravaActivityDetailsRecord | undefined> {
  const database = await openStravaActivityDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STRAVA_ACTIVITY_STORE_NAME, 'readonly');
    const request = transaction.objectStore(STRAVA_ACTIVITY_STORE_NAME).get(String(activityId));
    request.onsuccess = () => resolve(request.result as StravaActivityDetailsRecord | undefined);
    request.onerror = () => reject(request.error || new Error('Could not read activity details'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Could not read activity details'));
    };
  });
}

export function ensureStravaActivityRecord(activityId: number | string): Promise<StravaActivityDetailsRecord> {
  return updateStravaActivityRecord(activityId, (record) => record);
}

export function saveStravaActivityDetails(
  activityId: number | string,
  details: StravaActivityDetailsResponse
): Promise<StravaActivityDetailsRecord> {
  return updateStravaActivityRecord(activityId, (record) => ({
    ...record,
    activity: details.activity,
    ...(details.streams
      ? { streams: details.streams, streamsError: undefined }
      : details.streamsError
        ? { streamsError: details.streamsError }
        : {}),
    fetchedAt: new Date().toISOString(),
  }));
}

export function markStravaActivityAnalysed(
  activityId: number | string,
  analysedAt = new Date().toISOString()
): Promise<StravaActivityDetailsRecord> {
  return updateStravaActivityRecord(activityId, (record) => ({ ...record, analysedAt }));
}

export function markStravaActivityPublishedToGoogleDrive(
  activityId: number | string,
  publishedAt = new Date().toISOString()
): Promise<StravaActivityDetailsRecord> {
  return updateStravaActivityRecord(activityId, (record) => ({
    ...record,
    googleDrivePublishedAt: publishedAt,
  }));
}

async function readStravaResponse(response: Response, requestName: string): Promise<unknown> {
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorData = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    throw new Error(
      String(errorData.message || errorData.error || `${requestName} failed (${response.status})`)
    );
  }
  return data;
}

async function fetchStravaApiJson(
  accessToken: string,
  proxyPath: string,
  apiPath: string,
  requestName: string
): Promise<unknown> {
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  if (!isGitHubPages) {
    const proxyResponse = await fetch(proxyPath, { method: 'GET', headers }).catch(() => null);
    if (proxyResponse) return readStravaResponse(proxyResponse, requestName);
  }

  const response = await fetch(`https://www.strava.com/api/v3${apiPath}`, {
    method: 'GET',
    headers,
  });
  return readStravaResponse(response, requestName);
}

export async function fetchStravaActivityDetails(
  accessToken: string,
  activityId: number | string
): Promise<StravaActivityDetailsResponse> {
  const id = encodeURIComponent(String(activityId));
  const activity = await fetchStravaApiJson(
    accessToken,
    `/api/strava/activities/${id}`,
    `/activities/${id}`,
    'Strava activity details request'
  );
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
    throw new Error('Invalid activity details response from Strava');
  }

  try {
    const streams = await fetchStravaApiJson(
      accessToken,
      `/api/strava/activities/${id}/streams`,
      `/activities/${id}/streams?keys=time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,moving,grade_smooth&key_by_type=true`,
      'Strava activity streams request'
    );
    if (!streams || typeof streams !== 'object' || Array.isArray(streams)) {
      throw new Error('Invalid activity streams response from Strava');
    }
    return { activity: activity as Record<string, unknown>, streams: streams as Record<string, unknown> };
  } catch (error) {
    return {
      activity: activity as Record<string, unknown>,
      streamsError: error instanceof Error ? error.message : 'Could not fetch activity streams',
    };
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
