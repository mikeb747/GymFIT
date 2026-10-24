import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Smartphone,
  Sun,
  Moon,
  Pencil,
} from 'lucide-react';
import type { AthleteProfile } from '../types/athlete';
import {
  formatSecondsToMinSec,
  parseMinSecToSeconds,
  calculateCss,
  getAthleteHeartRateZones,
  calculateAgeFromBirthDate,
} from '../types/athlete';
import type { AppTheme, DisplayDensity } from './SettingsModal';

export type ProfileTab = 'settings' | 'physiology' | 'running' | 'cycling' | 'swimming' | 'zones';

interface AthleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AthleteProfile;
  onSaveProfile: (profile: AthleteProfile) => void;
  onResetDefaults: () => void;
  initialTab?: ProfileTab;

  // Settings tab props
  theme?: AppTheme;
  onThemeChanged?: (theme: AppTheme) => void;
  displayDensity?: DisplayDensity;
  onDensityChanged?: (density: DisplayDensity) => void;
  brandTitle?: string;
  brandSubtitle?: string;
  onSaveBrand?: (title: string, subtitle: string) => void;
  onResetBrand?: () => void;
  heroEyebrow?: string;
  heroHeading?: string;
  heroDescription?: string;
  onSaveHeroText?: (eyebrow: string, heading: string, description: string) => void;
  onResetHeroText?: () => void;
}

