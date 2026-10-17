import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Trash2,
  AlertTriangle,
  Copy,
  Info,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { DuplicateRecordItem } from '../types';

interface DuplicatesBlockersManagerProps {
  onOpenCitation: (sourceId: string) => void;
  onRefreshData?: () => void;
  onOpenAIAgent: (prompt: string) => void;
}

export const DuplicatesBlockersManager: React.FC<DuplicatesBlockersManagerProps> = ({
  onOpenCitation,
  onRefreshData,
  onOpenAIAgent,
}) => {
  const [duplicates, setDuplicates] = useState<DuplicateRecordItem[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingDups, setClearingDups] = useState(false);
  const [clearingBlockers, setClearingBlockers] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dupsRes, blockersRes] = await Promise.all([
        api.getDuplicates(),
        api.getBlockers(),
      ]);
      setDuplicates(dupsRes);
      setBlockers(blockersRes);
    } catch (err: any) {
      console.error('Failed to load duplicates/blockers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleClearDuplicates = async () => {
    if (!window.confirm('Are you sure you want to clear duplicate update files? Original evidence links will remain preserved.')) {
      return;
    }
    try {
      setClearingDups(true);
      const res = await api.clearDuplicates();
      showToast(res.message || 'Duplicate files cleared successfully!');
      fetchData();
      onRefreshData && onRefreshData();
    } catch (err: any) {
      alert(`Error clearing duplicates: ${err.message}`);
    } finally {
      setClearingDups(false);
    }
  };

  const handleClearAllBlockers = async () => {
    if (!window.confirm('Resolve and clear all active blocked files? This will transition blocked work items to in_progress or review.')) {
      return;
    }
    try {
      setClearingBlockers(true);
      const res = await api.clearAllBlockers();
      showToast(res.message || 'Active blocked files resolved!');
      fetchData();
      onRefreshData && onRefreshData();
    } catch (err: any) {
      alert(`Error resolving blockers: ${err.message}`);
    } finally {
      setClearingBlockers(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold">Data Cleaning & File Triage Hub</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Inspect exact reasons why files were duplicated or locked/blocked. Safely clear duplicates and resolve blockers with verified evidence preservation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAIAgent('Explain why duplicate files were flagged and why tasks are blocked')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Root-Cause Copilot</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between">
          <span>✓ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Grid: Duplicates Section & Blocked Files Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Duplicate Files & Reasons */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Duplicate Update Files ({duplicates.length})
                </h3>
              </div>
              {duplicates.length > 0 && (
                <button
                  onClick={handleClearDuplicates}
                  disabled={clearingDups}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearingDups ? 'Clearing...' : 'Clear Duplicates'}</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-3">
              Records flagged by exact source ID, SHA-256 hash, or $\ge 80\%$ sequence similarity. Clear duplicates to maintain clean summaries.
            </p>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading duplicates...</div>
            ) : duplicates.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No duplicate files active!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Database is clean and free of redundancy.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {duplicates.map((dup) => (
                  <div
                    key={dup.id}
                    className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {dup.source_id}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {dup.duplicate_type.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium">"{dup.text}"</p>

                    {/* Explicit Reason Why File Is Duplicated */}
                    <div className="bg-white p-2.5 rounded-lg border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-amber-800">
                        <Info className="w-3.5 h-3.5" />
                        <span>Why this file was duplicated:</span>
                      </div>
                      <p>{dup.duplicate_reason}</p>
                      <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                        <span>Original: {dup.primary_source_id}</span>
                        <span>Similarity Score: {(dup.similarity_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Blocked / Locked Files & Reasons */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Blocked / Locked Tasks & Files ({blockers.length})
                </h3>
              </div>
              {blockers.length > 0 && (
                <button
                  onClick={handleClearAllBlockers}
                  disabled={clearingBlockers}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{clearingBlockers ? 'Resolving...' : 'Clear Blockers'}</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-3">
              Work items locked by failing integration tests, pending security approvals, or high latency regressions.
            </p>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading blockers...</div>
            ) : blockers.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">All tasks unlocked!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No active blockers impede delivery.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {blockers.map((blk) => (
                  <div
                    key={blk.id}
                    className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/80 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-900 bg-white px-2 py-0.5 rounded border border-rose-200">
                        {blk.work_item_id}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {blk.severity} Severity
                      </span>
                    </div>

                    {/* Explicit Reason Why File Is Locked / Blocked */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-rose-900 block">
                        Reason why task is locked / blocked:
                      </span>
                      <p className="text-slate-800 font-medium">{blk.issue_text}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-rose-200/60 text-[11px] space-y-1 text-slate-700">
                      <div>
                        <strong>Impact:</strong> {blk.impact}
                      </div>
                      <div>
                        <strong>Owner Responsible:</strong> {blk.owner}
                      </div>
                      <div className="text-emerald-700 font-semibold pt-1">
                        <strong>Required Next Action:</strong> {blk.next_action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
