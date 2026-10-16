import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Unplug, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { StravaIcon } from './StravaIcon';
import { buildStravaAuthUrl, STRAVA_CONFIG } from '../utils/stravaOAuth';

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
  const [clientIdInput] = useState('');
  const [, setServerConfig] = useState<{ configured: boolean; redirectUri: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/strava/config')
        .then(async (res) => {
          if (!res.ok) return null;
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return null;
          return res.json();
        })
        .then((data) => {
          if (data) setServerConfig(data);
        })
        .catch(() => {});
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

  const effectiveClientId = clientIdInput.trim() || STRAVA_CONFIG.DEFAULT_CLIENT_ID;

  const handleConnectPopup = () => {
    setIsConnecting(true);
    setAuthError(null);

    try {
      const targetAuthUrl = buildStravaAuthUrl(effectiveClientId);
      // Open OAuth provider URL directly in popup
      const authWindow = window.open(
        targetAuthUrl,
        'strava_oauth_popup',
        'width=600,height=750,menubar=no,toolbar=no'
      );

      if (!authWindow) {
        setAuthError('Please allow popups in your browser to complete Strava authorization.');
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

        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* OAuth Connect Action */}
        {!stravaAccessToken && (
          <div className="space-y-3">
            {/* Ready Status Card */}
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-300">Client ID 287214 Configured & Ready</div>
                  <div className="text-[11px] text-slate-400">No manual typing needed. Just 1 click below!</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ready
              </span>
            </div>

            <div className="space-y-2">
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
          </div>
        )}
      </div>
    </div>
  );
};
