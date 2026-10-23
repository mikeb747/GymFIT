import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Dumbbell,
  Bike,
  Footprints,
  Waves,
  Activity,
  Heart,
  Zap,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  UploadCloud,
  Award,
} from 'lucide-react';
import type {
  StravaActivity,
  StravaActivityDetailsRecord,
} from '../utils/stravaActivities';
import {
  classifyActivity,
  formatSportMetrics,
  isActivityNew,
  isActivityUnpublished,
  fetchStravaActivityDetails,
  saveStravaActivityDetails,
  getCachedStravaActivityRecord,
  markStravaActivityPublishedToGoogleSheets,
  calculateActivityTSS,
  getSwimPaceDetails,
} from '../utils/stravaActivities';
import { appendActivityToTrainingLog } from '../utils/googleSheets';

interface StravaActivityModalProps {
  isOpen: boolean;
  activity: StravaActivity | null;
  stravaToken: string | null;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onClose: () => void;
  onActivityPublished?: (activityId: string) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  if (minutes > 0) return `${minutes}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  return `${secs}s`;
}

function formatActivityDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
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

function getCategoryIcon(category: string, className = 'w-5 h-5') {
  switch (category) {
    case 'Swim':
      return <Waves className={`${className} text-sky-400`} />;
    case 'Bike':
      return <Bike className={`${className} text-orange-400`} />;
    case 'Run':
      return <Footprints className={`${className} text-amber-400`} />;
    case 'Gym':
    case 'Strength':
      return <Dumbbell className={`${className} text-emerald-400`} />;
    default:
      return <Activity className={`${className} text-purple-400`} />;
  }
}

export const StravaActivityModal: React.FC<StravaActivityModalProps> = ({
  isOpen,
  activity,
  stravaToken,
  isGoogleConnected,
  onConnectGoogle,
  onClose,
  onActivityPublished,
}) => {
  const [detailsRecord, setDetailsRecord] = useState<StravaActivityDetailsRecord | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [isExportingToSheets, setIsExportingToSheets] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{ url: string; alreadyExists: boolean } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !activity) {
      setDetailsRecord(null);
      setExportSuccess(null);
      setExportError(null);
      return;
    }

    const activityId = String(activity.id);

    // 1. Check if details already cached in IndexedDB
    let isCancelled = false;
    async function loadData() {
      try {
        const cached = await getCachedStravaActivityRecord(activityId);
        if (cached && (cached.activity || cached.streams)) {
          if (!isCancelled) setDetailsRecord(cached);
          return;
        }

        // 2. If not cached and we have strava token, fetch on-demand
        if (stravaToken) {
          if (!isCancelled) setLoadingDetails(true);
          const fresh = await fetchStravaActivityDetails(stravaToken, activityId);
          const saved = await saveStravaActivityDetails(activityId, fresh);
          if (!isCancelled) setDetailsRecord(saved);
        }
      } catch (err: any) {
        if (!isCancelled) setDetailsError(err.message || 'Could not fetch detailed streams');
      } finally {
        if (!isCancelled) setLoadingDetails(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, activity, stravaToken]);

  if (!isOpen || !activity) return null;

  const classification = classifyActivity(activity);
  const metrics = formatSportMetrics(activity);
  const isNew = isActivityNew(activity);
  const isUnpublished = isActivityUnpublished(detailsRecord || undefined);

  const durationMoving = activity.moving_time || 0;
  const durationElapsed = activity.elapsed_time || 0;
  const calories = (detailsRecord?.activity?.calories as number) || activity.calories;
  const description = (detailsRecord?.activity?.description as string) || '';

  const streams = detailsRecord?.streams as Record<string, { data?: any[] }> | undefined;
  const availableStreamsList = streams ? Object.keys(streams).filter((k) => streams[k]?.data?.length) : [];

  // Calculate TSS
  const tssResult = calculateActivityTSS(activity, detailsRecord || undefined);

  // Swim Pace Details & Laps
  const swimPace = getSwimPaceDetails(activity, detailsRecord || undefined);

  // Strict power metric rule: ONLY for Turbo Trainer or Bike!
  const isBikeOrTurbo = classification.subType === 'Turbo Trainer' || classification.subType === 'Bike';

  const handleExportToSheets = async () => {
    if (!isGoogleConnected) {
      onConnectGoogle();
      return;
    }

    setIsExportingToSheets(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const result = await appendActivityToTrainingLog(activity, detailsRecord || undefined);
      // Mark as published in IndexedDB
      const updated = await markStravaActivityPublishedToGoogleSheets(activity.id);
      setDetailsRecord(updated);
      setExportSuccess({ url: result.spreadsheetUrl, alreadyExists: result.alreadyExists });

      if (onActivityPublished) {
        onActivityPublished(String(activity.id));
      }
    } catch (err: any) {
      console.error('[Google Sheets Export Error]', err);
      setExportError(err.message || 'Failed to export to Google Sheets');
    } finally {
      setIsExportingToSheets(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-950/60 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              {getCategoryIcon(classification.category, 'w-6 h-6')}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white leading-tight truncate">
                {activity.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {formatActivityDate(activity.start_date_local || activity.start_date)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Badges strip */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5">
              {getCategoryIcon(classification.category, 'w-3.5 h-3.5')}
              <span>{classification.subType}</span>
            </span>

            {/* "New" badge stays for 24 hours even if published */}
            {isNew && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-black uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                New (last 24h)
              </span>
            )}

            {/* "Unpublished" badge until sent to Google Sheets */}
            {isUnpublished ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-black uppercase tracking-wide">
                <UploadCloud className="w-3.5 h-3.5" />
                Unpublished
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Saved to Google Sheets
              </span>
            )}

            <a
              href={`https://www.strava.com/activities/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs text-[#FC5200] hover:underline font-bold"
            >
              <span>Strava.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400">Duration</span>
              <span className="text-sm sm:text-base font-bold font-mono text-white mt-1">
                {formatDuration(durationMoving)}
              </span>
              {durationElapsed > durationMoving && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatDuration(durationElapsed)} total
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400">
                {classification.category === 'Swim' ? 'Distance' : 'Distance / Effort'}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-white mt-1">
                {metrics.primaryMetricLabel}
              </span>
              {metrics.secondaryMetricLabel && (
                <span className="text-[10px] text-amber-400 font-mono">
                  {metrics.secondaryMetricLabel}
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400">
                {classification.category === 'Swim' ? 'Avg Pace / 100m' : 'Elevation'}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-white mt-1">
                {classification.category === 'Swim'
                  ? (swimPace?.pacePer100mFormatted || '0:00/100m')
                  : (activity.total_elevation_gain ? `↑ ${Math.round(activity.total_elevation_gain)}m` : 'Flat / Indoor')}
              </span>
              {classification.category !== 'Swim' && activity.max_speed ? (
                <span className="text-[10px] text-slate-500 font-mono">
                  max {(activity.max_speed * 3.6).toFixed(1)} kph
                </span>
              ) : null}
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400">Energy / HR</span>
              <span className="text-sm sm:text-base font-bold font-mono text-white mt-1">
                {calories ? `${Math.round(calories)} kcal` : activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '--'}
              </span>
              {activity.suffer_score ? (
                <span className="text-[10px] text-rose-400 font-mono">
                  suffer score: {activity.suffer_score}
                </span>
              ) : null}
            </div>
          </div>

          {/* TSS (Training Stress Score) Metric Banner if available */}
          {tssResult && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Training Stress Score
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-200">
                      {tssResult.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {tssResult.description}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black font-mono text-amber-400">
                  {tssResult.tss}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans font-bold">TSS</span>
              </div>
            </div>
          )}

          {/* Swim Moving Laps Breakdown if Swim activity and laps are present */}
          {classification.category === 'Swim' && swimPace?.laps && swimPace.laps.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-sky-400" />
                  <span>Moving Laps ({swimPace.laps.length} Laps)</span>
                </h4>
                <span className="text-xs font-mono font-bold text-sky-400">
                  Avg {swimPace.pacePer100mFormatted}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pt-1">
                {swimPace.laps.map((lap) => (
                  <div
                    key={lap.lapIndex}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>Lap {lap.lapIndex}</span>
                      <span>{lap.distanceM}m</span>
                    </div>
                    <div className="flex items-center justify-between font-mono font-bold text-white mt-1">
                      <span>{formatDuration(lap.movingTimeSec)}</span>
                      <span className="text-sky-300">{lap.pacePer100mFormatted}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemetry Streams & Details */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Sensor Telemetry & Streams</span>
              </h4>
              {loadingDetails && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching streams...
                </span>
              )}
            </div>

            {detailsError ? (
              <p className="text-xs text-rose-300">{detailsError}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {activity.average_heartrate && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Heart Rate</div>
                      <div className="font-mono font-bold text-rose-300">
                        {Math.round(activity.average_heartrate)} bpm
                        {activity.max_heartrate ? ` (max ${Math.round(activity.max_heartrate)})` : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* Power Output: STRICTLY FOR TURBO TRAINER OR BIKE */}
                {isBikeOrTurbo && activity.average_watts && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Power Output</div>
                      <div className="font-mono font-bold text-amber-300">
                        {Math.round(activity.average_watts)} W avg
                      </div>
                    </div>
                  </div>
                )}

                {activity.average_cadence && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Cadence</div>
                      <div className="font-mono font-bold text-sky-300">
                        {Math.round(activity.average_cadence)} rpm
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {description && (
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400 block mb-1">Description / Notes:</span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  {description}
                </p>
              </div>
            )}

            {availableStreamsList.length > 0 && (
              <div className="text-[11px] text-slate-400">
                Cached streams in IndexedDB: <span className="font-mono text-slate-300">{availableStreamsList.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Export Status Notifications */}
          {exportError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {exportSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span className="truncate">
                  {exportSuccess.alreadyExists
                    ? 'Activity already in Google Sheets (no duplicate written).'
                    : 'Successfully synced to GymFIT Training Log!'}
                </span>
              </div>
              <a
                href={exportSuccess.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-white hover:text-emerald-200 shrink-0 flex items-center gap-1"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer / Action CTA */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleExportToSheets}
            disabled={isExportingToSheets}
            className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
              isGoogleConnected
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            {isExportingToSheets ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting to Sheet...</span>
              </>
            ) : isGoogleConnected ? (
              <>
                <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                <span>{detailsRecord?.googleDrivePublishedAt ? 'Re-export to Google Sheets' : 'Send to Google Sheets'}</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                <span>Connect Google to Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
