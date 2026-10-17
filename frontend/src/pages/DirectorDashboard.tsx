import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  FolderKanban,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  TrendingUp,
  Award,
  ChevronRight,
  Filter,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { api } from '../services/api';
import {
  ProjectItem,
  AuditLogItem,
  EmployeeContributionMetric,
  WorkItemSummary
} from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface DirectorDashboardProps {
  onNavigate: (tab: string, itemDetailId?: string) => void;
  onOpenCitation: (sourceId: string) => void;
  refreshTrigger: number;
  onOpenAIAgent?: (prompt: string) => void;
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({
  onNavigate,
  onOpenCitation,
  refreshTrigger,
  onOpenAIAgent,
}) => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Global Employee Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeContributionMetric[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeContributionMetric | null>(null);
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projsRes, itemsRes, logsRes] = await Promise.all([
        api.getProjects(),
        api.getWorkItems(),
        api.getAuditLogs(),
      ]);
      setProjects(projsRes);
      setWorkItems(itemsRes);
      setAuditLogs(logsRes);
    } catch (err: any) {
      console.error('Error loading director dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const res = await api.globalEmployeeSearch(searchQuery.trim());
      setSearchResults(res);
      if (res.length > 0) {
        setSelectedEmployee(res[0]);
      } else {
        setSelectedEmployee(null);
      }
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Metrics for executive charts
  const statusCounts = {
    completed: workItems.filter((i) => i.resolved_status === 'completed').length,
    in_progress: workItems.filter((i) => i.resolved_status === 'in_progress').length,
    blocked: workItems.filter((i) => i.resolved_status === 'blocked').length,
    conflict: workItems.filter((i) => i.resolved_status === 'conflict').length,
  };

  const chartData = [
    { name: 'Completed', count: statusCounts.completed, fill: '#10B981' },
    { name: 'In Progress', count: statusCounts.in_progress, fill: '#3B82F6' },
    { name: 'Blocked', count: statusCounts.blocked, fill: '#EF4444' },
    { name: 'Conflict', count: statusCounts.conflict, fill: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-xl p-6 text-white shadow-xl border border-purple-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-purple-500/20 rounded-lg border border-purple-400/30">
                <Building2 className="w-5 h-5 text-purple-300" />
              </span>
              <h2 className="text-xl font-bold">Director & CEO Executive Suite</h2>
            </div>
            <p className="text-xs text-purple-200 mt-1 max-w-2xl">
              Organization-wide master overview: complete company project portfolio visibility, cross-team managerial audit trail, and global employee contribution intelligence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenAIAgent && (
              <button
                onClick={() => onOpenAIAgent('Executive summary of project portfolio health, blocker distribution, and risk factors')}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-xs font-bold rounded-lg shadow-md text-white transition flex items-center gap-1.5"
              >
                <span>✨ Executive AI Advisor</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('digest')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap"
            >
              Generate Cited Daily Digest
            </button>
            <button
              onClick={() => onNavigate('evaluation')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-purple-800/80 transition whitespace-nowrap"
            >
              Run Benchmark Suite
            </button>
          </div>
        </div>

        {/* Global Executive KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-purple-900/80">
          <div>
            <span className="text-[11px] text-purple-300 font-medium">Enterprise Projects</span>
            <p className="text-2xl font-bold text-white mt-0.5">{projects.length}</p>
          </div>
          <div>
            <span className="text-[11px] text-purple-300 font-medium">Total Work Items</span>
            <p className="text-2xl font-bold text-white mt-0.5">{workItems.length}</p>
          </div>
          <div>
            <span className="text-[11px] text-purple-300 font-medium">Active Blockers</span>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">
              {workItems.reduce((acc, curr) => acc + curr.active_blockers_count, 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-purple-300 font-medium">Manager Changes Tracked</span>
            <p className="text-2xl font-bold text-white mt-0.5">{auditLogs.length}</p>
          </div>
        </div>
      </div>

      {/* Feature 1: Global Employee Search & Contribution Deep-Dive */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-700" />
            <h3 className="text-base font-bold text-slate-900">
              Global Employee Search & Contribution Deep-Dive
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Instantly surface any employee across all teams, their associated projects, specific tasks, completed milestones, and recent verified progress events.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee name or username (e.g. Asha, Carlos, Devin, Maya)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            {searching ? 'Searching...' : 'Deep-Dive'}
          </button>
        </form>

        {/* Search Results & Deep-Dive View */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            {/* Employee Selector List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Matches Found ({searchResults.length})
              </span>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {searchResults.map((emp) => (
                  <div
                    key={emp.user_id}
                    onClick={() => setSelectedEmployee(emp)}
                    className={`p-3 rounded-lg border transition cursor-pointer text-xs ${
                      selectedEmployee?.user_id === emp.user_id
                        ? 'border-purple-500 bg-purple-50/70'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900">{emp.name}</div>
                    <div className="text-[11px] text-slate-500">
                      @{emp.username} • {emp.department}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contribution Deep-Dive Details */}
            {selectedEmployee && (
              <div className="md:col-span-2 bg-slate-50/80 rounded-xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{selectedEmployee.name}</h4>
                    <p className="text-xs text-slate-500">
                      {selectedEmployee.department} Department • ID #{selectedEmployee.user_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded font-semibold">
                      {selectedEmployee.completed_milestones} Milestones Completed
                    </span>
                  </div>
                </div>

                {/* Team & Project Affiliations */}
                <div>
                  <span className="text-xs font-bold text-slate-700">Associated Teams & Projects:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedEmployee.teams_and_projects.length === 0 ? (
                      <span className="text-xs text-slate-400">No project affiliations yet.</span>
                    ) : (
                      selectedEmployee.teams_and_projects.map((tp, i) => (
                        <span
                          key={i}
                          className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md text-xs font-medium shadow-2xs"
                        >
                          📁 {tp}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Specific Tasks Taking Part In */}
                <div>
                  <span className="text-xs font-bold text-slate-700">
                    Specific Tasks Participating In ({selectedEmployee.tasks_participating.length}):
                  </span>
                  <div className="space-y-1.5 mt-1.5">
                    {selectedEmployee.tasks_participating.length === 0 ? (
                      <p className="text-xs text-slate-400">No direct work items assigned.</p>
                    ) : (
                      selectedEmployee.tasks_participating.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => onNavigate('work-items', task.id)}
                          className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between hover:border-purple-400 cursor-pointer transition text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                              {task.id}
                            </span>
                            <span className="font-medium text-slate-800">{task.title}</span>
                          </div>
                          <StatusBadge status={task.status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Contribution Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Updates Submitted</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {selectedEmployee.total_updates_submitted}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Completed Milestones</span>
                    <p className="text-lg font-bold text-emerald-600 mt-0.5">
                      {selectedEmployee.completed_milestones}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Blockers Assigned</span>
                    <p className="text-lg font-bold text-rose-600 mt-0.5">
                      {selectedEmployee.active_blockers_assigned}
                    </p>
                  </div>
                </div>

                {/* Recent Verified Events */}
                {selectedEmployee.recent_events.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-700">Recent Ingested Activity:</span>
                    <div className="space-y-1.5 mt-1.5">
                      {selectedEmployee.recent_events.map((evt, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white rounded border border-slate-200 text-[11px] flex items-center justify-between"
                        >
                          <span className="text-slate-700 line-clamp-1">{evt.text}</span>
                          <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap ml-2">
                            {evt.source_id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature 2: Company-Wide Project Master List & Work Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Master Project List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Company-Wide Master Project Portfolio ({projects.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Active, upcoming, and completed enterprise projects across all business units
                </p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
                Executive View
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {proj.id}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {proj.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2">{proj.name}</h4>
                    {proj.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span>👥 {proj.member_count} Members</span>
                    <span>📋 {proj.work_item_count} Tasks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Status Distribution Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Enterprise Work Item Health & Status Resolution
            </h3>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Cross-Team Manager Changes Audit */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-700" />
                <h3 className="text-sm font-bold text-slate-900">Manager Changes Audit</h3>
              </div>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono">
                Organization-Wide
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              All task assignments, status changes, and operational edits made by managers across teams
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No manager actions logged yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {log.action.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      Manager <strong className="text-slate-900">{log.user_name}</strong> modified {log.entity_type}{' '}
                      <span className="font-mono font-medium text-slate-800">{log.entity_id}</span>
                    </p>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-600">
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
    </div>
  );
};
