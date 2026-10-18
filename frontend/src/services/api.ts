import {
  ImportBatchItem,
  WorkItemSummary,
  WorkItemDetail,
  ConflictItem,
  BlockerItem,
  DigestDetail,
  EvaluationReport,
  SourceMessageItem,
  UserProfile,
  ProjectItem,
  InvitationItem,
  RosterMember,
  FeedbackItem,
  AuditLogItem,
  EmployeeContributionMetric
} from '../types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

// Current active simulated user ID (stored in localStorage or in-memory)
let activeUserId = 1;

export const setActiveUserId = (userId: number) => {
  activeUserId = userId;
  localStorage.setItem('active_user_id', String(userId));
};

export const getActiveUserId = (): number => {
  const stored = localStorage.getItem('active_user_id');
  if (stored) return parseInt(stored, 10);
  return activeUserId;
};

const getAuthHeaders = (): Record<string, string> => {
  return {
    'X-User-Id': String(getActiveUserId()),
  };
};

export const api = {
  // User Management & RBAC
  async getAllUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${BASE_URL}/projects-teams/users`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getCurrentUser(): Promise<UserProfile> {
    const res = await fetch(`${BASE_URL}/projects-teams/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async registerUser(data: {
    name: string;
    username: string;
    email: string;
    role: string;
    department?: string;
  }): Promise<UserProfile> {
    const res = await fetch(`${BASE_URL}/projects-teams/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Projects
  async getProjects(): Promise<ProjectItem[]> {
    const res = await fetch(`${BASE_URL}/projects-teams/projects`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createProject(data: { id: string; name: string; description?: string; status?: string }): Promise<ProjectItem> {
    const res = await fetch(`${BASE_URL}/projects-teams/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Invitations
  async getInvitations(): Promise<InvitationItem[]> {
    const res = await fetch(`${BASE_URL}/projects-teams/invitations`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async sendInvitation(userId: number, projectId: string, roleInTeam: string = 'contributor'): Promise<InvitationItem> {
    const res = await fetch(`${BASE_URL}/projects-teams/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ user_id: userId, project_id: projectId, role_in_team: roleInTeam }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async respondInvitation(invitationId: number, action: 'accepted' | 'rejected'): Promise<InvitationItem> {
    const res = await fetch(`${BASE_URL}/projects-teams/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Manager Roster & Task Assignment
  async getManagerRoster(): Promise<RosterMember[]> {
    const res = await fetch(`${BASE_URL}/projects-teams/roster`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async assignTask(data: { work_item_id: string; title?: string; project_id: string; assignee_id: number; priority?: string; due_date?: string }): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects-teams/assign-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Feedback System
  async getFeedback(employeeId?: number): Promise<FeedbackItem[]> {
    const url = employeeId ? `${BASE_URL}/projects-teams/feedback?employee_id=${employeeId}` : `${BASE_URL}/projects-teams/feedback`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createFeedback(data: { employee_id: number; feedback_text: string; sentiment?: string; rating?: number; work_item_id?: string; project_id?: string }): Promise<FeedbackItem> {
    const res = await fetch(`${BASE_URL}/projects-teams/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch(`${BASE_URL}/projects-teams/audit-logs`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Global Employee Search (Director/CEO)
  async globalEmployeeSearch(query: string): Promise<EmployeeContributionMetric[]> {
    const res = await fetch(`${BASE_URL}/projects-teams/global-search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Imports & Batch Processing
  async uploadFile(file: File, userRole: string = 'lead'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_role', userRole);

    const res = await fetch(`${BASE_URL}/imports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async uploadJson(jsonString: string, userRole: string = 'lead'): Promise<any> {
    const formData = new FormData();
    formData.append('raw_json', jsonString);
    formData.append('user_role', userRole);

    const res = await fetch(`${BASE_URL}/imports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async loadStarterFixtures(): Promise<any> {
    const res = await fetch(`${BASE_URL}/imports/load-starter`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getImports(): Promise<ImportBatchItem[]> {
    const res = await fetch(`${BASE_URL}/imports`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getImportDetail(id: string): Promise<ImportBatchItem> {
    const res = await fetch(`${BASE_URL}/imports/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Work Items
  async getWorkItems(status?: string, projectId?: string): Promise<WorkItemSummary[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (projectId) params.append('project_id', projectId);

    const res = await fetch(`${BASE_URL}/work-items?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getWorkItemDetail(id: string): Promise<WorkItemDetail> {
    const res = await fetch(`${BASE_URL}/work-items/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateWorkItemStatus(id: string, status: string, notes?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/work-items/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async submitTaskSummary(data: {
    work_item_id: string;
    summary_text: string;
    source_system?: string;
  }): Promise<any> {
    const user = await this.getCurrentUser();
    const sourceId = `msg-${Date.now()}`;
    const payload = [
      {
        source_id: sourceId,
        timestamp: new Date().toISOString(),
        author: user.name || user.username,
        work_item_id: data.work_item_id,
        text: data.summary_text,
        visibility: 'team',
        source_system: data.source_system || 'manual_summary',
      },
    ];
    return this.uploadJson(JSON.stringify(payload), user.role === 'employee' ? 'contributor' : 'lead');
  },

  // Conflicts
  async getConflicts(status?: string): Promise<ConflictItem[]> {
    const url = status ? `${BASE_URL}/conflicts?status=${status}` : `${BASE_URL}/conflicts`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async resolveConflict(id: number, resolution: string, notes: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/conflicts/${id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ resolution, resolution_notes: notes }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Blockers
  async getBlockers(status?: string): Promise<BlockerItem[]> {
    const url = status ? `${BASE_URL}/blockers?status=${status}` : `${BASE_URL}/blockers`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateBlockerStatus(id: number, status: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/blockers/${id}/status?status=${status}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Digests
  async getDigests(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/digests`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getDigestDetail(id: string): Promise<DigestDetail> {
    const res = await fetch(`${BASE_URL}/digests/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async generateDigest(date: string = '2026-10-17', userRole: string = 'lead'): Promise<DigestDetail> {
    const res = await fetch(`${BASE_URL}/digests/generate?date=${date}&user_role=${userRole}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async exportDigest(digestId: string, format: string = 'markdown'): Promise<string> {
    const res = await fetch(`${BASE_URL}/digests/${digestId}/export?format=${format}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },

  // Citation Verification
  async getCitation(sourceId: string): Promise<SourceMessageItem> {
    const res = await fetch(`${BASE_URL}/digests/citation/${sourceId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Evaluation Suite
  async getEvaluation(): Promise<EvaluationReport> {
    const res = await fetch(`${BASE_URL}/evaluation`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getEvaluationMetrics(): Promise<EvaluationReport> {
    return this.getEvaluation();
  },

  async runEvaluation(): Promise<EvaluationReport> {
    const res = await fetch(`${BASE_URL}/evaluation/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // AI Intelligence Agent Copilot
  async getAIAgentTriage(query?: string, workItemId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (workItemId) params.append('work_item_id', workItemId);
    const res = await fetch(`${BASE_URL}/projects-teams/ai-agent-triage?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Duplicate Records & Clearing
  async getDuplicates(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/projects-teams/duplicates`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async clearDuplicates(): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects-teams/duplicates/clear`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async clearAllBlockers(): Promise<any> {
    const res = await fetch(`${BASE_URL}/blockers/clear-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Slack Integration API
  async getSlackConfig(): Promise<{
    client_id_configured: boolean;
    client_id: string;
    is_connected: boolean;
    team_name?: string;
    team_id?: string;
    selected_channel_name?: string;
    selected_channel_id?: string;
    has_token: boolean;
  }> {
    const res = await fetch(`${BASE_URL}/slack/config`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSlackAuthUrl(clientId?: string): string {
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    return `${BASE_URL}/slack/oauth/authorize?${params.toString()}`;
  },

  async connectSlackToken(botToken: string, defaultChannel?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/slack/manual-connect`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bot_token: botToken, default_channel: defaultChannel }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSlackChannels(): Promise<{ channels: Array<{ id: string; name: string }>; connected: boolean }> {
    const res = await fetch(`${BASE_URL}/slack/channels`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async syncSlackMessages(channelId?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/slack/sync-messages`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel_id: channelId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async disconnectSlack(): Promise<any> {
    const res = await fetch(`${BASE_URL}/slack/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Email (Outlook & Gmail) Integration API
  async getEmailConfig(): Promise<{
    outlook: {
      client_id_configured: boolean;
      client_id: string;
      is_connected: boolean;
      email_address?: string;
      account_name?: string;
      selected_folder: string;
    };
    gmail: {
      client_id_configured: boolean;
      client_id: string;
      is_connected: boolean;
      email_address?: string;
      account_name?: string;
      selected_label: string;
    };
  }> {
    const res = await fetch(`${BASE_URL}/email/config`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getOutlookAuthUrl(clientId?: string): string {
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    return `${BASE_URL}/email/outlook/oauth/authorize?${params.toString()}`;
  },

  getGmailAuthUrl(clientId?: string): string {
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    return `${BASE_URL}/email/gmail/oauth/authorize?${params.toString()}`;
  },

  async connectEmailManual(data: {
    service: 'outlook' | 'gmail';
    email: string;
    access_token: string;
    folder?: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/email/connect-manual`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async syncEmailMessages(service: 'outlook' | 'gmail'): Promise<any> {
    const res = await fetch(`${BASE_URL}/email/sync-messages`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ service }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async disconnectEmail(service: 'outlook' | 'gmail'): Promise<any> {
    const res = await fetch(`${BASE_URL}/email/disconnect?service=${service}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
