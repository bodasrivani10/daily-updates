import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PlusCircle,
  MessageSquare,
  History,
  Send,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import {
  RosterMember,
  WorkItemSummary,
  ProjectItem,
  AuditLogItem,
  UserProfile,
  FeedbackItem
} from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface ManagerDashboardProps {
  onNavigate: (tab: string, itemDetailId?: string) => void;
  onOpenCitation: (sourceId: string) => void;
  refreshTrigger: number;
  onOpenAIAgent?: (prompt: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  onNavigate,
  onOpenCitation,
  refreshTrigger,
  onOpenAIAgent,
}) => {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemSummary[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal / Form States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState<number | ''>('');
  const [inviteProjectId, setInviteProjectId] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('contributor');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignWorkItemId, setAssignWorkItemId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [assignPriority, setAssignPriority] = useState('medium');
  const [assignDueDate, setAssignDueDate] = useState('');

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackEmployeeId, setFeedbackEmployeeId] = useState<number | ''>('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSentiment, setFeedbackSentiment] = useState<'positive' | 'constructive' | 'critical'>('constructive');
  const [feedbackTaskId, setFeedbackTaskId] = useState('');

  // Search bar for employees (allows searching even across 100+ team members)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  // Reassign / Update Task to Particular Employee State
  const [showUpdateTaskModal, setShowUpdateTaskModal] = useState(false);
  const [taskToUpdate, setTaskToUpdate] = useState<WorkItemSummary | null>(null);
  const [updateAssigneeId, setUpdateAssigneeId] = useState<number | ''>('');
  const [updateStatus, setUpdateStatus] = useState<string>('in_progress');
  const [updateNotes, setUpdateNotes] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rosterRes, itemsRes, projsRes, logsRes, usersRes] = await Promise.all([
        api.getManagerRoster(),
        api.getWorkItems(),
        api.getProjects(),
        api.getAuditLogs(),
        api.getAllUsers(),
      ]);
      setRoster(rosterRes);
      setWorkItems(itemsRes);
      setProjects(projsRes);
      setAuditLogs(logsRes);
      setAllUsers(usersRes.filter((u) => u.role === 'employee'));
      if (projsRes.length > 0) {
        setInviteProjectId(projsRes[0].id);
        setAssignProjectId(projsRes[0].id);
      }
    } catch (err: any) {
      console.error('Error loading manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUserId || !inviteProjectId) return;
    try {
      await api.sendInvitation(Number(inviteUserId), inviteProjectId, inviteRole);
      showToast('Team invitation sent successfully!');
      setShowInviteModal(false);
      setInviteUserId('');
      loadData();
    } catch (err: any) {
      alert(`Error sending invitation: ${err.message}`);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignWorkItemId || !assigneeId || !assignProjectId) return;
    try {
      await api.assignTask({
        work_item_id: assignWorkItemId,
        title: assignTitle || `Task ${assignWorkItemId}`,
        project_id: assignProjectId,
        assignee_id: Number(assigneeId),
        priority: assignPriority,
        due_date: assignDueDate || undefined,
      });
      showToast(`Work item ${assignWorkItemId} assigned successfully!`);
      setShowAssignModal(false);
      setAssignWorkItemId('');
      setAssignTitle('');
      setAssignDueDate('');
      loadData();
    } catch (err: any) {
      alert(`Error assigning task: ${err.message}`);
    }
  };

  const handleUpdateTaskAndAssignee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToUpdate) return;
    try {
      // 1. Update task status and manager verification notes
      await api.updateWorkItemStatus(taskToUpdate.id, updateStatus, updateNotes || undefined);

      // 2. If reassigning to a particular employee, reassign work item
      if (updateAssigneeId) {
        await api.assignTask({
          work_item_id: taskToUpdate.id,
          title: taskToUpdate.title,
          project_id: taskToUpdate.project_id || (projects[0]?.id || 'PROJ-CORE'),
          assignee_id: Number(updateAssigneeId),
        });
      }

      showToast(`Task ${taskToUpdate.id} successfully updated & reassigned!`);
      setShowUpdateTaskModal(false);
      setTaskToUpdate(null);
      setUpdateNotes('');
      loadData();
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackEmployeeId || !feedbackText) return;
    try {
      await api.createFeedback({
        employee_id: Number(feedbackEmployeeId),
        feedback_text: feedbackText,
        sentiment: feedbackSentiment,
        work_item_id: feedbackTaskId || undefined,
      });
      showToast('Feedback submitted to team member successfully!');
      setShowFeedbackModal(false);
      setFeedbackText('');
      setFeedbackTaskId('');
      loadData();
    } catch (err: any) {
      alert(`Error submitting feedback: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manager Header & Stats Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-xl p-6 text-white shadow-lg border border-blue-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <Users className="w-5 h-5 text-blue-300" />
              </span>
              <h2 className="text-xl font-bold">Manager & Team Lead Console</h2>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              Supervising assigned team members, managing project rosters, distributing next-day tasks, and providing continuous performance feedback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenAIAgent && (
              <button
                onClick={() => onOpenAIAgent('Analyze team blockers, pending tasks, and duplicate claims')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-xs font-bold rounded-lg shadow-md text-white transition"
              >
                <span>✨ AI Triage Agent</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('digest')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Team Summarization
            </button>
            <button
              onClick={() => onNavigate('duplicates-blockers')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <AlertTriangle className="w-4 h-4" />
              Duplicates & Blockers
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              Invite to Team
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              Assign Task
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              <MessageSquare className="w-4 h-4" />
              Give Feedback
            </button>
          </div>
        </div>

        {/* Quick Stats Grid with Status Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6 pt-5 border-t border-blue-800/80">
          <div>
            <span className="text-[11px] text-blue-300 font-medium">Assigned Team</span>
            <p className="text-xl font-bold text-white mt-0.5">{roster.length} Members</p>
          </div>
          <div>
            <span className="text-[11px] text-blue-300 font-medium">Total Tasks</span>
            <p className="text-xl font-bold text-white mt-0.5">{workItems.length}</p>
          </div>
          <div className="bg-emerald-950/50 p-2 rounded border border-emerald-500/30">
            <span className="text-[11px] text-emerald-300 font-medium">Completed</span>
            <p className="text-xl font-bold text-emerald-200 mt-0.5">
              {workItems.filter((w) => w.resolved_status === 'completed').length}
            </p>
          </div>
          <div className="bg-blue-950/50 p-2 rounded border border-blue-500/30">
            <span className="text-[11px] text-blue-300 font-medium">In Progress</span>
            <p className="text-xl font-bold text-blue-200 mt-0.5">
              {workItems.filter((w) => w.resolved_status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-rose-950/50 p-2 rounded border border-rose-500/30">
            <span className="text-[11px] text-rose-300 font-medium">Blocked</span>
            <p className="text-xl font-bold text-rose-200 mt-0.5">
              {workItems.filter((w) => w.resolved_status === 'blocked').length}
            </p>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
            <span className="text-[11px] text-slate-300 font-medium">Not Done / Other</span>
            <p className="text-xl font-bold text-slate-200 mt-0.5">
              {workItems.filter((w) => ['not_started', 'unknown', 'conflict'].includes(w.resolved_status)).length}
            </p>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs font-semibold flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-blue-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Manager Columns: Team Roster & Task Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Team Roster & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Team Roster (10-20 assigned employees) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Assigned Team Roster ({roster.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Employees supervised under your leadership across projects
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                + Invite New Member
              </button>
            </div>

            {/* Employee Quick Search Bar */}
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={employeeSearchQuery}
                  onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                  placeholder="Search employees by name, username, or department (even 100+ members)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              {employeeSearchQuery && (
                <button
                  onClick={() => setEmployeeSearchQuery('')}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading roster...</div>
            ) : roster.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                No employees currently assigned. Send project invitations to populate your roster.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-left font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Projects</th>
                      <th className="py-2.5 px-3 text-center">Active Tasks</th>
                      <th className="py-2.5 px-3 text-center">Updates Logged</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster
                      .filter((member) => {
                        if (!employeeSearchQuery.trim()) return true;
                        const q = employeeSearchQuery.toLowerCase();
                        return (
                          member.name.toLowerCase().includes(q) ||
                          member.username.toLowerCase().includes(q) ||
                          member.department.toLowerCase().includes(q)
                        );
                      })
                      .map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{member.name}</div>
                          <div className="text-[11px] text-slate-400">@{member.username}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{member.department}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {member.projects.map((p, i) => (
                              <span
                                key={i}
                                className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {member.active_tasks_count}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {member.updates_submitted}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setAssigneeId(member.id);
                              setShowAssignModal(true);
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-medium"
                          >
                            Assign Task
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackEmployeeId(member.id);
                              setShowFeedbackModal(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                          >
                            Feedback
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Task & Work Tracking */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Incoming Team Task & Status Tracking
                </h3>
                <p className="text-xs text-slate-500">
                  Review daily progress logs and state updates submitted by your team
                </p>
              </div>
              <button
                onClick={() => onNavigate('work-items')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                View Full Work Items Feed →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {workItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate('work-items', item.id)}
                  className="py-3 hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 hover:text-blue-600">
                        {item.title}
                      </span>
                    </div>
                    {item.progress_summary && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                        "{item.progress_summary}"
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Owner: <strong>{item.current_owner || 'Unassigned'}</strong></span>
                      {item.project_name && <span>📁 {item.project_name}</span>}
                      <span>Updated: {item.last_updated.slice(0, 10)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.resolved_status} />
                    {item.active_blockers_count > 0 && (
                      <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                        {item.active_blockers_count} Blocker
                      </span>
                    )}

                    {/* Manager Status Verification Buttons */}
                    <div
                      className="flex items-center gap-1 border-l border-slate-200 pl-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.resolved_status !== 'completed' ? (
                        <button
                          onClick={async () => {
                            try {
                              await api.updateWorkItemStatus(item.id, 'completed', 'Verified & marked completed by Manager');
                              showToast(`✓ Marked task ${item.id} as COMPLETED!`);
                              loadData();
                            } catch (err: any) {
                              alert(`Failed to update status: ${err.message}`);
                            }
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded border border-emerald-300 transition whitespace-nowrap"
                          title="Verify and Mark Completed"
                        >
                          ✓ Complete
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await api.updateWorkItemStatus(item.id, 'in_progress', 'Reopened by Manager');
                              showToast(`Reopened task ${item.id} to in_progress.`);
                              loadData();
                            } catch (err: any) {
                              alert(`Failed to update status: ${err.message}`);
                            }
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded transition"
                          title="Reopen Task"
                        >
                          Reopen
                        </button>
                      )}

                      {/* Update / Reassign to Employee */}
                      <button
                        onClick={() => {
                          setTaskToUpdate(item);
                          setUpdateStatus(item.resolved_status);
                          setUpdateNotes(item.progress_summary || '');
                          setShowUpdateTaskModal(true);
                        }}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded border border-indigo-200 transition whitespace-nowrap"
                        title="Update task or reassign to a particular employee"
                      >
                        ✎ Update / Give Work
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Team Audit Trail */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Team Audit Trail</h3>
              </div>
              <span className="text-[11px] text-slate-400">Live operational log</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              All task assignments, invitations, and changes executed by managers in your team
            </p>

            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No audit records yet.</p>
              ) : (
                auditLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{log.action.replace('_', ' ').toUpperCase()}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      By <strong className="text-slate-800">{log.user_name}</strong> on {log.entity_type} <span className="font-mono text-slate-700">{log.entity_id}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-[10px] text-slate-500 bg-white p-1 rounded border border-slate-200/60 font-mono">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Send Team Project Invitation</h3>
            <p className="text-xs text-slate-500">
              Invite an employee to join your project team. Once accepted, their isolated workspace will include the project feed.
            </p>
            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Employee</label>
                <select
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="">-- Choose Employee --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.username}) - {u.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Project</label>
                <select
                  value={inviteProjectId}
                  onChange={(e) => setInviteProjectId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role in Team</label>
                <input
                  type="text"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder="e.g. Core Contributor, QA Specialist"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Assign Work Item / Next-Day Task</h3>
            <form onSubmit={handleAssignTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Item ID</label>
                <input
                  type="text"
                  value={assignWorkItemId}
                  onChange={(e) => setAssignWorkItemId(e.target.value.toUpperCase())}
                  placeholder="e.g. TASK-301, INFRA-200"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="Brief description of the deliverable"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project</label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign To Employee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="">-- Choose Employee --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={assignPriority}
                    onChange={(e) => setAssignPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-xs"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Give Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Provide Team Member Feedback</h3>
            <form onSubmit={handleSendFeedback} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee</label>
                <select
                  value={feedbackEmployeeId}
                  onChange={(e) => setFeedbackEmployeeId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="">-- Choose Employee --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Task ID (Optional)</label>
                <input
                  type="text"
                  value={feedbackTaskId}
                  onChange={(e) => setFeedbackTaskId(e.target.value)}
                  placeholder="e.g. TASK-204"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Feedback Sentiment</label>
                <select
                  value={feedbackSentiment}
                  onChange={(e: any) => setFeedbackSentiment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="positive">Positive / Commendation</option>
                  <option value="constructive">Constructive Guidance</option>
                  <option value="critical">Critical / Correction Needed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Feedback Message</label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide concrete performance feedback or guidance..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update / Give Work to Particular Employee Modal */}
      {showUpdateTaskModal && taskToUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">
                Update Task & Reassign Work
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Task: <strong className="text-indigo-600 font-mono">[{taskToUpdate.id}]</strong> {taskToUpdate.title}
              </p>
            </div>

            <form onSubmit={handleUpdateTaskAndAssignee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignee (Give Work to Particular Employee)
                </label>
                <select
                  value={updateAssigneeId}
                  onChange={(e) => setUpdateAssigneeId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                >
                  <option value="">-- Keep Current Assignee ({taskToUpdate.current_owner || 'Unassigned'}) --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.username}) — {u.department}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Select which team member should take over this work item.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Status State
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                >
                  <option value="completed">Completed (Manager Verified)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked (Requires Action/Support)</option>
                  <option value="not_started">Not Started / Queued</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manager Instructions / Progress Update Notes
                </label>
                <textarea
                  rows={3}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Specify task directives, new requirements, or feedback for the employee..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateTaskModal(false);
                    setTaskToUpdate(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-xs"
                >
                  Save & Dispatch Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
