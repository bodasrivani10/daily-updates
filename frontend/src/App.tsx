import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CitationModal } from './components/CitationModal';
import { AIAgentCopilotModal } from './components/AIAgentCopilotModal';
import { SlackIntegrationModal } from './components/SlackIntegrationModal';
import { EmailIntegrationModal } from './components/EmailIntegrationModal';
import { LoginPage } from './pages/LoginPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { DirectorDashboard } from './pages/DirectorDashboard';
import { DuplicatesBlockersManager } from './pages/DuplicatesBlockersManager';
import { WorkItemsPage } from './pages/WorkItemsPage';
import { WorkItemDetailPage } from './pages/WorkItemDetailPage';
import { ConflictsBlockersPage } from './pages/ConflictsBlockersPage';
import { DigestPage } from './pages/DigestPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { api, setActiveUserId, getActiveUserId } from './services/api';
import { UserProfile } from './types';

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard-employee');
  const [activeRole, setActiveRole] = useState<string>('employee');
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [citationSourceId, setCitationSourceId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());

  // Slack Integration Modal state
  const [showSlackModal, setShowSlackModal] = useState<boolean>(false);

  // Email (Outlook & Gmail) Modal state
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailProvider, setEmailProvider] = useState<'outlook' | 'gmail'>('outlook');

  // AI Agent Copilot state
  const [showAIAgent, setShowAIAgent] = useState<boolean>(false);
  const [aiAgentPrompt, setAiAgentPrompt] = useState<string>('');

  const triggerRefresh = () => {
    setRefreshTrigger(Date.now());
  };

  const loadUserData = async () => {
    try {
      const users = await api.getAllUsers();
      setAllUsers(users);
      const activeId = getActiveUserId();
      const matched = users.find((u) => u.id === activeId) || users[0];
      if (matched) {
        setCurrentUser(matched);
        setActiveRole(matched.role);
        if (matched.role === 'employee') setActiveTab('dashboard-employee');
        else if (matched.role === 'manager') setActiveTab('dashboard-manager');
        else setActiveTab('dashboard-director');
      }
    } catch (err) {
      console.error('Failed to load user profile on startup:', err);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleLogin = (userId: number) => {
    setActiveUserId(userId);
    const matched = allUsers.find((u) => u.id === userId);
    if (matched) {
      setCurrentUser(matched);
      setActiveRole(matched.role);
      setIsLoggedIn(true);
      if (matched.role === 'employee') setActiveTab('dashboard-employee');
      else if (matched.role === 'manager') setActiveTab('dashboard-manager');
      else setActiveTab('dashboard-director');
      triggerRefresh();
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleOpenAIAgent = (prompt: string) => {
    setAiAgentPrompt(prompt);
    setShowAIAgent(true);
  };

  const handleNavigate = (tab: string, itemDetailId?: string) => {
    setActiveTab(tab);
    if (itemDetailId) {
      setSelectedWorkItemId(itemDetailId);
    } else if (tab === 'work-items') {
      setSelectedWorkItemId(null);
    }
  };

  // If logged out, render the role-based Sign In page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
        <LoginPage
          users={allUsers}
          onLogin={handleLogin}
          onUserRegistered={async (newUser) => {
            await loadUserData();
            handleLogin(newUser.id);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Side Navigation Bar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'work-items') setSelectedWorkItemId(null);
        }}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAIAgent={handleOpenAIAgent}
        onOpenSlack={() => setShowSlackModal(true)}
        onOpenEmail={(prov) => {
          setEmailProvider(prov);
          setShowEmailModal(true);
        }}
        onRefreshData={triggerRefresh}
      />

      {/* Main Content Area (offset by left sidebar width on desktop) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0 transition-all duration-300">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Dashboard 1: Employee Dashboard */}
          {activeTab === 'dashboard-employee' && (
            <EmployeeDashboard
              onNavigate={handleNavigate}
              onOpenCitation={(sid) => setCitationSourceId(sid)}
              refreshTrigger={refreshTrigger}
              onOpenAIAgent={handleOpenAIAgent}
              onOpenSlack={() => setShowSlackModal(true)}
              onOpenEmail={(prov) => {
                setEmailProvider(prov);
                setShowEmailModal(true);
              }}
            />
          )}

        {/* Dashboard 2: Manager / Team Lead Dashboard */}
        {activeTab === 'dashboard-manager' && (
          <ManagerDashboard
            onNavigate={handleNavigate}
            onOpenCitation={(sid) => setCitationSourceId(sid)}
            refreshTrigger={refreshTrigger}
            onOpenAIAgent={handleOpenAIAgent}
          />
        )}

        {/* Dashboard 3: Director / CEO Dashboard */}
        {activeTab === 'dashboard-director' && (
          <DirectorDashboard
            onNavigate={handleNavigate}
            onOpenCitation={(sid) => setCitationSourceId(sid)}
            refreshTrigger={refreshTrigger}
            onOpenAIAgent={handleOpenAIAgent}
          />
        )}

        {/* Task Summarization View (Replaces file upload) */}
        {activeTab === 'digest' && (
          <DigestPage
            onOpenCitation={(sid) => setCitationSourceId(sid)}
            onSelectWorkItem={(id) => handleNavigate('work-items', id)}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Clear Duplicates & Blockers Manager */}
        {activeTab === 'duplicates-blockers' && (
          <DuplicatesBlockersManager
            onOpenCitation={(sid) => setCitationSourceId(sid)}
            onRefreshData={triggerRefresh}
            onOpenAIAgent={handleOpenAIAgent}
          />
        )}

        {/* Work Items Master Feed */}
        {activeTab === 'work-items' && !selectedWorkItemId && (
          <WorkItemsPage
            onSelectWorkItem={(id) => setSelectedWorkItemId(id)}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Work Item Detail */}
        {activeTab === 'work-items' && selectedWorkItemId && (
          <WorkItemDetailPage
            itemId={selectedWorkItemId}
            onBack={() => setSelectedWorkItemId(null)}
            onOpenCitation={(sid) => setCitationSourceId(sid)}
            onSelectWorkItem={(id) => setSelectedWorkItemId(id)}
          />
        )}

        {/* Verification & System Benchmarks */}
        {activeTab === 'evaluation' && (
          <EvaluationPage />
        )}
      </main>

      {/* Citation Popover Modal */}
      <CitationModal
        sourceId={citationSourceId}
        onClose={() => setCitationSourceId(null)}
        onSelectWorkItem={(id) => handleNavigate('work-items', id)}
      />

      {/* AI Intelligence Agent Copilot Modal */}
      <AIAgentCopilotModal
        isOpen={showAIAgent}
        onClose={() => setShowAIAgent(false)}
        initialQuery={aiAgentPrompt}
      />

      {/* Slack API Workspace Modal */}
      <SlackIntegrationModal
        isOpen={showSlackModal}
        onClose={() => setShowSlackModal(false)}
        onSyncComplete={() => triggerRefresh()}
      />

      {/* Email (Outlook & Gmail) Integration Modal */}
      <EmailIntegrationModal
        isOpen={showEmailModal}
        initialProvider={emailProvider}
        onClose={() => setShowEmailModal(false)}
        onSyncComplete={() => triggerRefresh()}
      />

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight">VELO</span>
              <span>•</span>
              <span>AI Workspace & Team Intelligence</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Slack / Outlook / Gmail Linked</span>
              <span>•</span>
              <span>SQLite Robust Storage</span>
              <span>•</span>
              <span>AI Copilot Triage</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
