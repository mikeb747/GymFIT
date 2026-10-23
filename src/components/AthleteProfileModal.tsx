import React, { useState } from 'react';
import {
  X,
  User,
  Heart,
  Footprints,
  Bike,
  Waves,
  Activity,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import type { AthleteProfile } from '../types/athlete';
import {
  formatSecondsToMinSec,
  parseMinSecToSeconds,
  calculateCss,
  getAthleteHeartRateZones,
} from '../types/athlete';

interface AthleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AthleteProfile;
  onSaveProfile: (profile: AthleteProfile) => void;
  onResetDefaults: () => void;
}

type ProfileTab = 'physiology' | 'running' | 'cycling' | 'swimming' | 'zones';

export const AthleteProfileModal: React.FC<AthleteProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('physiology');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Form states
  const [age, setAge] = useState(profile.age);
  const [birthDate, setBirthDate] = useState(profile.birthDate || '');
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [maxHeartRate, setMaxHeartRate] = useState(profile.maxHeartRate);
  const [restingHeartRate, setRestingHeartRate] = useState(profile.restingHeartRate);
  const [periodization, setPeriodization] = useState<'0' | '3weeks' | '4weeks'>(
    profile.periodization || '4weeks'
  );

  // Running
  const [thresholdHeartRateRun, setThresholdHeartRateRun] = useState(profile.thresholdHeartRateRun);
  const [paceOutdoorStr, setPaceOutdoorStr] = useState(
    formatSecondsToMinSec(profile.thresholdPaceRunOutdoorSec)
  );
  const [paceTreadmillStr, setPaceTreadmillStr] = useState(
    formatSecondsToMinSec(profile.thresholdPaceRunTreadmillSec)
  );

  // Cycling
  const [thresholdHeartRateBike, setThresholdHeartRateBike] = useState(profile.thresholdHeartRateBike);
  const [bikeFtp, setBikeFtp] = useState(profile.bikeFtp);

  // Swimming
  const [swim100mStr, setSwim100mStr] = useState(
    formatSecondsToMinSec(profile.swim100mTimeSec)
  );
  const [swim400mStr, setSwim400mStr] = useState(
    formatSecondsToMinSec(profile.swim400mTimeSec)
  );
  const [swimPoolPaceStr, setSwimPoolPaceStr] = useState(
    formatSecondsToMinSec(profile.swimPoolPace100mSec)
  );
  const [swimOpenWaterPaceStr, setSwimOpenWaterPaceStr] = useState(
    formatSecondsToMinSec(profile.swimOpenWaterPace100mSec)
  );

  // Synchronize when opening
  React.useEffect(() => {
    if (isOpen) {
      setAge(profile.age);
      setBirthDate(profile.birthDate || '');
      setHeightCm(profile.heightCm);
      setWeightKg(profile.weightKg);
      setMaxHeartRate(profile.maxHeartRate);
      setRestingHeartRate(profile.restingHeartRate);
      setPeriodization(profile.periodization || '4weeks');

      setThresholdHeartRateRun(profile.thresholdHeartRateRun);
      setPaceOutdoorStr(formatSecondsToMinSec(profile.thresholdPaceRunOutdoorSec));
      setPaceTreadmillStr(formatSecondsToMinSec(profile.thresholdPaceRunTreadmillSec));

      setThresholdHeartRateBike(profile.thresholdHeartRateBike);
      setBikeFtp(profile.bikeFtp);

      setSwim100mStr(formatSecondsToMinSec(profile.swim100mTimeSec));
      setSwim400mStr(formatSecondsToMinSec(profile.swim400mTimeSec));
      setSwimPoolPaceStr(formatSecondsToMinSec(profile.swimPoolPace100mSec));
      setSwimOpenWaterPaceStr(formatSecondsToMinSec(profile.swimOpenWaterPace100mSec));
      setSavedFeedback(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleBirthDateChange = (val: string) => {
    setBirthDate(val);
    if (val) {
      const birth = new Date(val);
      if (!isNaN(birth.getTime())) {
        const diffYears = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
        if (diffYears >= 10 && diffYears <= 110) {
          setAge(diffYears);
        }
      }
    }
  };

  // Live CSS calculation
  const t100 = parseMinSecToSeconds(swim100mStr, 84);
  const t400 = parseMinSecToSeconds(swim400mStr, 355);
  const liveCss = calculateCss(t100, t400);

  // Live zones preview
  const previewProfile: AthleteProfile = {
    age,
    birthDate,
    heightCm,
    weightKg,
    maxHeartRate,
    restingHeartRate,
    periodization,
    thresholdHeartRateRun,
    thresholdPaceRunOutdoorSec: parseMinSecToSeconds(paceOutdoorStr, 228),
    thresholdPaceRunTreadmillSec: parseMinSecToSeconds(paceTreadmillStr, 228),
    thresholdHeartRateBike,
    bikeFtp,
    swim100mTimeSec: t100,
    swim400mTimeSec: t400,
    swimPoolPace100mSec: parseMinSecToSeconds(swimPoolPaceStr, 90),
    swimOpenWaterPace100mSec: parseMinSecToSeconds(swimOpenWaterPaceStr, 98),
  };

  const previewRunZones = getAthleteHeartRateZones(previewProfile, 'run');

  const handleSave = () => {
    const updated: AthleteProfile = {
      age: Math.max(12, Math.min(100, Number(age) || 35)),
      birthDate: birthDate.trim() || undefined,
      heightCm: Math.max(100, Math.min(250, Number(heightCm) || 178)),
      weightKg: Math.max(30, Math.min(250, Number(weightKg) || 75)),
      maxHeartRate: Math.max(100, Math.min(230, Number(maxHeartRate) || 185)),
      restingHeartRate: Math.max(30, Math.min(120, Number(restingHeartRate) || 52)),
      periodization,

      thresholdHeartRateRun: Math.max(80, Math.min(220, Number(thresholdHeartRateRun) || 168)),
      thresholdPaceRunOutdoorSec: parseMinSecToSeconds(paceOutdoorStr, 228),
      thresholdPaceRunTreadmillSec: parseMinSecToSeconds(paceTreadmillStr, 228),

      thresholdHeartRateBike: Math.max(80, Math.min(220, Number(thresholdHeartRateBike) || 162)),
      bikeFtp: Math.max(50, Math.min(600, Number(bikeFtp) || 310)),

      swim100mTimeSec: t100,
      swim400mTimeSec: t400,
      swimPoolPace100mSec: parseMinSecToSeconds(swimPoolPaceStr, 90),
      swimOpenWaterPace100mSec: parseMinSecToSeconds(swimOpenWaterPaceStr, 98),
    };

    onSaveProfile(updated);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 2000);
  };

  const handleReset = () => {
    onResetDefaults();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Athlete Physiology & Zones</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Analysis Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Paces, thresholds & biometrics used for TSS, recovery, and stream charts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('physiology')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'physiology'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>General & HR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('running')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'running'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Footprints className="w-3.5 h-3.5 text-amber-400" />
            <span>Running</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cycling')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cycling'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bike className="w-3.5 h-3.5 text-orange-400" />
            <span>Cycling (FTP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('swimming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'swimming'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-sky-400" />
            <span>Swimming & CSS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'zones'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zones Preview</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: GENERAL PHYSIOLOGY */}
          {activeTab === 'physiology' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Your age, height, weight, and heart rate extremes determine Heart Rate Reserve (Karvonen formula), recovery rates, and caloric expenditure estimates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Birthday</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Age</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="12"
                      max="100"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">yrs</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Height</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="100"
                      max="240"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">cm</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Weight</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="35"
                      max="200"
                      step="0.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">kg</span>
                  </div>
                </div>
              </div>

              {/* Training Periodization Cycle */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Training Periodization Cycle
                  </label>
                  <span className="text-[10px] text-slate-500">Macrocycle & recovery planning</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriodization('0')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      periodization === '0'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs text-white">0 Weeks</div>
                    <div className="text-[11px] text-amber-300 font-semibold mt-0.5">Constant Progressions</div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Continuous progressive overload without scheduled de-load weeks.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodization('3weeks')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      periodization === '3weeks'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs text-white">3 Weeks</div>
                    <div className="text-[11px] text-amber-300 font-semibold mt-0.5">2 Build + 1 Easy</div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Easy recovery week every 3 weeks to shed fatigue.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodization('4weeks')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      periodization === '4weeks'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs text-white">4 Weeks</div>
                    <div className="text-[11px] text-amber-300 font-semibold mt-0.5">3 Build + 1 Easy</div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                      3 progressive weeks followed by 1 easier recovery week.
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-rose-300">Max Heart Rate</label>
                    <span className="text-[10px] text-slate-500">Highest observed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="120"
                      max="230"
                      value={maxHeartRate}
                      onChange={(e) => setMaxHeartRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">bpm</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Resting Heart Rate</label>
                    <span className="text-[10px] text-slate-500">Upon waking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="30"
                      max="110"
                      value={restingHeartRate}
                      onChange={(e) => setRestingHeartRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">bpm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RUNNING PACES (OUTDOOR VS TREADMILL) */}
          {activeTab === 'running' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Footprints className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Set distinct threshold paces (Functional Threshold Pace) for <strong>outdoor running</strong> and <strong>treadmill running</strong>.
                  Treadmill runs with trainer mode use your treadmill pace for accurate Running TSS (rTSS).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300">Outdoor Threshold Pace</label>
                    <span className="text-[10px] text-slate-500">10k / 1h pace</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="4:30"
                      value={paceOutdoorStr}
                      onChange={(e) => setPaceOutdoorStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">/km</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ~{(3600 / parseMinSecToSeconds(paceOutdoorStr, 270)).toFixed(1)} km/h equivalent
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300">Treadmill Threshold Pace</label>
                    <span className="text-[10px] text-slate-500">Indoor / Trainer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="4:45"
                      value={paceTreadmillStr}
                      onChange={(e) => setPaceTreadmillStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">/km</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ~{(3600 / parseMinSecToSeconds(paceTreadmillStr, 285)).toFixed(1)} km/h equivalent
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-rose-300">Running Lactate Threshold HR (LTHR)</label>
                  <span className="text-[10px] text-slate-500">Zone 4/5 boundary</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    max="220"
                    value={thresholdHeartRateRun}
                    onChange={(e) => setThresholdHeartRateRun(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-slate-500 font-mono">bpm</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Used when running without speed/GPS or for hrTSS calculations.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: CYCLING (FTP & LTHR) */}
          {activeTab === 'cycling' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Bike className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p>
                  Power metrics and Power TSS are strictly reserved for <strong>Turbo Trainer</strong> and <strong>Bike</strong> activities.
                  Set your Functional Threshold Power (FTP) in Watts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300">Bike FTP (Threshold Power)</label>
                    <span className="text-[10px] text-slate-500">1-hour max power</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="50"
                      max="600"
                      value={bikeFtp}
                      onChange={(e) => setBikeFtp(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">W</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Power-to-weight: {(bikeFtp / (weightKg || 75)).toFixed(2)} W/kg
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-rose-300">Cycling Lactate Threshold HR</label>
                    <span className="text-[10px] text-slate-500">Cycling LTHR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="100"
                      max="220"
                      value={thresholdHeartRateBike}
                      onChange={(e) => setThresholdHeartRateBike(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">bpm</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Typically 5-8 bpm lower than running LTHR.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SWIMMING & CSS */}
          {activeTab === 'swimming' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Waves className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p>
                  Enter your all-out 100m and 400m test times. GymFIT automatically derives your <strong>Critical Swim Speed (CSS)</strong> to calculate Swim TSS (sTSS) for pool swims and open water swims.
                </p>
              </div>

              {/* Time Trial Inputs for CSS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Swim 100m Time Trial</label>
                    <span className="text-[10px] text-slate-500">Max effort (mm:ss)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="1:35"
                      value={swim100mStr}
                      onChange={(e) => setSwim100mStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">{t100} seconds</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Swim 400m Time Trial</label>
                    <span className="text-[10px] text-slate-500">Max effort (mm:ss)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="6:55"
                      value={swim400mStr}
                      onChange={(e) => setSwim400mStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">{t400} seconds</span>
                </div>
              </div>

              {/* Live CSS Banner */}
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xs">
                    CSS
                  </div>
                  <div>
                    <span className="text-xs font-black text-sky-300 block">Critical Swim Speed (Derived)</span>
                    <span className="text-[11px] text-slate-400">
                      Speed: {liveCss.cssMps} m/s
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-white">
                    {liveCss.cssPaceFormatted}
                  </span>
                </div>
              </div>

              {/* Threshold Paces */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Pool Threshold Pace / 100m</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="1:45"
                      value={swimPoolPaceStr}
                      onChange={(e) => setSwimPoolPaceStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">/100m</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Open Water Threshold Pace</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="1:55"
                      value={swimOpenWaterPaceStr}
                      onChange={(e) => setSwimOpenWaterPaceStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">/100m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ZONES PREVIEW */}
          {activeTab === 'zones' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                <p>
                  Preview of your personalized Heart Rate Zones based on your Max HR ({maxHeartRate} bpm) and Running LTHR ({thresholdHeartRateRun} bpm):
                </p>
              </div>

              <div className="space-y-2">
                {previewRunZones.map((z) => (
                  <div
                    key={z.zone}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: z.color }}
                      />
                      <div>
                        <div className="font-bold text-white">
                          Zone {z.zone}: {z.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{z.description}</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-200 shrink-0">
                      {z.minHr} - {z.maxHr} bpm
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Physiology</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
