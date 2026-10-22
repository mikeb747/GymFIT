import React from 'react';
import {
  ExternalLink,
  RotateCw,
  Dumbbell,
  Flame,
  Activity,
  Bike,
  Footprints,
  Clock,
  MapPin,
  Heart,
  ThumbsUp,
  AlertCircle,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { StravaIcon } from './StravaIcon';
import type {
  StravaActivity,
  StravaActivityDetailsRecord,
} from '../utils/stravaActivities';

interface StravaActivitiesTabProps {
  stravaToken: string | null;
  athleteName: string | null;
  activities: StravaActivity[];
  newActivityIds: string[];
  activityDetails: Record<string, StravaActivityDetailsRecord>;
  activityDetailStatus: Record<string, { loading: boolean; error?: string }>;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRetryActivityDetails: (activityId: string) => void;
  onOpenStravaSettings: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  }
  return `${secs}s`;
}

function formatActivityDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function getActivityIcon(type?: string, sportType?: string) {
  const t = (sportType || type || '').toLowerCase();
  if (t.includes('weight') || t.includes('workout') || t.includes('crossfit')) {
    return <Dumbbell className="w-5 h-5 text-amber-400" />;
  }
  if (t.includes('run') || t.includes('trail')) {
    return <Flame className="w-5 h-5 text-orange-400" />;
  }
  if (t.includes('ride') || t.includes('bike') || t.includes('cycling')) {
    return <Bike className="w-5 h-5 text-sky-400" />;
  }
  if (t.includes('walk') || t.includes('hike')) {
    return <Footprints className="w-5 h-5 text-emerald-400" />;
  }
  return <Activity className="w-5 h-5 text-amber-400" />;
}

