import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Hash,
  Send,
  HelpCircle,
  Layers,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const SlackIntegrationModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'oauth' | 'token' | 'sync'>('oauth');

  // Manual token input state
  const [botToken, setBotToken] = useState('');
  const [defaultChannel, setDefaultChannel] = useState('#daily-standup');
  const [clientIdInput, setClientIdInput] = useState('');

  // Channels state
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const conf = await api.getSlackConfig();
      setConfig(conf);
      if (conf.is_connected) {
        setActiveTab('sync');
        loadChannels();
      }
    } catch (err: any) {
      console.error('Failed to load Slack config', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const data = await api.getSlackChannels();
      setChannels(data.channels || []);
      if (data.channels && data.channels.length > 0) {
        setSelectedChannel(data.channels[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  // Direct redirection to Slack OAuth
  const handleRedirectToSlack = () => {
    const authUrl = api.getSlackAuthUrl(clientIdInput.trim() || undefined);
    // Redirect browser to Slack OAuth consent screen
    window.location.href = authUrl;
  };

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter your Slack Bot User OAuth Token (starts with xoxb-)' });
      return;
    }
    try {
      setLoading(true);
      setFeedbackMsg(null);
      const res = await api.connectSlackToken(botToken.trim(), defaultChannel.trim());
      setFeedbackMsg({ type: 'success', text: res.message || 'Connected to Slack successfully!' });
      await loadConfig();
      onSyncComplete && onSyncComplete();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to authenticate with Slack token' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMessages = async () => {
    try {
      setLoading(true);
      setFeedbackMsg(null);
      const res = await api.syncSlackMessages(selectedChannel || undefined);
      setFeedbackMsg({ type: 'success', text: res.message || 'Messages ingested and processed!' });
      onSyncComplete && onSyncComplete();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to pull messages from Slack' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Slack workspace?')) return;
    try {
      setLoading(true);
      await api.disconnectSlack();
      setFeedbackMsg({ type: 'success', text: 'Slack workspace disconnected.' });
      await loadConfig();
      setActiveTab('oauth');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-xl font-bold shadow-sm">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Slack Workspace Integration</h3>
                {config?.is_connected ? (
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
              <p className="text-xs text-purple-200">
                Authorize via OAuth API to ingest updates and sync daily standup threads
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

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeTab === 'oauth'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Authorize via Slack OAuth
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeTab === 'token'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Direct Bot Token (xoxb-)
          </button>
          {config?.is_connected && (
            <button
              onClick={() => setActiveTab('sync')}
              className={`flex-1 py-3 text-center transition border-b-2 ${
                activeTab === 'sync'
                  ? 'border-indigo-600 text-indigo-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              3. Live Message Sync
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
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-900">
                  <span>🚀 Instant Slack OAuth Redirection</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Clicking the button below redirects your browser directly to Slack's authorization screen.
                  Once you approve, Slack automatically returns you to VELO with full read and channel permissions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Slack Client ID (Optional if set in backend .env)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789.987654321"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRedirectToSlack}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-600/30 transition hover:scale-[1.01] active:scale-95"
                >
                  <img
                    src="https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png"
                    alt="Slack"
                    className="w-4 h-4 object-contain"
                  />
                  <span>Redirect & Connect with Slack</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Need to create a Slack app?{' '}
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 underline hover:text-indigo-800"
                >
                  Visit api.slack.com/apps
                </a>
              </p>
            </div>
          )}

          {/* TAB 2: Direct Bot Token (xoxb-) */}
          {activeTab === 'token' && (
            <form onSubmit={handleConnectToken} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Direct Bot Token Authentication:</div>
                <div>
                  Enter your Slack workspace Bot User OAuth Token from{' '}
                  <strong className="text-slate-800">OAuth & Permissions</strong> tab in your Slack App console.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bot User OAuth Token <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="xoxb-your-slack-bot-token"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Standup Channel
                </label>
                <input
                  type="text"
                  placeholder="#daily-standup"
                  value={defaultChannel}
                  onChange={(e) => setDefaultChannel(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Validate & Link Bot Token</span>
              </button>
            </form>
          )}

          {/* TAB 3: Live Message Sync */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Connected Workspace</div>
                  <div className="font-bold text-sm text-slate-800">
                    {config?.team_name || 'Slack Workspace'}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Channel to Ingest
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSyncMessages}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Sync Channel Updates & Run 7-Stage AI Pipeline</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Deterministic Ingestion Pipeline</span>
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
