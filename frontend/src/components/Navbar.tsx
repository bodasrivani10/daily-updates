import React, { useState, useEffect } from 'react';
import {
  Activity,
  UploadCloud,
  Layers,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Database,
  RefreshCw,
  UserCheck,
  Shield,
  Briefcase,
  Users,
  LogOut,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react';
import { api, setActiveUserId, getActiveUserId } from '../services/api';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeRole: string; // 'employee' | 'manager' | 'director_ceo'
  setActiveRole: (role: string) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenAIAgent: (prompt: string) => void;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  currentUser,
  onLogout,
  onOpenAIAgent,
  onRefreshData,
}) => {
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

  // Role-appropriate Navigation Items
  const navItems = [
    // 1. Role Dashboard
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

    // 2. Task Summarization
    { id: 'digest', label: 'Progress Summarization', icon: FileText },

    // 3. Clear Duplicates & Blockers
    { id: 'duplicates-blockers', label: 'Clear Duplicates & Blockers', icon: Trash2 },

    // 4. Work Items Master
    { id: 'work-items', label: 'Work Items', icon: Layers },

    // 5. Verification Benchmarks
    { id: 'evaluation', label: 'System Benchmarks', icon: CheckCircle2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => {
              if (activeRole === 'employee') setActiveTab('dashboard-employee');
              else if (activeRole === 'manager') setActiveTab('dashboard-manager');
              else setActiveTab('dashboard-director');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-10 px-2 rounded-xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-center shadow-lg group-hover:border-indigo-500/50 transition">
              <img
                src="/velo_logo.png"
                alt="VELO Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                  VELO
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-400/30">
                  Workspace
                </span>
              </div>
              <p className="text-[10px] text-slate-400">AI Task & Team Intelligence</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: AI Agent Copilot Button, User Badge & Logout */}
          <div className="flex items-center gap-2.5">
            {/* AI Copilot Trigger */}
            <button
              onClick={() => onOpenAIAgent('Summarize current team progress and highlight blockers')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-md shadow-indigo-500/20 active:scale-95"
              title="Open AI Intelligence Agent Copilot"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Agent Copilot</span>
            </button>

            {/* Quick Starter Loader */}
            <button
              onClick={handleLoadStarter}
              disabled={loadingStarter}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg transition-all shadow-xs disabled:opacity-50"
              title="Reload starter fixtures & seeded critical facts"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loadingStarter ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">Reset Fixtures</span>
            </button>

            {/* User Profile Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <div className="text-right">
                  <div className="text-white font-bold leading-tight flex items-center gap-1">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-indigo-400 bg-indigo-950 px-1.5 py-0.2 rounded">
                      {currentUser.role === 'director_ceo' ? 'Director' : currentUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{currentUser.department}</div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition"
                  title="Sign out of current account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="lg:hidden flex items-center justify-start overflow-x-auto py-2 border-t border-slate-800 gap-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 text-center font-medium animate-in slide-in-from-top">
          ✓ {successToast}
        </div>
      )}
    </header>
  );
};
