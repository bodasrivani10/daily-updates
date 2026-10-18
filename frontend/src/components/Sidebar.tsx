import React, { useState } from 'react';
import {
  Layers,
  FileText,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Shield,
  Users,
  LogOut,
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeRole: string;
  setActiveRole: (role: string) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenAIAgent: (prompt: string) => void;
  onOpenSlack?: () => void;
  onOpenEmail?: (provider: 'outlook' | 'gmail') => void;
  onRefreshData?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  currentUser,
  onLogout,
  onOpenAIAgent,
  onOpenSlack,
  onOpenEmail,
  onRefreshData,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loadingStarter, setLoadingStarter] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleLoadStarter = async () => {
    try {
      setLoadingStarter(true);
      const res = await api.loadStarterFixtures();
      setSuccessToast(`Loaded ${res.message || 'starter fixture'}`);
      onRefreshData && onRefreshData();
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(`Error loading starter dataset: ${err.message}`);
    } finally {
      setLoadingStarter(false);
    }
  };

  const navItems = [
    {
      id:
        activeRole === 'employee'
          ? 'dashboard-employee'
          : activeRole === 'manager'
          ? 'dashboard-manager'
          : 'dashboard-director',
      label:
        activeRole === 'employee'
          ? 'My Tasks & Feed'
          : activeRole === 'manager'
          ? 'Team Management'
          : 'Executive Overview',
      icon: activeRole === 'employee' ? UserCheck : activeRole === 'manager' ? Users : Shield,
    },
    { id: 'digest', label: 'Progress Summarization', icon: FileText },
    { id: 'duplicates-blockers', label: 'Clear Duplicates & Blockers', icon: Trash2 },
    { id: 'work-items', label: 'Work Items Master', icon: Layers },
    { id: 'evaluation', label: 'System Benchmarks', icon: CheckCircle2 },
  ];

  return (
    <>
      {/* Mobile Top Header (only visible on small screens) */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              VELO
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-400/30">
              Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenAIAgent('Summarize current team progress and highlight blockers')}
            className="p-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          {currentUser && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-all duration-300 shadow-2xl ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!collapsed ? (
            <div
              onClick={() => {
                if (activeRole === 'employee') setActiveTab('dashboard-employee');
                else if (activeRole === 'manager') setActiveTab('dashboard-manager');
                else setActiveTab('dashboard-director');
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="h-9 px-2 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shadow-lg group-hover:border-indigo-500/50 transition">
                <img src="/velo_logo.png" alt="VELO Logo" className="h-7 w-auto object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                    VELO
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-400/30">
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">Team Intelligence</p>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setCollapsed(false)}
              className="mx-auto h-9 w-9 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-indigo-500 transition"
              title="Expand Sidebar"
            >
              <img src="/velo_logo.png" alt="VELO Logo" className="h-6 w-auto object-contain" />
            </div>
          )}

          {/* Collapse/Expand Toggle on Desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* AI Copilot Action Hero Card */}
        <div className="p-3">
          <button
            onClick={() => {
              onOpenAIAgent('Summarize current team progress and highlight blockers');
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 p-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-95 ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
            title="Open AI Intelligence Agent Copilot"
          >
            <Sparkles className="w-4 h-4 shrink-0 animate-pulse text-amber-300" />
            {!collapsed && (
              <div className="text-left leading-tight">
                <div className="text-xs font-bold tracking-tight">AI Agent Copilot</div>
                <div className="text-[10px] text-indigo-200">Interactive Triage</div>
              </div>
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
          <div className={`px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${collapsed ? 'hidden' : 'block'}`}>
            Core Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Integrations Header */}
          <div className={`pt-4 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${collapsed ? 'hidden' : 'block'}`}>
            Channel Integrations
          </div>

          {/* Slack Integration */}
          <button
            onClick={() => {
              onOpenSlack && onOpenSlack();
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950/60 hover:bg-[#4A154B]/50 border border-slate-800 hover:border-purple-400/40 text-purple-200 transition ${
              collapsed ? 'justify-center px-2' : ''
            }`}
            title="Slack API & Standup Ingestion"
          >
            <img
              src="https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png"
              alt="Slack"
              className="w-4 h-4 object-contain shrink-0"
            />
            {!collapsed && <span className="truncate">Slack Workspace</span>}
          </button>

          {/* Outlook Integration */}
          <button
            onClick={() => {
              onOpenEmail && onOpenEmail('outlook');
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950/60 hover:bg-[#0078D4]/30 border border-slate-800 hover:border-sky-400/40 text-sky-200 transition ${
              collapsed ? 'justify-center px-2' : ''
            }`}
            title="Microsoft Outlook Mailbox"
          >
            <span className="text-sm shrink-0">📧</span>
            {!collapsed && <span className="truncate">Microsoft Outlook</span>}
          </button>

          {/* Gmail Integration */}
          <button
            onClick={() => {
              onOpenEmail && onOpenEmail('gmail');
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950/60 hover:bg-[#EA4335]/30 border border-slate-800 hover:border-rose-400/40 text-rose-200 transition ${
              collapsed ? 'justify-center px-2' : ''
            }`}
            title="Google Mail Ingestion"
          >
            <span className="text-sm shrink-0">✉️</span>
            {!collapsed && <span className="truncate">Google Gmail</span>}
          </button>
        </div>

        {/* Footer Quick Controls & User Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          {/* Reset Fixtures Button */}
          <button
            onClick={handleLoadStarter}
            disabled={loadingStarter}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition disabled:opacity-50 ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Reload initial seed fixtures"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 shrink-0 ${loadingStarter ? 'animate-spin' : ''}`} />
            {!collapsed && <span className="truncate">Reset Fixtures</span>}
          </button>

          {/* Current User Card */}
          {currentUser && (
            <div
              className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs ${
                collapsed ? 'justify-center' : 'justify-between'
              }`}
            >
              {!collapsed ? (
                <div className="overflow-hidden">
                  <div className="font-bold text-white truncate flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[9px] uppercase font-bold text-indigo-300 bg-indigo-950 px-1 py-0.2 rounded border border-indigo-800/50">
                      {currentUser.role === 'director_ceo' ? 'Director' : currentUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser.department}</div>
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {currentUser.name.charAt(0)}
                </div>
              )}

              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {successToast && (
          <div className="bg-emerald-600 text-white text-[11px] py-1 px-3 text-center font-medium">
            ✓ {successToast}
          </div>
        )}
      </aside>
    </>
  );
};