function formatSportName(type?: string, sportType?: string): string {
  const raw = sportType || type || 'Workout';
  // Insert spaces before capital letters (e.g. WeightTraining -> Weight Training)
  return raw.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export const StravaActivitiesTab: React.FC<StravaActivitiesTabProps> = ({
  stravaToken,
  athleteName,
  activities,
  newActivityIds,
  activityDetails,
  activityDetailStatus,
  loading,
  error,
  onRefresh,
  onRetryActivityDetails,
  onOpenStravaSettings,
}) => {
  if (!stravaToken) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center max-w-lg mx-auto shadow-xl my-4">
        <div className="w-16 h-16 rounded-3xl bg-[#FC5200]/15 border border-[#FC5200]/30 flex items-center justify-center mb-4 shadow-inner">
          <StravaIcon className="w-9 h-9" />
        </div>
        <h3 className="text-lg font-black text-white mb-2">Connect Your Strava Account</h3>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          Authorize GymFIT to view your synced weight training workouts, runs, rides, and recent Strava activities directly inside the app.
        </p>
        <button
          type="button"
          onClick={onOpenStravaSettings}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#FC5200] hover:bg-[#e04900] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#FC5200]/25 cursor-pointer active:scale-98"
        >
          <StravaIcon className="w-4 h-4" />
          <span>Authorize with Strava</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header & Connected Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FC5200]/20 border border-[#FC5200]/30 flex items-center justify-center shrink-0">
            <StravaIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {athleteName ? athleteName : 'Strava Account'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live athlete feed from Strava
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh activities"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <a
            href="https://www.strava.com/athlete/training/activities"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Strava.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="text-amber-400 hover:underline font-bold shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && activities.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-pulse flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-800 rounded w-1/5" />
              </div>
              <div className="h-3 bg-slate-800/60 rounded w-1/4" />
              <div className="flex gap-2">
                <div className="h-6 bg-slate-800 rounded-lg w-20" />
                <div className="h-6 bg-slate-800 rounded-lg w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activities List */}
      {!loading && activities.length === 0 && !error && (
        <div className="py-16 text-center text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col items-center">
          <Activity className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-300">No activities found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            No recent activities returned from your Strava account. Completed workouts uploaded from GymFIT will appear here.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Check Again
          </button>
        </div>
      )}

      {activities.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {activities.map((act) => {
            const duration = act.moving_time || act.elapsed_time || 0;
            const distanceKm = act.distance > 0 ? (act.distance / 1000).toFixed(2) : null;
            const elevation = act.total_elevation_gain && act.total_elevation_gain > 0 ? Math.round(act.total_elevation_gain) : null;
            const activityId = String(act.id);
            const isNew = newActivityIds.includes(activityId);
            const details = activityDetails[activityId];
            const detailsStatus = activityDetailStatus[activityId];
            const description = details?.activity?.description;
            const calories = details?.activity?.calories;
            const deviceName = details?.activity?.device_name;
            const availableStreams = details?.streams ? Object.keys(details.streams) : [];

            return (
              <div
                key={act.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-sm flex flex-col gap-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                      {getActivityIcon(act.type, act.sport_type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-extrabold text-white group-hover:text-amber-400 transition-colors truncate">
                        {act.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatActivityDate(act.start_date_local || act.start_date)}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`https://www.strava.com/activities/${act.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#FC5200] hover:bg-slate-800 transition-colors shrink-0"
                    title="View on Strava"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {isNew && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-black uppercase tracking-wide">
                      <Sparkles className="w-3 h-3" />
                      New
                    </span>
                    {!details?.googleDrivePublishedAt && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-black uppercase tracking-wide">
                        <UploadCloud className="w-3 h-3" />
                        Unpublished
                      </span>
                    )}
                  </div>
                )}

                {/* Metrics Badges */}
                <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-sans font-bold text-[11px]">
                    {formatSportName(act.type, act.sport_type)}
                  </span>

                  {duration > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDuration(duration)}</span>
                    </span>
                  )}

                  {distanceKm && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{distanceKm} km</span>
                    </span>
                  )}

                  {elevation !== null && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400">
                      ↑ {elevation} m
                    </span>
                  )}

                  {act.average_heartrate && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      <Heart className="w-3 h-3 text-rose-400" />
                      <span>{Math.round(act.average_heartrate)} bpm</span>
                    </span>
                  )}

                  {act.kudos_count && act.kudos_count > 0 ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 ml-auto font-sans font-bold text-[11px]">
                      <ThumbsUp className="w-3 h-3 text-amber-400" />
                      <span>{act.kudos_count}</span>
                    </span>
                  ) : null}

                  {act.pr_count && act.pr_count > 0 ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 font-sans font-bold text-[10px]">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span>{act.pr_count} PR</span>
                    </span>
                  ) : null}
                </div>

                {isNew && (
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-xs">
                    {detailsStatus?.loading ? (
                      <p className="text-slate-400">Loading detailed Strava data...</p>
                    ) : detailsStatus?.error ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-rose-300">{detailsStatus.error}</p>
                        <button
                          type="button"
                          onClick={() => onRetryActivityDetails(activityId)}
                          className="text-amber-400 hover:underline font-bold shrink-0 cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    ) : details ? (
                      <div className="space-y-2">
                        {typeof description === 'string' && description.trim() && (
                          <p className="text-slate-300 whitespace-pre-wrap">{description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                          {typeof calories === 'number' && (
                            <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300">
                              {Math.round(calories)} kcal
                            </span>
                          )}
                          {typeof deviceName === 'string' && deviceName && (
                            <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300">
                              {deviceName}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300">
                            Analysis: {details.analysedAt ? 'complete' : 'pending'}
                          </span>
                          <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300">
                            Google Drive: {details.googleDrivePublishedAt ? 'published' : 'not published'}
                          </span>
                        </div>
                        {availableStreams.length > 0 && (
                          <p className="text-slate-500">
                            Detailed streams saved: {availableStreams.join(', ')}
                          </p>
                        )}
                        {details.streamsError && (
                          <p className="text-amber-300">
                            Activity details saved, but streams were unavailable: {details.streamsError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400">Detailed activity data is not available yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
