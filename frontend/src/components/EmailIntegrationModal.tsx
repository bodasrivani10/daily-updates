import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Mail,
  X,
  Shield,
  Key,
  Inbox
} from 'lucide-react';
import { api } from '../services/api';

interface EmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProvider?: 'outlook' | 'gmail';
  onSyncComplete?: () => void;
}

export const EmailIntegrationModal: React.FC<EmailIntegrationModalProps> = ({
  isOpen,
  onClose,
  initialProvider = 'outlook',
  onSyncComplete,
}) => {
  const [provider, setProvider] = useState<'outlook' | 'gmail'>(initialProvider);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'oauth' | 'token' | 'sync'>('oauth');

  // Manual token input state
  const [emailInput, setEmailInput] = useState('');
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [folderInput, setFolderInput] = useState('Inbox');
  const [clientIdInput, setClientIdInput] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProvider(initialProvider);
      loadConfig();
    }
  }, [isOpen, initialProvider]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const conf = await api.getEmailConfig();
      setConfig(conf);
      const currentService = conf[provider];
      if (currentService?.is_connected) {
        setActiveTab('sync');
      }
    } catch (err: any) {
      console.error('Failed to load email config', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentConfig = config ? config[provider] : null;

  const handleRedirectToOAuth = () => {
    const authUrl =
      provider === 'outlook'
        ? api.getOutlookAuthUrl(clientIdInput.trim() || undefined)
        : api.getGmailAuthUrl(clientIdInput.trim() || undefined);

    window.location.href = authUrl;
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !accessTokenInput.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please fill in both Email Address and Token' });
      return;
    }

    try {
      setLoading(true);
      setFeedbackMsg(null);
      const res = await api.connectEmailManual({
        service: provider,
        email: emailInput.trim(),
        access_token: accessTokenInput.trim(),
        folder: folderInput.trim(),
      });
      setFeedbackMsg({ type: 'success', text: res.message || 'Connected successfully!' });
      await loadConfig();
      setActiveTab('sync');
      onSyncComplete && onSyncComplete();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to authenticate email account' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMessages = async () => {
    try {
      setLoading(true);
      setFeedbackMsg(null);
      const res = await api.syncEmailMessages(provider);
      setFeedbackMsg({ type: 'success', text: res.message || 'Emails ingested into pipeline!' });
      onSyncComplete && onSyncComplete();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to sync emails' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${provider.toUpperCase()}?`)) return;
    try {
      setLoading(true);
      await api.disconnectEmail(provider);
      setFeedbackMsg({ type: 'success', text: `${provider.toUpperCase()} disconnected.` });
      await loadConfig();
      setActiveTab('oauth');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isOutlook = provider === 'outlook';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            isOutlook
              ? 'bg-gradient-to-r from-sky-700 via-blue-800 to-slate-900'
              : 'bg-gradient-to-r from-rose-600 via-red-700 to-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-xl font-bold shadow-sm">
              {isOutlook ? '📧' : '✉️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  {isOutlook ? 'Microsoft Outlook Integration' : 'Google Gmail Integration'}
                </h3>
                {currentConfig?.is_connected ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                    Setup Required
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80">
                {isOutlook
                  ? 'Connect Office 365 / Outlook mailbox to sync sprint & standup threads'
                  : 'Connect Google Workspace or Gmail to sync daily reports and task logs'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Switcher Bar */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1.5 gap-1.5">
          <button
            onClick={() => {
              setProvider('outlook');
              setFeedbackMsg(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              isOutlook
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>📧 Microsoft Outlook</span>
            {config?.outlook?.is_connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
          <button
            onClick={() => {
              setProvider('gmail');
              setFeedbackMsg(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              !isOutlook
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>✉️ Google Gmail</span>
            {config?.gmail?.is_connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeTab === 'oauth'
                ? isOutlook
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-rose-600 text-rose-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Authorize via OAuth API
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeTab === 'token'
                ? isOutlook
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-rose-600 text-rose-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Direct Token / Access Key
          </button>
          {currentConfig?.is_connected && (
            <button
              onClick={() => setActiveTab('sync')}
              className={`flex-1 py-3 text-center transition border-b-2 ${
                activeTab === 'sync'
                  ? isOutlook
                    ? 'border-sky-600 text-sky-700 bg-white'
                    : 'border-rose-600 text-rose-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              3. Live Ingestion Sync
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Notification Feedback */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* TAB 1: OAuth Redirect Flow */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border text-slate-700 space-y-2 ${
                  isOutlook
                    ? 'bg-sky-50/70 border-sky-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-bold text-sm ${
                    isOutlook ? 'text-sky-900' : 'text-rose-900'
                  }`}
                >
                  <span>
                    {isOutlook
                      ? '🚀 Instant Microsoft Azure OAuth Login'
                      : '🚀 Instant Google Cloud OAuth Login'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Clicking the button below redirects your browser directly to{' '}
                  <strong>{isOutlook ? 'Microsoft Login' : 'Google Accounts'}</strong>. Once approved,
                  it returns you to VELO with secured mailbox access to sync standup updates.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Client ID (Optional if configured in backend .env)
                </label>
                <input
                  type="text"
                  placeholder={
                    isOutlook
                      ? 'Azure Application (Client) ID'
                      : 'Google OAuth Client ID (apps.googleusercontent.com)'
                  }
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRedirectToOAuth}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-white rounded-xl text-sm font-bold shadow-md transition hover:scale-[1.01] active:scale-95 ${
                    isOutlook
                      ? 'bg-sky-700 hover:bg-sky-800 shadow-sky-600/30'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {isOutlook
                      ? 'Redirect & Connect with Microsoft Outlook'
                      : 'Redirect & Connect with Google Mail'}
                  </span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                {isOutlook ? (
                  <span>
                    Manage Azure App registrations in{' '}
                    <a
                      href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 underline"
                    >
                      Azure Portal
                    </a>
                  </span>
                ) : (
                  <span>
                    Manage Google Cloud APIs in{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-600 underline"
                    >
                      Google Cloud Console
                    </a>
                  </span>
                )}
              </p>
            </div>
          )}

          {/* TAB 2: Direct Token / Manual Auth */}
          {activeTab === 'token' && (
            <form onSubmit={handleManualConnect} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Direct Mailbox Authentication:</div>
                <div>
                  Enter your email address and OAuth Bearer Access Token or App-Specific Token to
                  connect without running external browser redirects.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder={
                    isOutlook ? 'colleague@company.onmicrosoft.com' : 'employee@gmail.com'
                  }
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Access Token / App Key <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Bearer eyJ0eXAi... or App Password"
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Folder / Label
                </label>
                <input
                  type="text"
                  placeholder={isOutlook ? 'Inbox / Daily Standups' : 'INBOX / Project Updates'}
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm ${
                  isOutlook ? 'bg-sky-600 hover:bg-sky-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Validate & Link Mailbox</span>
              </button>
            </form>
          )}

          {/* TAB 3: Live Ingestion Sync */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Connected Account</div>
                  <div className="font-bold text-sm text-slate-800">
                    {currentConfig?.email_address || 'Connected Mailbox'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Folder: {isOutlook ? currentConfig?.selected_folder : currentConfig?.selected_label}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSyncMessages}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    Sync {provider.toUpperCase()} Updates & Run 7-Stage Pipeline
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Deterministic Mail Ingestion Pipeline</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
