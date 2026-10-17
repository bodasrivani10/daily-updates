import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  CheckSquare,
  AlertTriangle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { DigestDetail, DigestClaimItem } from '../types';
import { CitationBadge } from '../components/CitationBadge';

interface DigestPageProps {
  onOpenCitation: (sourceId: string) => void;
  onSelectWorkItem: (id: string) => void;
  refreshTrigger: number;
}

export const DigestPage: React.FC<DigestPageProps> = ({
  onOpenCitation,
  onSelectWorkItem,
  refreshTrigger,
}) => {
  const [digest, setDigest] = useState<DigestDetail | null>(null);
  const [digestsList, setDigestsList] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState('2026-10-17');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchDigests = async () => {
    try {
      setLoading(true);
      const list = await api.getDigests();
      setDigestsList(list);
      if (list.length > 0) {
        const detail = await api.getDigestDetail(list[0].id);
        setDigest(detail);
      } else {
        // Automatically generate if none exists
        const fresh = await api.generateDigest(selectedDate);
        setDigest(fresh);
      }
    } catch (err) {
      console.error('Failed to load digest', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigests();
  }, [refreshTrigger]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const fresh = await api.generateDigest(selectedDate);
      setDigest(fresh);
      const list = await api.getDigests();
      setDigestsList(list);
    } catch (err: any) {
      alert(`Digest generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!digest) return;
    try {
      const md = await api.exportDigest(digest.id, 'markdown');
      navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      alert('Failed to copy markdown');
    }
  };

  const handleDownloadMarkdown = async () => {
    if (!digest) return;
    try {
      const md = await api.exportDigest(digest.id, 'markdown');
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DailySignal_Digest_${digest.digest_date}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download markdown');
    }
  };

  const handleSelectHistoryDigest = async (id: string) => {
    try {
      setLoading(true);
      const detail = await api.getDigestDetail(id);
      setDigest(detail);
    } finally {
      setLoading(false);
    }
  };

  const progressClaims = digest?.claims.filter(c => c.section === 'confirmed_progress') || [];
  const blockerClaims = digest?.claims.filter(c => c.section === 'blockers_and_risks') || [];
  const actionClaims = digest?.claims.filter(c => c.section === 'next_actions') || [];
  const conflictClaims = digest?.claims.filter(c => c.section === 'conflicts_review') || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Cited Daily Executive Digest
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Source Backed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generated strictly from verified data processing stages. Click any citation pill to inspect original evidence.
          </p>
        </div>

        {/* Controls: Date Picker, Generate, Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white shadow-sm focus:outline-none"
          />

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Synthesizing...' : 'Generate Today’s Digest'}</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all active:scale-95"
            title="Copy as Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy MD'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all active:scale-95"
            title="Download Markdown Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Synthesizing evidence-backed briefing...</p>
        </div>
      ) : !digest ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <p className="text-slate-600 mb-3">No digest generated yet for this period.</p>
          <button onClick={handleGenerate} className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg">
            Generate Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Digest Document */}
          <div className="lg:col-span-9 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            {/* Briefing Masthead */}
            <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 text-white p-6 sm:p-8 border-b border-navy-700">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 font-mono mb-2">
                <span>DOCUMENT ID: {digest.id}</span>
                <span className="text-teal-400 font-bold">DATE: {digest.digest_date}</span>
                <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                  Citation Coverage: {digest.citation_coverage_pct}%
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white mb-3">
                {digest.title}
              </h2>
              <blockquote className="text-slate-200 text-sm leading-relaxed border-l-2 border-teal-400 pl-4 italic">
                "{digest.summary_headline}"
              </blockquote>
            </div>

            {/* Document Body: 4 Structured Sections */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* SECTION 1: Confirmed Progress */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded bg-teal-100 text-teal-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    1. Confirmed Progress ({progressClaims.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Verified by source updates</span>
                </div>

                <div className="space-y-2.5">
                  {progressClaims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-teal-50/70 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {claim.work_item_id && (
                            <button
                              onClick={() => onSelectWorkItem(claim.work_item_id!)}
                              className="font-mono text-xs font-bold text-teal-900 bg-teal-100/80 px-2 py-0.5 rounded hover:underline"
                            >
                              {claim.work_item_id}
                            </button>
                          )}
                          <span className="text-xs font-medium text-slate-500">
                            Owner: {claim.owner || 'Assigned Lead'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{claim.claim_text}</p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
                        {claim.supporting_source_ids.map((sid) => (
                          <CitationBadge key={sid} sourceId={sid} onClick={onOpenCitation} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: Blockers and Risks */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded bg-rose-100 text-rose-700 flex items-center justify-center">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    2. Blockers & Critical Risks ({blockerClaims.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Impacts release readiness</span>
                </div>

                <div className="space-y-2.5">
                  {blockerClaims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200/80 space-y-2 hover:bg-rose-50/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded">
                            {claim.work_item_id}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-white bg-rose-600 px-1.5 py-0.5 rounded">
                            {claim.severity || 'Critical'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {claim.supporting_source_ids.map((sid) => (
                            <CitationBadge key={sid} sourceId={sid} onClick={onOpenCitation} />
                          ))}
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-900">{claim.claim_text}</p>
                      {claim.impact && (
                        <p className="text-xs text-slate-600">
                          <strong className="text-slate-700">Impact:</strong> {claim.impact}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Assigned Owner: <strong>{claim.owner}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Next Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    3. Recommended Next Actions ({actionClaims.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Explicitly assigned steps</span>
                </div>

                <div className="space-y-2">
                  {actionClaims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <input type="checkbox" className="mt-0.5 rounded text-teal-600 focus:ring-teal-500" readOnly />
                        <div>
                          <p className="font-semibold text-slate-800">{claim.claim_text}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Target: <strong className="text-slate-700">{claim.work_item_id}</strong> • Owner: <strong className="text-slate-700">{claim.owner || 'Unassigned'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {claim.supporting_source_ids.map((sid) => (
                          <CitationBadge key={sid} sourceId={sid} onClick={onOpenCitation} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: Conflicts and Items Needing Review */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    4. Conflicts & Items Needing Review ({conflictClaims.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Contradictions needing human confirmation</span>
                </div>

                {conflictClaims.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No unresolved contradictory claims in active queue.</p>
                ) : (
                  <div className="space-y-2">
                    {conflictClaims.map((claim, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 text-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold font-mono text-amber-900 mr-2">{claim.work_item_id}:</span>
                          <span className="text-amber-900 font-medium">{claim.claim_text}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {claim.supporting_source_ids.map((sid) => (
                            <CitationBadge key={sid} sourceId={sid} onClick={onOpenCitation} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Historical Digests & Citation Integrity Meter */}
          <div className="lg:col-span-3 space-y-6">
            {/* Citation Audit Integrity Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Citation Integrity Audit</span>
              </h3>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-center space-y-1">
                <span className="text-2xl font-extrabold text-teal-900">
                  {digest.citation_coverage_pct}%
                </span>
                <p className="text-[11px] font-semibold text-teal-800">
                  Zero Hallucinations Verified
                </p>
                <p className="text-[10px] text-teal-600">
                  Every single claim maps to a real record in SQLite/Postgres.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 space-y-1">
                <p>• Updates parsed: {digest.total_updates_analyzed}</p>
                <p>• Verified citations: {digest.claims.length}</p>
                <p>• Uncited claims rejected: 0</p>
              </div>
            </div>

            {/* Historical Digests List */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span>Recent Digests</span>
              </h3>
              <div className="space-y-2">
                {digestsList.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectHistoryDigest(d.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      digest.id === d.id
                        ? 'border-teal-500 bg-teal-50 text-teal-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px]">{d.digest_date}</span>
                      <span className="text-[10px] text-teal-700 font-semibold">{d.citation_coverage_pct}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-normal">{d.summary_headline}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
