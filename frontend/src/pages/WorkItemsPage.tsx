import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  ShieldCheck,
  ChevronRight,
  GitBranch
} from 'lucide-react';
import { api } from '../services/api';
import { WorkItemSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface WorkItemsPageProps {
  onSelectWorkItem: (id: string) => void;
  refreshTrigger: number;
}

export const WorkItemsPage: React.FC<WorkItemsPageProps> = ({ onSelectWorkItem, refreshTrigger }) => {
  const [items, setItems] = useState<WorkItemSummary[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkItems(filterStatus === 'all' ? undefined : filterStatus);
      setItems(data);
    } catch (err) {
      console.error('Failed to load work items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filterStatus, refreshTrigger]);

  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      (item.current_owner && item.current_owner.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Work Items & State Resolution
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Deterministic status tracking, progress claims, dependencies, and linked source evidence.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          {['all', 'blocked', 'conflict', 'in_progress', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-md capitalize transition-all ${
                filterStatus === st
                  ? 'bg-white text-navy-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter work items by ID (e.g. TASK-204, AUTH-101), title, or owner..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
        />
      </div>

      {/* Work Items Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading work items from state engine...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 text-slate-500">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No work items found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectWorkItem(item.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {item.id}
                  </span>
                  <StatusBadge status={item.resolved_status} />
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                  {item.progress_summary || 'No progress summary recorded.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                {/* Dependencies tag if any */}
                {item.dependencies.length > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded text-[11px] font-medium border border-amber-200">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Depends on: {item.dependencies.join(', ')}</span>
                  </div>
                )}

                {/* Conflict / Blocker tags */}
                <div className="flex items-center gap-2">
                  {item.active_blockers_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertOctagon className="w-3 h-3" />
                      {item.active_blockers_count} Blocker
                    </span>
                  )}
                  {item.unresolved_conflicts_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <AlertTriangle className="w-3 h-3" />
                      Conflict
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-slate-600 font-medium truncate max-w-[120px]">
                      {item.current_owner || 'Unassigned'}
                    </span>
                  </div>
                  <span className="text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    <span>{item.message_count} Updates</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
