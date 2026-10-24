import React, { useState, useMemo, useRef } from 'react';
import {
  Heart,
  Zap,
  TrendingUp,
  Mountain,
  Gauge,
  Clock,
  Compass,
} from 'lucide-react';
import type { StravaActivity } from '../utils/stravaActivities';
import { classifyActivity } from '../utils/stravaActivities';
import type { AthleteProfile } from '../types/athlete';
import {
  getAthleteHeartRateZones,
  getAthletePaceZones,
  getAthletePowerZones,
  formatSecondsToMinSec,
} from '../types/athlete';

interface StravaStreamPlotProps {
  streams?: Record<string, { data?: any[] }>;
  activity: StravaActivity;
  athleteProfile: AthleteProfile;
}

type StreamMetricKey = 'heartrate' | 'watts' | 'velocity_smooth' | 'altitude' | 'cadence';

interface MetricConfig {
  key: StreamMetricKey;
  label: string;
  unit: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
  formatValue: (val: number, category: string) => string;
}

export const StravaStreamPlot: React.FC<StravaStreamPlotProps> = ({
  streams,
  activity,
  athleteProfile,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<StreamMetricKey>('heartrate');
  const [axisMode, setAxisMode] = useState<'distance' | 'time'>('distance');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const classification = classifyActivity(activity);
  const isBikeOrTurbo = classification.subType === 'Turbo Trainer' || classification.subType === 'Bike';

  // Available stream types
  const availableMetrics = useMemo<MetricConfig[]>(() => {
    const list: MetricConfig[] = [];

    if (streams?.heartrate?.data && streams.heartrate.data.length > 5) {
      list.push({
        key: 'heartrate',
        label: 'Heart Rate',
        unit: 'bpm',
        color: '#f43f5e', // rose-500
        gradientFrom: '#f43f5e',
        gradientTo: '#881337',
        icon: <Heart className="w-3.5 h-3.5 text-rose-400" />,
        formatValue: (v) => `${Math.round(v)} bpm`,
      });
    }

    // Power: strictly gated for Turbo Trainer or Bike!
    if (isBikeOrTurbo && streams?.watts?.data && streams.watts.data.length > 5) {
      list.push({
        key: 'watts',
        label: 'Power',
        unit: 'W',
        color: '#f59e0b', // amber-500
        gradientFrom: '#f59e0b',
        gradientTo: '#78350f',
        icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
        formatValue: (v) => `${Math.round(v)} W`,
      });
    }

    if (streams?.velocity_smooth?.data && streams.velocity_smooth.data.length > 5) {
      list.push({
        key: 'velocity_smooth',
        label: classification.category === 'Swim' ? 'Pace' : classification.category === 'Run' ? 'Pace' : 'Speed',
        unit: classification.category === 'Swim' ? '/100m' : classification.category === 'Run' ? '/km' : 'kph',
        color: '#38bdf8', // sky-400
        gradientFrom: '#38bdf8',
        gradientTo: '#0c4a6e',
        icon: <Gauge className="w-3.5 h-3.5 text-sky-400" />,
        formatValue: (v, cat) => {
          if (!v || v <= 0.1) return '--';
          if (cat === 'Run') {
            const secPerKm = 1000 / v;
            return `${formatSecondsToMinSec(secPerKm)}/km`;
          }
          if (cat === 'Swim') {
            const secPer100m = 100 / v;
            return `${formatSecondsToMinSec(secPer100m)}/100m`;
          }
          const kph = v * 3.6;
          return `${kph.toFixed(1)} kph`;
        },
      });
    }

    if (streams?.altitude?.data && streams.altitude.data.length > 5) {
      list.push({
        key: 'altitude',
        label: 'Elevation',
        unit: 'm',
        color: '#10b981', // emerald-500
        gradientFrom: '#10b981',
        gradientTo: '#064e3b',
        icon: <Mountain className="w-3.5 h-3.5 text-emerald-400" />,
        formatValue: (v) => `${Math.round(v)} m`,
      });
    }

    if (streams?.cadence?.data && streams.cadence.data.length > 5) {
      list.push({
        key: 'cadence',
        label: 'Cadence',
        unit: 'rpm',
        color: '#a855f7', // purple-500
        gradientFrom: '#a855f7',
        gradientTo: '#581c87',
        icon: <TrendingUp className="w-3.5 h-3.5 text-purple-400" />,
        formatValue: (v) => `${Math.round(v)} rpm`,
      });
    }

    return list;
  }, [streams, isBikeOrTurbo, classification.category]);

  // Ensure current selected metric is valid
  React.useEffect(() => {
    if (availableMetrics.length > 0 && !availableMetrics.some((m) => m.key === selectedMetric)) {
      setSelectedMetric(availableMetrics[0].key);
    }
  }, [availableMetrics, selectedMetric]);

  const activeConfig = availableMetrics.find((m) => m.key === selectedMetric) || availableMetrics[0];

  // Downsample streams for responsive 60fps SVG rendering
  const chartData = useMemo(() => {
    if (!streams || !activeConfig) return null;
    const rawValues: number[] = streams[activeConfig.key]?.data || [];
    const timeData: number[] = streams.time?.data || [];
    const distData: number[] = streams.distance?.data || [];

    if (rawValues.length === 0) return null;

    const TARGET_POINTS = 300;
    const step = Math.max(1, Math.floor(rawValues.length / TARGET_POINTS));

    const points: Array<{
      index: number;
      value: number;
      displayVal: number;
      timeSec: number;
      distMeters: number;
    }> = [];

    let minVal = Infinity;
    let maxVal = -Infinity;
    let sumVal = 0;
    let countVal = 0;

    for (let i = 0; i < rawValues.length; i += step) {
      const val = typeof rawValues[i] === 'number' ? rawValues[i] : 0;
      const t = timeData[i] ?? (i > 0 ? (timeData[timeData.length - 1] / rawValues.length) * i : 0);
      const d = distData[i] ?? 0;

      // Filter extreme outliers
      if (activeConfig.key === 'heartrate' && (val < 30 || val > 240)) continue;
      if (activeConfig.key === 'watts' && (val < 0 || val > 2000)) continue;

      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
      sumVal += val;
      countVal++;

      points.push({
        index: i,
        value: val,
        displayVal: val,
        timeSec: t,
        distMeters: d,
      });
    }

    if (points.length < 2) return null;

    const avgVal = countVal > 0 ? sumVal / countVal : 0;
    const totalDist = points[points.length - 1].distMeters;
    const totalTime = points[points.length - 1].timeSec;

    return {
      points,
      minVal: minVal === Infinity ? 0 : minVal,
      maxVal: maxVal === -Infinity ? 100 : maxVal,
      avgVal,
      totalDist,
      totalTime,
    };
  }, [streams, activeConfig]);

  // HR Zones Breakdown if heart rate data available
  const hrZonesBreakdown = useMemo(() => {
    const hrData: number[] = streams?.heartrate?.data || [];
    if (hrData.length < 10) return null;

    const zones = getAthleteHeartRateZones(
      athleteProfile,
      classification.category === 'Bike' ? 'bike' : 'run'
    );

    const counts = [0, 0, 0, 0, 0];
    let validCount = 0;

    for (const hr of hrData) {
      if (typeof hr !== 'number' || hr < 40) continue;
      validCount++;
      if (hr <= zones[0].maxHr) counts[0]++;
      else if (hr <= zones[1].maxHr) counts[1]++;
      else if (hr <= zones[2].maxHr) counts[2]++;
      else if (hr <= zones[3].maxHr) counts[3]++;
      else counts[4]++;
    }

    if (validCount === 0) return null;

    return zones.map((z, idx) => ({
      ...z,
      pct: Math.round((counts[idx] / validCount) * 100),
      durationSec: Math.round((counts[idx] / validCount) * (activity.moving_time || 0)),
    }));
  }, [streams, athleteProfile, classification.category, activity.moving_time]);

  // Pace Zones Breakdown for Running activities (Run or Treadmill Run)
  const paceZonesBreakdown = useMemo(() => {
    if (classification.category !== 'Run') return null;
    const vData: number[] = streams?.velocity_smooth?.data || [];
    if (vData.length < 10) return null;

    const zones = getAthletePaceZones(
      athleteProfile,
      classification.subType === 'Treadmill Run'
    );

    const counts = [0, 0, 0, 0, 0];
    let validCount = 0;

    for (const v of vData) {
      if (typeof v !== 'number' || v < 0.5) continue; // ignore stopped/walking < 1.8 kph
      validCount++;
      const secPerKm = 1000 / v;
      // In running pace, slower pace has higher secPerKm:
      // Z1: >= zones[0].minPaceSec
      // Z2: >= zones[1].minPaceSec
      // Z3: >= zones[2].minPaceSec
      // Z4: >= zones[3].minPaceSec
      // Z5: < zones[3].minPaceSec
      if (secPerKm >= zones[0].minPaceSec) counts[0]++;
      else if (secPerKm >= zones[1].minPaceSec) counts[1]++;
      else if (secPerKm >= zones[2].minPaceSec) counts[2]++;
      else if (secPerKm >= zones[3].minPaceSec) counts[3]++;
      else counts[4]++;
    }

    if (validCount === 0) return null;

    return zones.map((z, idx) => ({
      ...z,
      pct: Math.round((counts[idx] / validCount) * 100),
      durationSec: Math.round((counts[idx] / validCount) * (activity.moving_time || 0)),
    }));
  }, [streams, athleteProfile, classification.category, classification.subType, activity.moving_time]);

  // Power Zones Breakdown for Cycling activities (Turbo Trainer or Bike)
  const powerZonesBreakdown = useMemo(() => {
    if (!isBikeOrTurbo) return null;
    const wData: number[] = streams?.watts?.data || [];
    if (wData.length < 10) return null;

    const zones = getAthletePowerZones(athleteProfile);
    const counts = new Array(zones.length).fill(0);
    let validCount = 0;

    for (const w of wData) {
      if (typeof w !== 'number' || w < 0) continue;
      validCount++;
      let placed = false;
      for (let i = 0; i < zones.length; i++) {
        if (w <= zones[i].maxWatts) {
          counts[i]++;
          placed = true;
          break;
        }
      }
      if (!placed) {
        counts[zones.length - 1]++;
      }
    }

    if (validCount === 0) return null;

    return zones.map((z, idx) => ({
      ...z,
      pct: Math.round((counts[idx] / validCount) * 100),
      durationSec: Math.round((counts[idx] / validCount) * (activity.moving_time || 0)),
    }));
  }, [streams, athleteProfile, isBikeOrTurbo, activity.moving_time]);

  if (!streams || availableMetrics.length === 0) {
    return (
      <div className="py-6 px-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          No detailed time-series stream data available for this activity.
        </p>
      </div>
    );
  }

  if (!chartData || chartData.points.length < 2) {
    return (
      <div className="py-6 px-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          Preparing stream visualization...
        </p>
      </div>
    );
  }

  // Dimensions for SVG
  const width = 640;
  const height = 180;
  const padding = { top: 20, right: 15, bottom: 25, left: 45 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const yRange = chartData.maxVal - chartData.minVal || 1;
  const yPadding = yRange * 0.1;
  const effectiveMin = Math.max(0, chartData.minVal - yPadding);
  const effectiveMax = chartData.maxVal + yPadding;
  const effectiveRange = effectiveMax - effectiveMin || 1;

  // Convert points to SVG coordinates
  const svgPoints = chartData.points.map((p, i) => {
    const xFraction = i / (chartData.points.length - 1);
    const x = padding.left + xFraction * plotWidth;
    const yFraction = (p.value - effectiveMin) / effectiveRange;
    const y = padding.top + plotHeight - yFraction * plotHeight;
    return { ...p, x, y };
  });

  // Construct SVG Path
  const linePath = svgPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
  const areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x.toFixed(1)},${(padding.top + plotHeight).toFixed(1)} L ${padding.left.toFixed(1)},${(padding.top + plotHeight).toFixed(1)} Z`;

  // Hover position handling
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right) {
      setHoverIndex(null);
      return;
    }

    const relX = (svgX - padding.left) / plotWidth;
    const targetIdx = Math.round(relX * (svgPoints.length - 1));
    const clampedIdx = Math.max(0, Math.min(svgPoints.length - 1, targetIdx));
    setHoverIndex(clampedIdx);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.touches[0].clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;
    if (svgX < padding.left || svgX > width - padding.right) return;
    const relX = (svgX - padding.left) / plotWidth;
    const targetIdx = Math.round(relX * (svgPoints.length - 1));
    setHoverIndex(Math.max(0, Math.min(svgPoints.length - 1, targetIdx)));
  };

  const handlePlotClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;
    if (svgX < padding.left || svgX > width - padding.right) return;
    const relX = (svgX - padding.left) / plotWidth;
    const targetIdx = Math.round(relX * (svgPoints.length - 1));
    const clampedIdx = Math.max(0, Math.min(svgPoints.length - 1, targetIdx));
    setSelectedPointIndex((prev) => (prev === clampedIdx ? null : clampedIdx));
  };

  const hoveredPoint = hoverIndex !== null ? svgPoints[hoverIndex] : null;
  const selectedPoint = selectedPointIndex !== null && svgPoints[selectedPointIndex] ? svgPoints[selectedPointIndex] : null;

  // Find HR Zone of active point if viewing Heart Rate
  let hoveredHrZone = '';
  const pointForZone = hoveredPoint || selectedPoint;
  if (pointForZone && activeConfig.key === 'heartrate') {
    const zones = getAthleteHeartRateZones(
      athleteProfile,
      classification.category === 'Bike' ? 'bike' : 'run'
    );
    const z = zones.find((item) => pointForZone.value <= item.maxHr) || zones[zones.length - 1];
    hoveredHrZone = `Z${z.zone} ${z.name}`;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-950/80 border border-slate-800 p-3 sm:p-4 shadow-inner">
      {/* Stream Selector & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {availableMetrics.map((metric) => {
            const isActive = metric.key === selectedMetric;
            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => {
                  setSelectedMetric(metric.key);
                  setHoverIndex(null);
                  setSelectedPointIndex(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                {metric.icon}
                <span>{metric.label}</span>
              </button>
            );
          })}
        </div>

        {/* Axis Toggle: Distance vs Time */}
        <div className="flex items-center gap-2">
          {selectedPoint && (
            <button
              type="button"
              onClick={() => setSelectedPointIndex(null)}
              className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
              title="Clear selected line"
            >
              Clear Pin ✕
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setAxisMode('distance')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                axisMode === 'distance'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Distance
            </button>
            <button
              type="button"
              onClick={() => setAxisMode('time')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                axisMode === 'time'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Time
            </button>
          </div>
        </div>
      </div>

      {/* SVG Stream Chart */}
      <div className="relative w-full" ref={containerRef}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none cursor-crosshair touch-none"
          onClick={handlePlotClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`stream-gradient-${activeConfig.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeConfig.gradientFrom} stopOpacity="0.4" />
              <stop offset="100%" stopColor={activeConfig.gradientTo} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="#334155"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <text
            x={padding.left - 6}
            y={padding.top + 3}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {activeConfig.formatValue(effectiveMax, classification.category).replace(/ bpm| W| kph|\/km|\/100m| m| rpm/g, '')}
          </text>

          <line
            x1={padding.left}
            y1={padding.top + plotHeight / 2}
            x2={width - padding.right}
            y2={padding.top + plotHeight / 2}
            stroke="#1e293b"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <text
            x={padding.left - 6}
            y={padding.top + plotHeight / 2 + 3}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {activeConfig.formatValue((effectiveMax + effectiveMin) / 2, classification.category).replace(/ bpm| W| kph|\/km|\/100m| m| rpm/g, '')}
          </text>

          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight}
            stroke="#334155"
            strokeWidth="1"
          />
          <text
            x={padding.left - 6}
            y={padding.top + plotHeight + 3}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {activeConfig.formatValue(effectiveMin, classification.category).replace(/ bpm| W| kph|\/km|\/100m| m| rpm/g, '')}
          </text>

          {/* X-axis labels */}
          <text
            x={padding.left}
            y={height - 5}
            textAnchor="start"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {axisMode === 'distance' ? '0 km' : '0m'}
          </text>
          <text
            x={padding.left + plotWidth / 2}
            y={height - 5}
            textAnchor="middle"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {axisMode === 'distance'
              ? `${(chartData.totalDist / 2000).toFixed(1)} km`
              : formatSecondsToMinSec(chartData.totalTime / 2)}
          </text>
          <text
            x={width - padding.right}
            y={height - 5}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {axisMode === 'distance'
              ? `${(chartData.totalDist / 1000).toFixed(1)} km`
              : formatSecondsToMinSec(chartData.totalTime)}
          </text>

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#stream-gradient-${activeConfig.key})`} />

          {/* Line Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke={activeConfig.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* User Click Selection: Solid Vertical Black Line */}
          {selectedPoint && (
            <g>
              {/* Outer crisp white halo for high-contrast visibility against colored/dark backgrounds */}
              <line
                x1={selectedPoint.x}
                y1={padding.top}
                x2={selectedPoint.x}
                y2={padding.top + plotHeight}
                stroke="#ffffff"
                strokeWidth="4"
                opacity="0.95"
              />
              {/* Solid Vertical Black Line requested by user */}
              <line
                x1={selectedPoint.x}
                y1={padding.top}
                x2={selectedPoint.x}
                y2={padding.top + plotHeight}
                stroke="#000000"
                strokeWidth="2.5"
              />
              {/* Top pointer notch */}
              <polygon
                points={`${selectedPoint.x - 5},${padding.top} ${selectedPoint.x + 5},${padding.top} ${selectedPoint.x},${padding.top + 7}`}
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1"
              />
              {/* Bottom pointer notch */}
              <polygon
                points={`${selectedPoint.x - 5},${padding.top + plotHeight} ${selectedPoint.x + 5},${padding.top + plotHeight} ${selectedPoint.x},${padding.top + plotHeight - 7}`}
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1"
              />
              {/* Point on curve */}
              <circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="5"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Hover Crosshair & Indicator Point (if not already selecting) */}
          {hoveredPoint && (!selectedPoint || hoveredPoint.index !== selectedPoint.index) && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + plotHeight}
                stroke="#f8fafc"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="4.5"
                fill="#ffffff"
                stroke={activeConfig.color}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Selected or Hover Floating Details Card */}
        {pointForZone && (
          <div
            className={`absolute top-2 pointer-events-none transform -translate-x-1/2 border rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md z-10 flex items-center gap-3 ${
              selectedPoint && (!hoveredPoint || hoveredPoint.index === selectedPoint.index)
                ? 'bg-black/95 border-amber-400 text-white ring-2 ring-black/40'
                : 'bg-slate-900/95 border-slate-700/80'
            }`}
            style={{
              left: `${Math.max(12, Math.min(88, (pointForZone.x / width) * 100))}%`,
            }}
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                {selectedPoint && (!hoveredPoint || hoveredPoint.index === selectedPoint.index) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                )}
                <span>
                  {axisMode === 'distance'
                    ? `${(pointForZone.distMeters / 1000).toFixed(2)} km`
                    : formatSecondsToMinSec(pointForZone.timeSec)}
                  {' · '}
                  {formatSecondsToMinSec(pointForZone.timeSec)}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black font-mono text-white">
                  {activeConfig.formatValue(pointForZone.value, classification.category)}
                </span>
                {hoveredHrZone && (
                  <span className="text-[10px] font-bold text-amber-300 font-sans">
                    ({hoveredHrZone})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stream Min / Avg / Max Summary Strip */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800/80">
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Min</span>
          <span className="text-xs font-bold font-mono text-white mt-0.5">
            {activeConfig.formatValue(chartData.minVal, classification.category)}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Average</span>
          <span className="text-xs font-bold font-mono text-amber-300 mt-0.5">
            {activeConfig.formatValue(chartData.avgVal, classification.category)}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Max</span>
          <span className="text-xs font-bold font-mono text-white mt-0.5">
            {activeConfig.formatValue(chartData.maxVal, classification.category)}
          </span>
        </div>
      </div>

      {/* Zone Distributions Container */}
      <div className="pt-2 border-t border-slate-800/60 space-y-3">
        {/* 1. Heart Rate Zones Distribution Bar */}
        {hrZonesBreakdown && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Heart Rate Zone Distribution</span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                LTHR {classification.category === 'Bike' ? athleteProfile.thresholdHeartRateBike : athleteProfile.thresholdHeartRateRun} bpm
              </span>
            </div>

            {/* Stacked Percentage Bar */}
            <div className="h-3 w-full rounded-full overflow-hidden bg-slate-900 flex shadow-inner">
              {hrZonesBreakdown.map((z) =>
                z.pct > 0 ? (
                  <div
                    key={z.zone}
                    style={{ width: `${z.pct}%`, backgroundColor: z.color }}
                    title={`Zone ${z.zone} (${z.name}): ${z.pct}% (${formatSecondsToMinSec(z.durationSec)})`}
                    className="h-full transition-all relative group"
                  />
                ) : null
              )}
            </div>

            {/* Zone Legend */}
            <div className="grid grid-cols-5 gap-1 pt-0.5 text-[10px] font-mono">
              {hrZonesBreakdown.map((z) => (
                <div key={z.zone} className="flex flex-col items-center text-center">
                  <span className="font-bold truncate" style={{ color: z.color }}>
                    Z{z.zone} {z.pct}%
                  </span>
                  <span className="text-[9px] text-slate-400 truncate font-sans">
                    {formatSecondsToMinSec(z.durationSec)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Pace Zone Distribution Bar (Strictly for Running Activities!) */}
        {paceZonesBreakdown && (
          <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>Pace Zone Distribution</span>
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                Threshold: {formatSecondsToMinSec(classification.subType === 'Treadmill Run' ? athleteProfile.thresholdPaceRunTreadmillSec : athleteProfile.thresholdPaceRunOutdoorSec)}/km
              </span>
            </div>

            {/* Stacked Percentage Bar */}
            <div className="h-3 w-full rounded-full overflow-hidden bg-slate-900 flex shadow-inner">
              {paceZonesBreakdown.map((z) =>
                z.pct > 0 ? (
                  <div
                    key={z.zone}
                    style={{ width: `${z.pct}%`, backgroundColor: z.color }}
                    title={`Zone ${z.zone} (${z.name}): ${z.pct}% (${formatSecondsToMinSec(z.durationSec)}) [${z.rangeFormatted}]`}
                    className="h-full transition-all relative group"
                  />
                ) : null
              )}
            </div>

            {/* Zone Legend */}
            <div className="grid grid-cols-5 gap-1 pt-0.5 text-[10px] font-mono">
              {paceZonesBreakdown.map((z) => (
                <div key={z.zone} className="flex flex-col items-center text-center">
                  <span className="font-bold truncate" style={{ color: z.color }}>
                    Z{z.zone} {z.pct}%
                  </span>
                  <span className="text-[9px] text-slate-400 truncate font-sans">
                    {formatSecondsToMinSec(z.durationSec)}
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono truncate">
                    {z.rangeFormatted}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Power Zone Distribution Bar (Strictly for Cycling Activities!) */}
        {powerZonesBreakdown && (
          <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Power Zone Distribution</span>
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                FTP: {athleteProfile.bikeFtp}W
              </span>
            </div>

            {/* Stacked Percentage Bar */}
            <div className="h-3 w-full rounded-full overflow-hidden bg-slate-900 flex shadow-inner">
              {powerZonesBreakdown.map((z) =>
                z.pct > 0 ? (
                  <div
                    key={z.zone}
                    style={{ width: `${z.pct}%`, backgroundColor: z.color }}
                    title={`Zone ${z.zone} (${z.name}): ${z.pct}% (${formatSecondsToMinSec(z.durationSec)}) [${z.rangeFormatted}]`}
                    className="h-full transition-all relative group"
                  />
                ) : null
              )}
            </div>

            {/* Zone Legend */}
            <div className="grid grid-cols-6 gap-1 pt-0.5 text-[10px] font-mono">
              {powerZonesBreakdown.map((z) => (
                <div key={z.zone} className="flex flex-col items-center text-center">
                  <span className="font-bold truncate" style={{ color: z.color }}>
                    Z{z.zone} {z.pct}%
                  </span>
                  <span className="text-[9px] text-slate-400 truncate font-sans">
                    {formatSecondsToMinSec(z.durationSec)}
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono truncate">
                    {z.rangeFormatted}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
