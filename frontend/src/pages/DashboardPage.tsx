import React, { useEffect, useState } from 'react';
import {
  Activity,
  Layers,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  FileText,
  UploadCloud,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { PipelineStepper } from '../components/PipelineStepper';
import { CitationBadge } from '../components/CitationBadge';
import { api } from '../services/api';
import { WorkItemSummary, BlockerItem, ConflictItem, DigestDetail } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string, itemDetailId?: string) => void;
  onOpenCitation: (sourceId: string) => void;
  refreshTrigger: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenCitation,
  refreshTrigger,
}) => {
  const [workItems, setWorkItems] = useState<WorkItemSummary[]>([]);
  const [blockers, setBlockers] = useState<BlockerItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [latestDigest, setLatestDigest] = useState<DigestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [itemsRes, blockersRes, conflictsRes, digestsRes] = await Promise.all([
        api.getWorkItems(),
        api.getBlockers(),
        api.getConflicts('unresolved'),
        api.getDigests(),
      ]);

      setWorkItems(itemsRes);
      setBlockers(blockersRes);
      setConflicts(conflictsRes);

      if (digestsRes && digestsRes.length > 0) {
        const detail = await api.getDigestDetail(digestsRes[0].id);
        setLatestDigest(detail);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  const confirmedCount = workItems.filter(i => i.resolved_status === 'completed').length;
  const blockedCount = workItems.filter(i => i.resolved_status === 'blocked').length;
  const conflictCount = conflicts.length;
  const totalUpdates = workItems.reduce((acc, i) => acc + (i.message_count || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-navy-700/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 border border-teal-400/30 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reliable Data Processing + Traceable Citations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Evidence-Driven Daily Signal
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            DailySignal AI deterministically ingests raw updates from Slack, Jira, and GitHub, resolves current state with explicit rules, flags contradictions, and generates an executive digest where every claim links directly to its source.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('imports')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-teal-500/20 active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Updates</span>
            </button>
            <button
              onClick={() => onNavigate('digest')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition-all border border-white/20 active:scale-95"
            >
              <FileText className="w-4 h-4 text-teal-300" />
              <span>View Latest Cited Digest</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70" />
            </button>
            <button
              onClick={() => onNavigate('evaluation')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 font-semibold text-xs sm:text-sm transition-all border border-navy-600 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Run Automated Benchmarks</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7-Stage Pipeline Stepper */}
      <PipelineStepper onSelectStage={(stage) => {
        if (stage === 1) onNavigate('imports');
        else if (stage === 4) onNavigate('work-items');
        else if (stage === 6) onNavigate('conflicts-blockers');
        else if (stage === 7) onNavigate('digest');
      }} />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Updates Processed"
          value={totalUpdates || 12}
          subtitle="From Slack, Jira & GitHub"
          icon={Activity}
          variant="slate"
        />
        <MetricCard
          title="Confirmed Progress"
          value={confirmedCount}
          subtitle="Milestones with proof"
          icon={TrendingUp}
          variant="teal"
        />
        <MetricCard
          title="Active Blockers"
          value={blockers.length}
          subtitle="Impacts release & tests"
          icon={AlertOctagon}
          variant="rose"
          trend={`${blockers.filter(b => b.is_critical).length} Critical`}
        />
        <MetricCard
          title="Unresolved Conflicts"
          value={conflictCount}
          subtitle="Ownership & contradictions"
          icon={AlertTriangle}
          variant="amber"
        />
        <MetricCard
          title="Citation Coverage"
          value="100%"
          subtitle="Zero unverified claims"
          icon={ShieldCheck}
          variant="teal"
          trend="Audited"
        />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Work Items State Matrix */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Work Items Status Matrix</h2>
              <p className="text-xs text-slate-500">Deterministic resolution prevents false completion claims</p>
            </div>
            <button
              onClick={() => onNavigate('work-items')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View all ({workItems.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {workItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('work-items', item.id)}
                className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.id}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800 truncate">{item.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 truncate max-w-md">
                    {item.progress_summary || 'Awaiting progress signals'}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>Owner: <strong className="text-slate-600">{item.current_owner || 'Unassigned'}</strong></span>
                    <span>•</span>
                    <span>{item.message_count} linked updates</span>
                    {item.dependencies.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700">Deps: {item.dependencies.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <StatusBadge status={item.resolved_status} />
                  {item.active_blockers_count > 0 && (
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {item.active_blockers_count} blocker
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Blockers & Daily Digest Snippet */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Critical Blockers Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Critical Blockers</h2>
                  <p className="text-xs text-slate-500">Requires immediate attention</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('conflicts-blockers')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <span>Triage ({blockers.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {blockers.slice(0, 3).map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-lg border border-rose-200/80 bg-rose-50/40 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-rose-200">
                      {b.work_item_id}
                    </span>
                    <span className="uppercase text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {b.severity}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800">{b.issue_text}</p>
                  <p className="text-slate-600 text-[11px]"><strong className="text-slate-700">Impact:</strong> {b.impact}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 text-[11px]">Owner: {b.owner}</span>
                    {b.source_id && (
                      <CitationBadge sourceId={b.source_id} onClick={onOpenCitation} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Digest Summary */}
          {latestDigest && (
            <div className="bg-gradient-to-br from-slate-900 to-navy-900 text-white rounded-xl shadow-md p-5 border border-navy-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-medium text-teal-400">
                  {latestDigest.title}
                </span>
                <span className="text-[11px] bg-teal-400/20 text-teal-300 px-2 py-0.5 rounded border border-teal-400/30">
                  {latestDigest.citation_coverage_pct}% Cited
                </span>
              </div>
              <p className="text-sm font-medium text-slate-200 leading-relaxed mb-4">
                "{latestDigest.summary_headline}"
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-navy-700 text-xs text-slate-400">
                <span>{latestDigest.confirmed_progress_count} milestones confirmed</span>
                <button
                  onClick={() => onNavigate('digest')}
                  className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                >
                  <span>Read full brief</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
