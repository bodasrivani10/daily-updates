import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  FileCheck,
  Send,
  User,
  ArrowRight,
  Inbox,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { WorkItemSummary, InvitationItem, ProjectItem, FeedbackItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface EmployeeDashboardProps {
  onNavigate: (tab: string, itemDetailId?: string) => void;
  onOpenCitation: (sourceId: string) => void;
  refreshTrigger: number;
  onOpenAIAgent?: (prompt: string) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onNavigate,
  onOpenCitation,
  refreshTrigger,
  onOpenAIAgent,
}) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workItems, setWorkItems] = useState<WorkItemSummary[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Employee Task Summarization & Submission state (No raw doc upload needed)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskSummaryText, setTaskSummaryText] = useState<string>('');
  const [sourceChannel, setSourceChannel] = useState<string>('slack');
  const [submittingSummary, setSubmittingSummary] = useState<boolean>(false);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [user, items, invs, projs, fbs] = await Promise.all([
        api.getCurrentUser(),
        api.getWorkItems(),
        api.getInvitations(),
        api.getProjects(),
        api.getFeedback(),
      ]);
      setCurrentUser(user);
      setWorkItems(items);
      setInvitations(invs);
      setProjects(projs);
      setFeedbacks(fbs);
    } catch (err: any) {
      console.error('Error loading employee dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleRespondInvitation = async (invId: number, action: 'accepted' | 'rejected') => {
    try {
      await api.respondInvitation(invId, action);
      setActionMessage(`Project invitation ${action} successfully!`);
      setTimeout(() => setActionMessage(null), 3500);
      loadData();
    } catch (err: any) {
      alert(`Error responding to invitation: ${err.message}`);
    }
  };

  const handleSubmitSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskSummaryText.trim()) return;

    try {
      setSubmittingSummary(true);
      const res = await api.submitTaskSummary({
        work_item_id: selectedTaskId || (workItems[0]?.id || 'GENERAL-101'),
        summary_text: taskSummaryText,
        source_system: sourceChannel,
      });

      setActionMessage(
        `✓ Summarization processed! Pipeline ran deduplication & blocker detection (${res.duplicate_count || 0} duplicates screened, state updated).`
      );
      setTaskSummaryText('');
      loadData();
    } catch (err: any) {
      alert(`Failed to submit task summarization: ${err.message}`);
    } finally {
      setSubmittingSummary(false);
    }
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');
  const filteredWorkItems =
    selectedProjectFilter === 'all'
      ? workItems
      : workItems.filter((item) => item.project_id === selectedProjectFilter);

  return (
    <div className="space-y-6">
      {/* Privacy & Isolation Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-xl p-5 text-white shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Employee Workspace & Task Summarizer</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                Data Isolation Active
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              No need to upload raw documents! Directly input your daily task summarization. The AI engine runs automated deduplication, blocker checks, and updates your task progress.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenAIAgent && (
            <button
              onClick={() => onOpenAIAgent('Summarize my assigned tasks and suggest next actions')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-lg shadow transition whitespace-nowrap"
            >
              <span>✨ AI Copilot</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('duplicates-blockers')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-700/60 hover:bg-emerald-700 font-bold text-xs rounded-lg border border-emerald-500/40 transition whitespace-nowrap"
          >
            Check Duplicates & Blockers
          </button>
          <button
            onClick={() => onNavigate('digest')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold text-xs rounded-lg shadow transition whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            View Digest
          </button>
        </div>
      </div>

      {/* Task Summarization Direct Submission (Replaces file upload) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Submit Daily Task Summarization (No Raw Docs Required)
              </h3>
              <p className="text-xs text-slate-500">
                Summarize what you accomplished today. The AI pipeline will automatically check for duplicate submissions, flag blockers, and update task progress.
              </p>
            </div>
          </div>

          {/* Sync integrations badges */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Channel Sync:</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200 text-[11px] flex items-center gap-1">
              💬 Slack
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold border border-sky-200 text-[11px] flex items-center gap-1">
              📧 Outlook
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-[11px] flex items-center gap-1">
              👥 MS Teams
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200 text-[11px] flex items-center gap-1">
              ✉️ Gmail
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitSummary} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Work Item / Task
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Choose Assigned Work Item --</option>
                {workItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.id}] {item.title.slice(0, 35)}...
                  </option>
                ))}
                <option value="NEW_TASK">Other / New Activity</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Integrated Source Channel</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  ● Live Sync
                </span>
              </label>
              <select
                value={sourceChannel}
                onChange={(e) => setSourceChannel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="slack">💬 Slack (#daily-standup & #project-sync)</option>
                <option value="outlook">📧 Microsoft Outlook (Connected Mailbox)</option>
                <option value="teams">👥 Microsoft Teams (Channel Standup Thread)</option>
                <option value="gmail">✉️ Google Gmail (Work Account Inbox)</option>
                <option value="jira">🎯 Atlassian Jira (Sprint Task Sync)</option>
                <option value="manual_summary">⚡ Direct VELO Portal Ingestion</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee Profile
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-medium flex items-center justify-between">
                <span>{currentUser ? `${currentUser.name} (${currentUser.department})` : 'Active Employee'}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase">
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              What did you complete or encounter in this task? (Summarization)
            </label>
            <textarea
              rows={3}
              value={taskSummaryText}
              onChange={(e) => setTaskSummaryText(e.target.value)}
              placeholder="e.g. Completed JWT refresh token rotation module; ran integration tests successfully with 0 failures. Blocked on staging DB access from DevOps."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500">
              ⚡ Ingesting executes <strong>Deduplication screening</strong>, <strong>Blocker & Conflict detection</strong>, and updates your resolved status in SQLite.
            </span>
            <button
              type="submit"
              disabled={submittingSummary || !taskSummaryText.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition"
            >
              {submittingSummary ? (
                <span>Running Pipeline...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Task Summarization</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {actionMessage && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-xs font-medium flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-teal-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Pending Project Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-700" />
              <h3 className="text-sm font-bold text-amber-900">
                Pending Team & Project Invitations ({pendingInvitations.length})
              </h3>
            </div>
            <span className="text-xs text-amber-700 font-medium">Action Required</span>
          </div>
          <p className="text-xs text-amber-800 mb-4">
            Managers have invited you to collaborate on the following projects. Once accepted, project task feeds and update streams will appear in your dashboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-4 rounded-lg border border-amber-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{inv.project_name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      {inv.project_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Invited by <strong className="text-slate-800">{inv.manager_name}</strong> as <span className="font-medium text-slate-700">{inv.role_in_team}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Received on {new Date(inv.invited_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition"
                  >
                    Accept & Join
                  </button>
                  <button
                    onClick={() => handleRespondInvitation(inv.id, 'rejected')}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Projects & Team Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Active Work Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Assigned Work Items</h3>
                <p className="text-xs text-slate-500">
                  Tasks, progress status, and blocker tracking assigned to you
                </p>
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Filter Project:</span>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">All Accepted Projects ({workItems.length})</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading work items...</div>
            ) : filteredWorkItems.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
                <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No assigned work items in this view.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Accept incoming project invitations or import updates from CSV/JSON to track work.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredWorkItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate('work-items', item.id)}
                    className="py-3.5 hover:bg-slate-50 rounded-lg px-2 transition cursor-pointer flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {item.id}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-900 hover:text-indigo-600">
                          {item.title}
                        </h4>
                        {item.priority && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            item.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                            item.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                      </div>

                      {item.progress_summary && (
                        <p className="text-xs text-slate-600 line-clamp-1">
                          {item.progress_summary}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        {item.project_name && (
                          <span className="font-medium text-slate-600">
                            📁 {item.project_name}
                          </span>
                        )}
                        <span>Updated: {item.last_updated.slice(0, 10)}</span>
                        {item.due_date && (
                          <span className="text-amber-700 font-medium">Due: {item.due_date}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={item.resolved_status} />
                      <div className="flex items-center gap-2 text-[11px]">
                        {item.active_blockers_count > 0 && (
                          <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 rounded">
                            {item.active_blockers_count} Blocker
                          </span>
                        )}
                        <span className="text-slate-400">{item.message_count} msgs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Accepted Projects & Performance Feedback */}
        <div className="space-y-6">
          {/* Accepted Projects Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">My Accepted Projects</h3>
            <p className="text-xs text-slate-500 mb-3">
              Projects where your daily updates are ingested
            </p>

            <div className="space-y-2">
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No accepted projects yet.</p>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/80 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{proj.name}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                        {proj.id}
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                        {proj.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200/60">
                      <span>{proj.member_count} Members</span>
                      <span>{proj.work_item_count} Tasks</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Feedback Received from Managers */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Manager Feedback</h3>
            <p className="text-xs text-slate-500 mb-3">
              Direct guidance & evaluations from your lead
            </p>

            <div className="space-y-3">
              {feedbacks.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No manager feedback submitted yet.
                </p>
              ) : (
                feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{fb.manager_name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          fb.sentiment === 'positive'
                            ? 'bg-emerald-100 text-emerald-700'
                            : fb.sentiment === 'critical'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {fb.sentiment}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{fb.feedback_text}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      {fb.work_item_id && <span>Task: {fb.work_item_id}</span>}
                      <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
