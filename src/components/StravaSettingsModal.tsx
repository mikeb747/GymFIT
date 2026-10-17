import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Unplug,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { StravaIcon } from './StravaIcon';
import {
  buildStravaAuthUrl,
  getStravaRedirectUri,
  getEffectiveClientId,
  getEffectiveClientSecret,
  saveStravaCredentials,
  resetStravaCredentials,
  exchangeStravaCode,
  STRAVA_CONFIG,
} from '../utils/stravaOAuth';

interface StravaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stravaAccessToken: string | null;
  athleteName: string | null;
  onTokenUpdated: (token: string | null, athlete?: any) => void;
}

export const StravaSettingsModal: React.FC<StravaSettingsModalProps> = ({
  isOpen,
  onClose,
  stravaAccessToken,
  athleteName,
  onTokenUpdated,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Custom API credentials
  const [customClientId, setCustomClientId] = useState('');
  const [customClientSecret, setCustomClientSecret] = useState('');
  const [isSavedCreds, setIsSavedCreds] = useState(false);

  // Manual code paste fallback
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isExchangingManualCode, setIsExchangingManualCode] = useState(false);

  // Initialize custom credentials on open
  useEffect(() => {
    if (isOpen) {
      const storedId = localStorage.getItem(STRAVA_CONFIG.STORAGE_KEYS.CLIENT_ID) || '';
      const storedSecret = localStorage.getItem(STRAVA_CONFIG.STORAGE_KEYS.CLIENT_SECRET) || '';
      setCustomClientId(storedId);
      setCustomClientSecret(storedSecret);
      setAuthError(null);
    }
  }, [isOpen]);

  // Listen for OAuth message from the popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('github.io')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const payload = event.data.payload;
        if (payload?.access_token) {
          onTokenUpdated(payload.access_token, payload.athlete);
        } else if (payload?.code) {
          setAuthError('Received authorization code. Exchanging token with Strava...');
        }
        setIsConnecting(false);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setAuthError(event.data.error || 'Authorization failed');
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTokenUpdated]);

  if (!isOpen) return null;

  const currentRedirectUri = getStravaRedirectUri();
  // Authorization callback domain needed by Strava Settings (e.g. "mikeb747.github.io" or "localhost")
  const callbackDomain = typeof window !== 'undefined' ? window.location.hostname : 'mikeb747.github.io';
  const effectiveId = getEffectiveClientId();
  const hasCustomCreds = Boolean(
    localStorage.getItem(STRAVA_CONFIG.STORAGE_KEYS.CLIENT_ID) ||
    localStorage.getItem(STRAVA_CONFIG.STORAGE_KEYS.CLIENT_SECRET)
  );

  const handleConnectPopup = () => {
    setIsConnecting(true);
    setAuthError(null);

    try {
      const targetAuthUrl = buildStravaAuthUrl(effectiveId);
      // Open OAuth provider URL directly in popup
      const authWindow = window.open(
        targetAuthUrl,
        'strava_oauth_popup',
        'width=600,height=750,menubar=no,toolbar=no'
      );

      if (!authWindow) {
        setAuthError('Popup was blocked by your browser. You can allow popups, or authorize in this tab.');
        setIsConnecting(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Could not start Strava authentication');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onTokenUpdated(null, null);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveStravaCredentials(customClientId, customClientSecret);
    setIsSavedCreds(true);
    setTimeout(() => setIsSavedCreds(false), 2000);
  };

  const handleResetDefaults = () => {
    resetStravaCredentials();
    setCustomClientId('');
    setCustomClientSecret('');
    setIsSavedCreds(true);
    setTimeout(() => setIsSavedCreds(false), 2000);
  };

  const handleManualCodeExchange = async () => {
    const raw = manualCodeInput.trim();
    if (!raw) return;

    // Extract code whether the user pasted the entire redirect URL or just the code
    let code = raw;
    if (raw.includes('code=')) {
      try {
        const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        const parsedCode = url.searchParams.get('code');
        if (parsedCode) code = parsedCode;
      } catch {
        const match = raw.match(/code=([^&]+)/);
        if (match) code = match[1];
      }
    }

    setIsExchangingManualCode(true);
    setAuthError(null);
    try {
      const tokenData = await exchangeStravaCode(code);
      if (tokenData.access_token) {
        onTokenUpdated(tokenData.access_token, tokenData.athlete);
        setManualCodeInput('');
      } else {
        throw new Error('No access token returned from Strava.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Token exchange failed. The code may be expired or invalid.');
    } finally {
      setIsExchangingManualCode(false);
    }
  };

  const copyToClipboard = (text: string, type: 'domain' | 'uri') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'domain') {
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2000);
      } else {
        setCopiedUri(true);
        setTimeout(() => setCopiedUri(false), 2000);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <StravaIcon className="w-9 h-9" />
            <div>
              <h3 className="text-base font-bold text-white">Strava Integration</h3>
              <p className="text-xs text-slate-400">Direct cloud sync for weight training activities</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400">Status</div>
            <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              {stravaAccessToken ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-400">Connected as {athleteName || 'Strava Athlete'}</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-slate-400">Not Connected</span>
                </>
              )}
            </div>
          </div>

          {stravaAccessToken && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-rose-200">Strava Authorization Note</div>
              <div>{authError}</div>
            </div>
          </div>
        )}

        {/* OAuth Connect Action */}
        {!stravaAccessToken && (
          <div className="space-y-3">
            {/* Status Card */}
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-300">
                    {hasCustomCreds ? `Custom Client ID (${effectiveId}) Active` : `Client ID ${effectiveId} Ready`}
                  </div>
                  <div className="text-[11px] text-slate-400">1-click authorization via Strava OAuth</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ready
              </span>
            </div>

            {/* Authorize Button */}
            <button
              type="button"
              disabled={isConnecting}
              onClick={handleConnectPopup}
              className="w-full py-3.5 px-4 rounded-xl bg-[#FC5200] hover:bg-[#e04900] active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FC5200]/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isConnecting ? 'Waiting for Strava authorization...' : 'Authorize with Strava'}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Help: Strava API Configuration Guide */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Globe className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Strava API Callback Settings</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            In your Strava API settings (
            <a
              href="https://www.strava.com/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 underline hover:text-amber-300"
            >
              strava.com/settings/api
            </a>
            ), ensure the <strong className="text-white">Authorization Callback Domain</strong> is set to:
          </p>
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200">
            <span className="truncate">{callbackDomain}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(callbackDomain, 'domain')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
              title="Copy domain"
            >
              {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Redirect URL sent by GymFIT:</span>
            <button
              type="button"
              onClick={() => copyToClipboard(currentRedirectUri, 'uri')}
              className="text-amber-400/90 hover:text-amber-300 underline font-mono cursor-pointer"
            >
              {copiedUri ? 'Copied URL!' : currentRedirectUri}
            </button>
          </div>
        </div>

        {/* Manual Code / URL Paste Fallback */}
        {!stravaAccessToken && (
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="text-slate-300 font-bold flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Already have an authorization code or redirect URL?</span>
            </div>
            <p className="text-[11px] text-slate-400">
              If Strava redirected to a URL with <code className="text-amber-400 font-mono">?code=...</code>, paste it below to connect immediately:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="Paste code or https://.../?code=..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
              />
              <button
                type="button"
                disabled={!manualCodeInput.trim() || isExchangingManualCode}
                onClick={handleManualCodeExchange}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all cursor-pointer shrink-0"
              >
                {isExchangingManualCode ? 'Exchanging...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Advanced: Custom Client ID & Client Secret */}
        <div className="border-t border-slate-800 pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Strava API Credentials (Custom / Override)</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <form onSubmit={handleSaveCredentials} className="mt-3 space-y-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  placeholder={`Default: ${STRAVA_CONFIG.DEFAULT_CLIENT_ID}`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={customClientSecret}
                  onChange={(e) => setCustomClientSecret(e.target.value)}
                  placeholder="Paste Client Secret if using your own Strava App"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Reset Defaults
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {isSavedCreds ? 'Saved!' : 'Save Credentials'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
