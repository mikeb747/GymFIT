import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Sun,
  Moon,
  Pencil,
  RotateCcw,
  Check,
  Sliders,
  User,
  Heart,
  ChevronRight,
} from 'lucide-react';

export type DisplayDensity = 'standard' | 'compact' | 'comfortable';
export type AppTheme = 'dark' | 'light';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: AppTheme;
  onThemeChanged: (theme: AppTheme) => void;
  displayDensity: DisplayDensity;
  onDensityChanged: (density: DisplayDensity) => void;
  brandTitle: string;
  brandSubtitle: string;
  onSaveBrand: (title: string, subtitle: string) => void;
  onResetBrand: () => void;
  heroEyebrow?: string;
  heroHeading?: string;
  heroDescription?: string;
  onSaveHeroText?: (eyebrow: string, heading: string, description: string) => void;
  onResetHeroText?: () => void;
  onOpenAthleteProfile?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChanged,
  displayDensity,
  onDensityChanged,
  brandTitle,
  brandSubtitle,
  onSaveBrand,
  onResetBrand,
  heroEyebrow = 'LOG · PUBLISH · REPEAT',
  heroHeading = 'Ready to Train?',
  heroDescription = 'Log every set as you train, starting from last session’s weights. Finished sessions automatically compile into valid FIT files with native sets and reps.',
  onSaveHeroText,
  onResetHeroText,
  onOpenAthleteProfile,
}) => {
  const [tempTitle, setTempTitle] = useState(brandTitle);
  const [tempSubtitle, setTempSubtitle] = useState(brandSubtitle);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandSavedFeedback, setBrandSavedFeedback] = useState(false);

  // Hero / Studio Text Customization
  const [tempHeroEyebrow, setTempHeroEyebrow] = useState(heroEyebrow);
  const [tempHeroHeading, setTempHeroHeading] = useState(heroHeading);
  const [tempHeroDescription, setTempHeroDescription] = useState(heroDescription);
  const [isEditingHeroText, setIsEditingHeroText] = useState(false);
  const [heroSavedFeedback, setHeroSavedFeedback] = useState(false);

  // Synchronize internal state when modal opens or props change
  React.useEffect(() => {
    setTempTitle(brandTitle);
    setTempSubtitle(brandSubtitle);
    setTempHeroEyebrow(heroEyebrow);
    setTempHeroHeading(heroHeading);
    setTempHeroDescription(heroDescription);
  }, [brandTitle, brandSubtitle, heroEyebrow, heroHeading, heroDescription, isOpen]);

  if (!isOpen) return null;

  const handleSaveBrandCustomization = () => {
    const finalTitle = tempTitle.trim() || 'GymFIT';
    const finalSub = tempSubtitle.trim() || 'Workout Log & Strava Uploader';
    onSaveBrand(finalTitle, finalSub);
    setIsEditingBrand(false);
    setBrandSavedFeedback(true);
    setTimeout(() => setBrandSavedFeedback(false), 2000);
  };

  const handleResetBrandDefaults = () => {
    onResetBrand();
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
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header with Title and Version at the Top */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sliders className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="settings-modal-title" className="text-lg font-black text-white tracking-tight">
                  Settings
                </h2>
                <span className="font-mono text-amber-400 font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-xs">
                  v1.1.5
                </span>
              </div>
              <p className="text-xs text-slate-400">Appearance, display scaling & preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Light / Dark Mode Switch */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                Theme / Appearance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between high-contrast dark and light modes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onThemeChanged('dark')}
              className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Moon className="w-4 h-4 text-amber-400" />
              <span>Dark Mode</span>
              {theme === 'dark' && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
            </button>

            <button
              type="button"
              onClick={() => onThemeChanged('light')}
              className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
              {theme === 'light' && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
            </button>
          </div>
        </section>

        {/* 2. Display Density & Screen Scaling */}
        <section className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                Display Density & UI Scaling
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Optimize interface size for high-DPI Android devices
              </p>
            </div>
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onDensityChanged('compact')}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
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
              onClick={() => onDensityChanged('standard')}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
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
              onClick={() => onDensityChanged('comfortable')}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                displayDensity === 'comfortable'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-md shadow-amber-500/10'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="font-bold">Spacious</span>
              <span className="text-[10px] text-slate-500 font-mono">115%</span>
            </button>
          </div>
        </section>

        {/* 3. App Name & Custom Branding */}
        <section className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                App Title & Branding
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
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
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  App Title
                </label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="e.g. GymFIT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 font-bold"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
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
        </section>

        {/* 4. Customize Studio Text (Directly below App Title & Branding) */}
        <section className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                Customize Studio Text
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Headline and description text for your workout dashboard
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
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Eyebrow Label
                </label>
                <input
                  type="text"
                  value={tempHeroEyebrow}
                  onChange={(e) => setTempHeroEyebrow(e.target.value)}
                  placeholder="e.g. LOG · PUBLISH · REPEAT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-amber-400"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-bold focus:outline-none focus:border-amber-400"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
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
        </section>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
