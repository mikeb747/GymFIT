import { CompletedWorkout } from '../types/workout';
import { generateFitFile, workoutToFitBase64, getFitFileName } from './fitGenerator';
import { getDefaultActivityName } from './activityName';

export interface StravaUploadResult {
  success: boolean;
  uploadId?: number | string;
  activityId?: number | string;
  status?: string;
  error?: string;
  isStaticHost?: boolean;
}

export function buildStravaWorkoutDescription(workout: CompletedWorkout): string {
  const lines: string[] = [];
  lines.push(`Logged with GymFIT • Total Volume: ${workout.totalVolumeKg.toLocaleString()} kg across ${workout.totalSets} sets.`);
  lines.push('');
  lines.push('Workout Exercises:');

  workout.exercises.forEach((ex) => {
    const validSets = ex.sets.filter(
      (s) => s.completed !== false && (s.mode === 'duration' ? (s.durationSec || 0) > 0 : (s.reps > 0 || s.weightKg > 0))
    );
    if (validSets.length > 0) {
      const setSummaries = validSets.map((s) => {
        if (s.mode === 'duration') {
          const wt = s.weightKg > 0 ? ` @ ${s.weightKg.toFixed(1)}kg` : '';
          return `${s.durationSec || 60}s${wt}`;
        }
        const wt = s.weightKg > 0 ? `${s.weightKg.toFixed(1)}kg × ` : 'BW × ';
        return `${wt}${s.reps} reps`;
      });
      lines.push(`• ${ex.name}: ${validSets.length} sets (${setSummaries.join(', ')})`);
    }
  });

  return lines.join('\n');
}

/**
 * Upload workout to Strava with intelligent fallback:
 * 1. Try local server proxy (/api/strava/upload) if running full-stack.
 * 2. If running on static host (e.g. GitHub Pages returning HTML/404), try direct Strava API v3 uploads endpoint.
 * 3. If CORS or authorization blocks, return clean status so user can 1-tap download & open Strava upload page.
 */
export async function uploadWorkoutToStrava(
  workout: CompletedWorkout,
  accessToken: string
): Promise<StravaUploadResult> {
  const title = workout.title?.trim() || getDefaultActivityName(workout.startTime);
  const description = buildStravaWorkoutDescription(workout);

  // Check if we are running in a static hosting environment (like GitHub Pages)
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

  // Step 1: If NOT strictly GitHub Pages, attempt local server proxy (/api/strava/upload)
  if (!isGitHubPages) {
    try {
      const fitBase64 = workoutToFitBase64(workout);
      const fitFileName = getFitFileName(workout);
      const res = await fetch('/api/strava/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fitBase64,
          name: title,
          fileName: fitFileName,
          description,
          sport_type: 'WeightTraining',
          activity_type: 'weight_training',
          accessToken,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          return {
            success: true,
            uploadId: data.uploadId,
            activityId: data.activityId,
            status: data.status,
          };
        }
        if (data.error) {
          return {
            success: false,
            error: data.error,
          };
        }
      }
      // If server returned HTML (e.g. 404 or auth challenge), fall through to direct upload
    } catch {
      // Continue to direct upload attempt
    }
  }

  // Step 2: Direct browser upload to Strava API v3
  try {
    const bytes = generateFitFile(workout);
    const fitBlob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const fitFileName = getFitFileName(workout);

    const formData = new FormData();
    formData.append('file', fitBlob, fitFileName);
    formData.append('name', title);
    formData.append('description', description);
    formData.append('data_type', 'fit');
    formData.append('sport_type', 'WeightTraining');
    formData.append('activity_type', 'weight_training');

    const stravaRes = await fetch('https://www.strava.com/api/v3/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const contentType = stravaRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await stravaRes.json();
      if (stravaRes.ok) {
        return {
          success: true,
          uploadId: data.id,
          activityId: data.activity_id,
          status: data.status,
        };
      }
      return {
        success: false,
        error: data.message || data.error || `Strava rejected upload (${stravaRes.status})`,
      };
    }

    const text = await stravaRes.text();
    return {
      success: false,
      error: `Strava upload failed (${stravaRes.status}): ${text.slice(0, 120)}`,
    };
  } catch (err: any) {
    const msg = err.message || '';
    const isNetworkOrCors = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS');

    return {
      success: false,
      isStaticHost: isGitHubPages || isNetworkOrCors,
      error: isNetworkOrCors
        ? 'Direct browser upload was blocked by Strava CORS policy on static GitHub Pages.'
        : msg || 'Network error communicating with Strava API',
    };
  }
}
