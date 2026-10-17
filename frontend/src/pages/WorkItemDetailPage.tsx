import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  User,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  GitBranch,
  FileText,
  Calendar,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { WorkItemDetail } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CitationBadge } from '../components/CitationBadge';

interface WorkItemDetailPageProps {
  itemId: string;
  onBack: () => void;
  onOpenCitation: (sourceId: string) => void;
  onSelectWorkItem: (id: string) => void;
}

export const WorkItemDetailPage: React.FC<WorkItemDetailPageProps> = ({
  itemId,
  onBack,
  onOpenCitation,
  onSelectWorkItem,
}) => {
  const [item, setItem] = useState<WorkItemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkItemDetail(itemId);
      setItem(data);
    } catch (err) {
      console.error('Failed to load item detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [itemId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading work item audit trail...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
        <p className="text-slate-600 mb-4">Work item {itemId} not found.</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold">
          Back to Work Items
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Work Items</span>
      </button>

      {/* Main Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                {item.id}
              </span>
              <StatusBadge status={item.resolved_status} size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{item.title}</h1>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">Owner</span>
              <span className="font-semibold text-slate-800">{item.current_owner || 'Unassigned'}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">Last Activity</span>
              <span className="font-semibold text-slate-800">{item.last_updated.split('T')[1]?.substring(0, 5) || item.last_updated}</span>
            </div>
          </div>
        </div>

        {/* State Engine Progress Summary */}
        <div className="pt-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Resolved State:
          </span>
          <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {item.progress_summary || 'State determined by deterministic rule engine.'}
          </p>

          {item.dependencies.length > 0 && (
            <div className="flex items-center gap-2 pt-2 text-xs">
              <span className="font-semibold text-slate-600">Upstream Dependencies:</span>
              {item.dependencies.map((dep) => (
                <button
                  key={dep}
                  onClick={() => onSelectWorkItem(dep)}
                  className="font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold"
                >
                  {dep}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Events Timeline & Linked Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chronological Event History */}
        <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Status Event History</span>
            </h2>
            <span className="text-xs font-medium text-slate-400">{item.events.length} Events</span>
          </div>

          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {item.events.map((ev) => (
              <div key={ev.id} className="relative">
                <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                  ev.event_type === 'blocker_claim'
                    ? 'border-rose-500'
                    : ev.event_type === 'assignment'
                    ? 'border-amber-500'
                    : 'border-teal-500'
                }`} />
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 capitalize">{ev.event_type.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ev.timestamp.split('T')[1]?.substring(0, 5) || ev.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-600">{ev.notes}</p>
                  <p className="text-[11px] text-slate-400 font-medium">Logged by: {ev.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Linked Messages & Active Blockers */}
        <div className="lg:col-span-6 space-y-6">
          {/* Active Blockers on this item */}
          {item.blockers.length > 0 && (
            <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Active Impediments ({item.blockers.length})</span>
                </h3>
              </div>
              {item.blockers.map((b) => (
                <div key={b.id} className="bg-white p-3 rounded-lg border border-rose-200 text-xs space-y-1 shadow-sm">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-rose-900">{b.issue_text}</span>
                    <span className="uppercase text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{b.severity}</span>
                  </div>
                  <p className="text-slate-600"><strong className="text-slate-700">Impact:</strong> {b.impact}</p>
                  <p className="text-slate-600"><strong className="text-slate-700">Next Action:</strong> {b.next_action}</p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Owner: {b.owner}</span>
                    {b.source_id && (
                      <CitationBadge sourceId={b.source_id} onClick={onOpenCitation} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Linked Messages with Clickable Evidence Citations */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Linked Source Updates</span>
              </h2>
              <span className="text-xs font-medium text-slate-400">{item.messages.length} Records</span>
            </div>

            <div className="space-y-3">
              {item.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                    m.is_duplicate ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CitationBadge sourceId={m.source_id} onClick={onOpenCitation} />
                      <span className="font-semibold text-slate-800">{m.author}</span>
                      <span className="text-[10px] text-slate-400 capitalize">via {m.source_system}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {m.timestamp.split('T')[1]?.substring(0, 5) || m.timestamp}
                    </span>
                  </div>

                  <p className="text-slate-700 font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200/60 select-all">
                    "{m.text}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Visibility: {m.visibility}</span>
                    {m.is_duplicate && (
                      <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {m.duplicate_type}: {m.duplicate_reason || 'Duplicate match'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
