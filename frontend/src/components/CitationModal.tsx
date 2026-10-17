import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Clock, User, Tag, Layers, AlertCircle, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

interface CitationModalProps {
  sourceId: string | null;
  onClose: () => void;
  onSelectWorkItem?: (id: string) => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ sourceId, onClose, onSelectWorkItem }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sourceId) return;
    setLoading(true);
    setError(null);
    api.getCitation(sourceId)
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Evidence record not found'))
      .finally(() => setLoading(false));
  }, [sourceId]);

  if (!sourceId) return null;

  const handleCopy = () => {
    if (data?.text) {
      navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-navy-800 to-slate-900 text-white flex items-center justify-between border-b border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base font-mono text-teal-300">{sourceId}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-400/20 text-teal-200 border border-teal-400/30">
                  Verified Source
                </span>
              </div>
              <p className="text-xs text-slate-300">Primary audit evidence trace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Fetching verified source citation from database...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Citation Lookup Error</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-4">
              {/* Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Author</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{data.author}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Timestamp</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate" title={data.timestamp}>
                    {data.timestamp.split('T')[1]?.substring(0, 5) || data.timestamp}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Work Item</span>
                  </div>
                  {data.work_item_id ? (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectWorkItem && onSelectWorkItem(data.work_item_id);
                      }}
                      className="text-xs font-mono font-bold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      {data.work_item_id}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400">Unassigned</p>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Origin</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700 capitalize">
                    {data.source_system}
                  </span>
                </div>
              </div>

              {/* Deduplication & Visibility Notice */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  data.visibility === 'restricted'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  Visibility: {data.visibility}
                </span>

                {data.is_duplicate ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Duplicate ({data.duplicate_type})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Primary Unique Record
                  </span>
                )}
              </div>

              {data.duplicate_reason && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <span className="font-semibold">Deduplication Note:</span> {data.duplicate_reason}
                </div>
              )}

              {/* Original Raw Text Block */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1.5">
                  <span>Exact Recorded Content</span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-teal-600 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-sm leading-relaxed border border-slate-800 shadow-inner select-all">
                  {data.text}
                </div>
              </div>

              {/* Work item snapshot if available */}
              {data.work_item && (
                <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 text-xs text-teal-900">
                  <span className="font-semibold">{data.work_item.id}:</span> {data.work_item.title} — Status: <span className="font-bold uppercase">{data.work_item.resolved_status}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
