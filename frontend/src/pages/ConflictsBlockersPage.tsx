import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Layers,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { ConflictItem, BlockerItem } from '../types';
import { CitationBadge } from '../components/CitationBadge';

interface ConflictsBlockersPageProps {
  onOpenCitation: (sourceId: string) => void;
  onRefreshData?: () => void;
  refreshTrigger: number;
}

export const ConflictsBlockersPage: React.FC<ConflictsBlockersPageProps> = ({
  onOpenCitation,
  onRefreshData,
  refreshTrigger,
}) => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [blockers, setBlockers] = useState<BlockerItem[]>([]);
  const [activeTab, setActiveTab] = useState<'conflicts' | 'blockers'>('conflicts');
  const [resolutionNotes, setResolutionNotes] = useState<{ [id: number]: string }>({});
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [confRes, blockRes] = await Promise.all([
        api.getConflicts(),
        api.getBlockers(),
      ]);
      setConflicts(confRes);
      setBlockers(blockRes);
    } catch (err) {
      console.error('Failed to load conflicts & blockers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleResolveConflict = async (id: number, resolution: string) => {
    try {
      setResolvingId(id);
      const notes = resolutionNotes[id] || `Resolved as ${resolution} via triage dashboard.`;
      await api.resolveConflict(id, resolution, notes);
      await fetchData();
      onRefreshData && onRefreshData();
    } catch (err: any) {
      alert(`Failed to resolve conflict: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const handleUpdateBlockerStatus = async (id: number, status: string) => {
    try {
      await api.updateBlockerStatus(id, status);
      await fetchData();
      onRefreshData && onRefreshData();
    } catch (err: any) {
      alert(`Failed to update blocker status: ${err.message}`);
    }
  };

  const unresolvedConflicts = conflicts.filter(c => c.resolution_status === 'unresolved');
  const resolvedConflicts = conflicts.filter(c => c.resolution_status !== 'unresolved');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Conflicts & Blocker Triage Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Detects contradictory statements, owner disputes, and critical release blockers.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'conflicts'
                ? 'bg-amber-500 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Contradictions ({unresolvedConflicts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('blockers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'blockers'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Blockers ({blockers.filter(b => b.status === 'active').length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Conflicts & Contradictions */}
      {activeTab === 'conflicts' && (
        <div className="space-y-6">
          {unresolvedConflicts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No active contradictions</h3>
              <p className="text-xs text-slate-400 mt-1">All claim discrepancies have been resolved or clarified.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Pending Human Triage ({unresolvedConflicts.length})</span>
              </h2>

              {unresolvedConflicts.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-amber-300 p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-100 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                        {c.work_item_id}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        {c.conflict_type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                      Status: Unresolved Contradiction
                    </span>
                  </div>

                  {/* Dual Claims Comparison Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Claim A */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase">Claim A ({c.claim_a_author})</span>
                        {c.claim_a_source_id && (
                          <CitationBadge sourceId={c.claim_a_source_id} onClick={onOpenCitation} />
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                        "{c.claim_a_summary}"
                      </p>
                      <p className="text-[10px] text-slate-400">Timestamp: {c.claim_a_timestamp}</p>
                    </div>

                    {/* Claim B */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase">Claim B ({c.claim_b_author})</span>
                        {c.claim_b_source_id && (
                          <CitationBadge sourceId={c.claim_b_source_id} onClick={onOpenCitation} />
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                        "{c.claim_b_summary}"
                      </p>
                      <p className="text-[10px] text-slate-400">Timestamp: {c.claim_b_timestamp}</p>
                    </div>
                  </div>

                  {/* Resolution Input & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Add resolution explanation note (optional)..."
                      value={resolutionNotes[c.id] || ''}
                      onChange={(e) => setResolutionNotes({ ...resolutionNotes, [c.id]: e.target.value })}
                      className="w-full sm:w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveConflict(c.id, 'resolved_accepted_a')}
                        disabled={resolvingId === c.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all active:scale-95 shadow-sm"
                      >
                        Accept Claim A
                      </button>
                      <button
                        onClick={() => handleResolveConflict(c.id, 'resolved_accepted_b')}
                        disabled={resolvingId === c.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all active:scale-95 shadow-sm"
                      >
                        Accept Claim B
                      </button>
                      <button
                        onClick={() => handleResolveConflict(c.id, 'resolved_dual_aspect')}
                        disabled={resolvingId === c.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-all active:scale-95 shadow-sm"
                      >
                        Dual Aspect (Both Valid)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved History */}
          {resolvedConflicts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Resolved Contradiction Log ({resolvedConflicts.length})
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {resolvedConflicts.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-800 mr-2">{c.work_item_id}:</span>
                      <span className="text-slate-600 font-medium">Outcome: {c.resolution_status}</span>
                      {c.resolution_notes && (
                        <span className="text-slate-400 ml-2">({c.resolution_notes})</span>
                      )}
                    </div>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolved</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Critical Blockers */}
      {activeTab === 'blockers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blockers.map((b) => (
              <div
                key={b.id}
                className={`bg-white rounded-xl border p-5 shadow-sm space-y-3 flex flex-col justify-between ${
                  b.is_critical ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {b.work_item_id}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      b.severity === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {b.severity} Severity
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">{b.issue_text}</h3>
                  <p className="text-xs text-slate-600"><strong className="text-slate-700">Impact:</strong> {b.impact}</p>
                  <p className="text-xs text-slate-600 mt-1"><strong className="text-slate-700">Next Action:</strong> {b.next_action}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Owner: <strong className="text-slate-700">{b.owner}</strong></span>
                    {b.source_id && (
                      <CitationBadge sourceId={b.source_id} onClick={onOpenCitation} />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[11px] font-semibold uppercase ${
                      b.status === 'active' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      ● {b.status}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {b.status === 'active' ? (
                        <>
                          <button
                            onClick={() => handleUpdateBlockerStatus(b.id, 'mitigated')}
                            className="px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                          >
                            Mark Mitigated
                          </button>
                          <button
                            onClick={() => handleUpdateBlockerStatus(b.id, 'resolved')}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                          >
                            Mark Resolved
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleUpdateBlockerStatus(b.id, 'active')}
                          className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