export const AthleteProfileModal: React.FC<AthleteProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onResetDefaults,
  initialTab,
  theme = 'dark',
  onThemeChanged,
  displayDensity = 'standard',
  onDensityChanged,
  brandTitle = 'GymFIT',
  brandSubtitle = 'Workout Log & Strava Uploader',
  onSaveBrand,
  onResetBrand,
  heroEyebrow = 'LOG · PUBLISH · REPEAT',
  heroHeading = 'Ready to Train?',
  heroDescription = 'Log every set as you train, starting from last session’s weights. Finished sessions automatically compile into valid FIT files with native sets and reps.',
  onSaveHeroText,
  onResetHeroText,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('settings');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Settings tab local states
  const [tempTitle, setTempTitle] = useState(brandTitle);
  const [tempSubtitle, setTempSubtitle] = useState(brandSubtitle);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandSavedFeedback, setBrandSavedFeedback] = useState(false);

  const [tempHeroEyebrow, setTempHeroEyebrow] = useState(heroEyebrow);
  const [tempHeroHeading, setTempHeroHeading] = useState(heroHeading);
  const [tempHeroDescription, setTempHeroDescription] = useState(heroDescription);
  const [isEditingHeroText, setIsEditingHeroText] = useState(false);
  const [heroSavedFeedback, setHeroSavedFeedback] = useState(false);

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

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabButtonRefs = useRef<Record<ProfileTab, HTMLButtonElement | null>>({
    settings: null,
    physiology: null,
    running: null,
    cycling: null,
    swimming: null,
    zones: null,
  });

  const checkTabScroll = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollActiveTabIntoView = useCallback((tab: ProfileTab) => {
    const btn = tabButtonRefs.current[tab];
    const container = tabsContainerRef.current;
    if (btn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();

      // If button right edge extends past container right edge, slide container right
      if (btnRect.right > containerRect.right - 8) {
        const diff = btnRect.right - containerRect.right + 28;
        container.scrollBy({ left: diff, behavior: 'smooth' });
      } else if (btnRect.left < containerRect.left + 8) {
        const diff = btnRect.left - containerRect.left - 28;
        container.scrollBy({ left: diff, behavior: 'smooth' });
      }
    }
    setTimeout(checkTabScroll, 300);
  }, [checkTabScroll]);

  const handleSelectTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    setTimeout(() => {
      scrollActiveTabIntoView(tab);
    }, 40);
  };

  useEffect(() => {
    checkTabScroll();
    window.addEventListener('resize', checkTabScroll);
    return () => window.removeEventListener('resize', checkTabScroll);
  }, [checkTabScroll, isOpen, activeTab]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollActiveTabIntoView(activeTab);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isOpen, scrollActiveTabIntoView]);

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tabsContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    setTimeout(checkTabScroll, 250);
  };

  // Synchronize when opening
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setBirthDate(profile.birthDate || '');
      const computed = calculateAgeFromBirthDate(profile.birthDate);
      setAge(computed !== null ? computed : profile.age);
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

      setTempTitle(brandTitle);
      setTempSubtitle(brandSubtitle);
      setTempHeroEyebrow(heroEyebrow);
      setTempHeroHeading(heroHeading);
      setTempHeroDescription(heroDescription);

      setSavedFeedback(false);
    }
  }, [isOpen, profile, initialTab, brandTitle, brandSubtitle, heroEyebrow, heroHeading, heroDescription]);

  // Compute dirty state (whether any physiology values changed compared to loaded profile)
  const isDirty = useMemo(() => {
    if (!profile) return false;
    const initialOutdoorStr = formatSecondsToMinSec(profile.thresholdPaceRunOutdoorSec);
    const initialTreadmillStr = formatSecondsToMinSec(profile.thresholdPaceRunTreadmillSec);
    const initial100mStr = formatSecondsToMinSec(profile.swim100mTimeSec);
    const initial400mStr = formatSecondsToMinSec(profile.swim400mTimeSec);
    const initialPoolPaceStr = formatSecondsToMinSec(profile.swimPoolPace100mSec);
    const initialOpenWaterPaceStr = formatSecondsToMinSec(profile.swimOpenWaterPace100mSec);

    return (
      age !== profile.age ||
      heightCm !== profile.heightCm ||
      weightKg !== profile.weightKg ||
      maxHeartRate !== profile.maxHeartRate ||
      restingHeartRate !== profile.restingHeartRate ||
      periodization !== (profile.periodization || '4weeks') ||
      thresholdHeartRateRun !== profile.thresholdHeartRateRun ||
      paceOutdoorStr !== initialOutdoorStr ||
      paceTreadmillStr !== initialTreadmillStr ||
      thresholdHeartRateBike !== profile.thresholdHeartRateBike ||
      bikeFtp !== profile.bikeFtp ||
      swim100mStr !== initial100mStr ||
      swim400mStr !== initial400mStr ||
      swimPoolPaceStr !== initialPoolPaceStr ||
      swimOpenWaterPaceStr !== initialOpenWaterPaceStr
    );
  }, [
    profile,
    age,
    heightCm,
    weightKg,
    maxHeartRate,
    restingHeartRate,
    periodization,
    thresholdHeartRateRun,
    paceOutdoorStr,
    paceTreadmillStr,
    thresholdHeartRateBike,
    bikeFtp,
    swim100mStr,
    swim400mStr,
    swimPoolPaceStr,
    swimOpenWaterPaceStr,
  ]);

  if (!isOpen) return null;

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

  const handleSaveBrandCustomization = () => {
    const finalTitle = tempTitle.trim() || 'GymFIT';
    const finalSub = tempSubtitle.trim() || 'Workout Log & Strava Uploader';
    onSaveBrand?.(finalTitle, finalSub);
    setIsEditingBrand(false);
    setBrandSavedFeedback(true);
    setTimeout(() => setBrandSavedFeedback(false), 2000);
  };

  const handleResetBrandDefaults = () => {
    onResetBrand?.();
    setTempTitle('GymFIT');
    setTempSubtitle('Workout Log & Strava Uploader');
    setIsEditingBrand(false);
  };

  const handleSaveStudioText = () => {
    const finalEyebrow = tempHeroEyebrow.trim() || 'LOG · PUBLISH · REPEAT';
    const finalHeading = tempHeroHeading.trim() || 'Ready to Train?';
    const finalDesc =
      tempHeroDescription.trim() ||
      'Log every set as you train, starting from last session’s weights. Finished sessions automatically compile into valid FIT files with native sets and reps.';
    onSaveHeroText?.(finalEyebrow, finalHeading, finalDesc);
    setIsEditingHeroText(false);
    setHeroSavedFeedback(true);
    setTimeout(() => setHeroSavedFeedback(false), 2000);
  };

  const handleResetStudioText = () => {
    onResetHeroText?.();
    setTempHeroEyebrow('LOG · PUBLISH · REPEAT');
    setTempHeroHeading('Ready to Train?');
    setTempHeroDescription(
      'Log every set as you train, starting from last session’s weights. Finished sessions automatically compile into valid FIT files with native sets and reps.'
    );
    setIsEditingHeroText(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3.5 sm:gap-4 text-slate-100 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Settings</span>
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation with Left/Right Scroll Arrows */}
        <div className="relative flex items-center border-b border-slate-800/80 shrink-0 pb-1">
          {/* Left Arrow Button / Indicator */}
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll tabs left"
            className={`p-1.5 rounded-xl transition-all cursor-pointer mr-1 shrink-0 ${
              canScrollLeft
                ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 shadow-sm border border-slate-700'
                : 'text-slate-600 cursor-not-allowed opacity-30'
            }`}
            title={canScrollLeft ? 'More tabs to the left' : undefined}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Tab Strip */}
          <div
            ref={tabsContainerRef}
            onScroll={checkTabScroll}
            className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth py-0.5"
          >
            {/* Tab 0: Appearance (renamed from Settings) */}
            <button
              ref={(el) => {
                tabButtonRefs.current.settings = el;
              }}
              type="button"
              onClick={() => handleSelectTab('settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Appearance</span>
            </button>

            {/* Tab 1: Athlete (renamed from General & HR) */}
            <button
              ref={(el) => {
                tabButtonRefs.current.physiology = el;
              }}
              type="button"
              onClick={() => handleSelectTab('physiology')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'physiology'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Athlete</span>
            </button>

            {/* Tab 2: Running */}
            <button
              ref={(el) => {
                tabButtonRefs.current.running = el;
              }}
              type="button"
              onClick={() => handleSelectTab('running')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'running'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Footprints className="w-3.5 h-3.5 text-amber-400" />
              <span>Running</span>
            </button>

            {/* Tab 3: Cycling (renamed from Cycling (FTP)) */}
            <button
              ref={(el) => {
                tabButtonRefs.current.cycling = el;
              }}
              type="button"
              onClick={() => handleSelectTab('cycling')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'cycling'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bike className="w-3.5 h-3.5 text-orange-400" />
              <span>Cycling</span>
            </button>

            {/* Tab 4: Swimming (renamed from Swimming & CSS) */}
            <button
              ref={(el) => {
                tabButtonRefs.current.swimming = el;
              }}
              type="button"
              onClick={() => handleSelectTab('swimming')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'swimming'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-sky-400" />
              <span>Swimming</span>
            </button>

            {/* Tab 5: Zones (renamed from Zones Preview) */}
            <button
              ref={(el) => {
                tabButtonRefs.current.zones = el;
              }}
              type="button"
              onClick={() => handleSelectTab('zones')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'zones'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zones</span>
            </button>
          </div>

          {/* Right Arrow Button / Indicator */}
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            disabled={!canScrollRight}
            aria-label="Scroll tabs right"
            className={`p-1.5 rounded-xl transition-all cursor-pointer ml-1 shrink-0 ${
              canScrollRight
                ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 shadow-sm border border-slate-700'
                : 'text-slate-600 cursor-not-allowed opacity-30'
            }`}
            title={canScrollRight ? 'More tabs to the right' : undefined}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 0: SETTINGS (DARK/LIGHT, DENSITY, TITLE, STUDIO TEXT) */}
          {activeTab === 'settings' && (
            <div className="space-y-3.5">
              {/* 1. Theme Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                      Theme / Appearance
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Switch between high-contrast dark and light modes
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onThemeChanged?.('dark')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dark Mode</span>
                    {theme === 'dark' && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChanged?.('light')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light Mode</span>
                    {theme === 'light' && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
                  </button>
                </div>
              </div>

              {/* 2. Display Density */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                      Display Density & UI Scaling
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Optimize UI scale for high-DPI screens
                    </p>
                  </div>
                  <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onDensityChanged?.('compact')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      displayDensity === 'compact'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold">Dense</span>
                    <span className="text-[10px] text-slate-500 font-mono">90%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDensityChanged?.('standard')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      displayDensity === 'standard'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold">Standard</span>
                    <span className="text-[10px] text-slate-500 font-mono">100%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDensityChanged?.('comfortable')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      displayDensity === 'comfortable'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold">Spacious</span>
                    <span className="text-[10px] text-slate-500 font-mono">115%</span>
                  </button>
                </div>
              </div>

              {/* 3. App Title & Branding */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                      App Title & Branding
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Customize the name displayed on the header
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingBrand(!isEditingBrand)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEditingBrand ? 'Close' : 'Edit'}</span>
                  </button>
                </div>

                {!isEditingBrand ? (
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">{brandTitle}</span>
                      <span className="text-xs text-slate-400">{brandSubtitle}</span>
                    </div>
                    {brandSavedFeedback && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        App Title
                      </label>
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        placeholder="e.g. GymFIT"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={tempSubtitle}
                        onChange={(e) => setTempSubtitle(e.target.value)}
                        placeholder="e.g. Workout Log & Strava Uploader"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleResetBrandDefaults}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Default</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBrandCustomization}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        Save Title
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Customize Studio Text */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                      Customize Studio Text
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Headline & description on the main dashboard
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingHeroText(!isEditingHeroText)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEditingHeroText ? 'Close' : 'Edit'}</span>
                  </button>
                </div>

                {!isEditingHeroText ? (
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block font-mono">
                        {heroEyebrow}
                      </span>
                      <span className="text-sm font-bold text-white block">{heroHeading}</span>
                      <span className="text-xs text-slate-400 line-clamp-1 block">{heroDescription}</span>
                    </div>
                    {heroSavedFeedback && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 shrink-0 ml-2">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Eyebrow Label
                      </label>
                      <input
                        type="text"
                        value={tempHeroEyebrow}
                        onChange={(e) => setTempHeroEyebrow(e.target.value)}
                        placeholder="e.g. LOG · PUBLISH · REPEAT"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Main Heading
                      </label>
                      <input
                        type="text"
                        value={tempHeroHeading}
                        onChange={(e) => setTempHeroHeading(e.target.value)}
                        placeholder="e.g. Ready to Train?"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Description Text
                      </label>
                      <textarea
                        rows={2}
                        value={tempHeroDescription}
                        onChange={(e) => setTempHeroDescription(e.target.value)}
                        placeholder="e.g. Log every set as you train..."
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleResetStudioText}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Default</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveStudioText}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        Save Studio Text
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: GENERAL PHYSIOLOGY */}
          {activeTab === 'physiology' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Your age, height, weight, and heart rate extremes determine Heart Rate Reserve (Karvonen formula), recovery rates, and caloric expenditure estimates.
                </p>
              </div>

              {/* Row 1: Date of Birth & Age (Always 2 columns side-by-side on mobile without stretching) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Date of Birth: Greyed out and NOT an input box so it's obvious it's not an input value */}
                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1.5 opacity-80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400">Date of Birth</label>
                    <span className="text-[10px] text-slate-500">Fixed</span>
                  </div>
                  <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold font-mono text-slate-400 select-none flex items-center justify-between">
                    <span>{birthDate || 'Not specified'}</span>
                    <span className="text-[10px] text-slate-500 font-sans">Read-only</span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Age</label>
                    <span className="text-[10px] text-amber-400 font-medium">From DoB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="12"
                      max="100"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">yrs</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Height & Weight (Always 2 columns side-by-side on mobile without stretching) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Height</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="100"
                      max="240"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">cm</span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Weight</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="35"
                      max="200"
                      step="0.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">kg</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Max HR & Resting HR (Always 2 columns side-by-side on mobile without stretching) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-rose-300">Max HR</label>
                    <span className="text-[10px] text-slate-500">Peak</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="120"
                      max="230"
                      value={maxHeartRate}
                      onChange={(e) => setMaxHeartRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">bpm</span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Resting HR</label>
                    <span className="text-[10px] text-slate-500">Wake</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="30"
                      max="110"
                      value={restingHeartRate}
                      onChange={(e) => setRestingHeartRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">bpm</span>
                  </div>
                </div>
              </div>

              {/* Training Periodization Cycle (Always 3 columns side-by-side on mobile without stretching) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Training Periodization Cycle
                  </label>
                  <span className="text-[10px] text-slate-500">Macrocycle</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriodization('0')}
                    className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      periodization === '0'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs text-white">0 Wks</div>
                    <div className="text-[10px] sm:text-[11px] text-amber-300 font-semibold mt-0.5 truncate">Constant</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-snug line-clamp-2">
                      Continuous overload without de-load.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodization('3weeks')}
                    className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      periodization === '3weeks'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs text-white">3 Wks</div>
                    <div className="text-[10px] sm:text-[11px] text-amber-300 font-semibold mt-0.5 truncate">2 Build + 1 Easy</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-snug line-clamp-2">
                      Easy week every 3 weeks.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodization('4weeks')}
                    className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      periodization === '4weeks'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs text-white">4 Wks</div>
                    <div className="text-[10px] sm:text-[11px] text-amber-300 font-semibold mt-0.5 truncate">3 Build + 1 Easy</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-snug line-clamp-2">
                      3 progressive + 1 recovery.
                    </div>
                  </button>
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

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300">Outdoor Pace</label>
                    <span className="text-[10px] text-slate-500">10k / 1h</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="4:30"
                      value={paceOutdoorStr}
                      onChange={(e) => setPaceOutdoorStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">/km</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ~{(3600 / parseMinSecToSeconds(paceOutdoorStr, 270)).toFixed(1)} km/h
                  </span>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300">Treadmill Pace</label>
                    <span className="text-[10px] text-slate-500">Indoor</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="4:45"
                      value={paceTreadmillStr}
                      onChange={(e) => setPaceTreadmillStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">/km</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ~{(3600 / parseMinSecToSeconds(paceTreadmillStr, 285)).toFixed(1)} km/h
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

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300">Bike FTP</label>
                    <span className="text-[10px] text-slate-500">1h power</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="50"
                      max="600"
                      value={bikeFtp}
                      onChange={(e) => setBikeFtp(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">W</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {(bikeFtp / (weightKg || 75)).toFixed(2)} W/kg
                  </span>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-rose-300">Cycling LTHR</label>
                    <span className="text-[10px] text-slate-500">Threshold</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="100"
                      max="220"
                      value={thresholdHeartRateBike}
                      onChange={(e) => setThresholdHeartRateBike(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-500 font-mono">bpm</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ~5-8 bpm &lt; run LTHR
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
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Swim 100m TT</label>
                    <span className="text-[10px] text-slate-500">mm:ss</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="1:35"
                      value={swim100mStr}
                      onChange={(e) => setSwim100mStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">{t100} seconds</span>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Swim 400m TT</label>
                    <span className="text-[10px] text-slate-500">mm:ss</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="6:55"
                      value={swim400mStr}
                      onChange={(e) => setSwim400mStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
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
                  <span className="text-base sm:text-lg font-black font-mono text-sky-300">
                    {liveCss.cssPaceFormatted}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">/100m threshold</span>
                </div>
              </div>

              {/* Individual Sport Paces */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Pool Pace</label>
                    <span className="text-[10px] text-slate-500">Default</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="1:30"
                      value={swimPoolPaceStr}
                      onChange={(e) => setSwimPoolPaceStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">/100m</span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300">Open Water</label>
                    <span className="text-[10px] text-slate-500">Default</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="1:38"
                      value={swimOpenWaterPaceStr}
                      onChange={(e) => setSwimOpenWaterPaceStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">/100m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ZONES PREVIEW */}
          {activeTab === 'zones' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Heart rate zones dynamically computed using the <strong>Karvonen Formula</strong> (Heart Rate Reserve) based on your Max HR ({maxHeartRate} bpm) and Resting HR ({restingHeartRate} bpm).
                </p>
              </div>

              {/* Running HR Zones */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Running HR Zones (Karvonen)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Max {maxHeartRate} bpm</span>
                </div>

                <div className="space-y-1.5">
                  {previewRunZones.map((z) => (
                    <div
                      key={z.zone}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: z.color }}
                          className="w-6 h-6 rounded-lg text-slate-950 font-black text-xs flex items-center justify-center shrink-0"
                        >
                          Z{z.zone}
                        </span>
                        <div>
                          <span className="font-bold text-white mr-1.5">{z.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{z.description}</span>
                        </div>
                      </div>

                      <div className="text-right font-mono font-bold text-slate-200">
                        <span>{z.minHr} - {z.maxHr} bpm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cycling Power Zones (Coggan 7-Zone) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Cycling Power Zones (FTP {bikeFtp}W)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Coggan Model</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Z1 Active Recovery</span>
                    <span className="font-bold font-mono text-slate-200">&lt; {Math.round(bikeFtp * 0.55)}W</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Z2 Endurance</span>
                    <span className="font-bold font-mono text-slate-200">{Math.round(bikeFtp * 0.55)} - {Math.round(bikeFtp * 0.75)}W</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Z3 Tempo</span>
                    <span className="font-bold font-mono text-slate-200">{Math.round(bikeFtp * 0.76)} - {Math.round(bikeFtp * 0.90)}W</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Z4 Threshold (FTP)</span>
                    <span className="font-bold font-mono text-amber-400">{Math.round(bikeFtp * 0.91)} - {Math.round(bikeFtp * 1.05)}W</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Z5 VO2 Max</span>
                    <span className="font-bold font-mono text-orange-400">{Math.round(bikeFtp * 1.06)} - {Math.round(bikeFtp * 1.20)}W</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Z6 Anaerobic</span>
                    <span className="font-bold font-mono text-rose-400">&gt; {Math.round(bikeFtp * 1.20)}W</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={activeTab === 'settings' ? onClose : handleReset}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {activeTab === 'settings' ? (
              <span>Close</span>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {activeTab === 'settings' ? 'Done' : 'Cancel'}
            </button>

            {/* Save Physiology Button: Grey if nothing changed; colors when edited; returns to grey after saving */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty && !savedFeedback}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                savedFeedback
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : isDirty
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/80 cursor-not-allowed opacity-75'
              }`}
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
