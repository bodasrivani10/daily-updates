import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Layers,
  ArrowRight,
  RefreshCw,
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { ImportBatchItem, ValidationErrorItem, ValidationWarningItem } from '../types';

interface ImportPageProps {
  onRefreshData?: () => void;
  userRole: string;
}

const SAMPLE_JSON_SNIPPET = `[
  {
    "source_id": "msg-2001",
    "timestamp": "2026-10-17T12:00:00+05:30",
    "author": "Jordan",
    "work_item_id": "AUTH-101",
    "text": "SecOps completed threat model review; approval granted for staging.",
    "visibility": "team",
    "source_system": "slack"
  },
  {
    "source_id": "msg-2002",
    "timestamp": "2026-10-17T12:30:00+05:30",
    "author": "Marcus",
    "work_item_id": "TASK-204",
    "text": "Integration test patch committed; rerunning regression suite.",
    "visibility": "team",
    "source_system": "github"
  }
]`;

export const ImportPage: React.FC<ImportPageProps> = ({ onRefreshData, userRole }) => {
  const [batches, setBatches] = useState<ImportBatchItem[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatchItem | null>(null);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON_SNIPPET);
  const [activeTab, setActiveTab] = useState<'file' | 'manual'>('file');
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchBatches = async () => {
    try {
      const data = await api.getImports();
      setBatches(data);
      if (data.length > 0 && !selectedBatch) {
        const firstDetail = await api.getImportDetail(data[0].id);
        setSelectedBatch(firstDetail);
      }
    } catch (err) {
      console.error('Failed to load imports', err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setUploadResult(null);
      const res = await api.uploadFile(file, userRole);
      setUploadResult(res);
      await fetchBatches();
      const detail = await api.getImportDetail(res.import_id);
      setSelectedBatch(detail);
      onRefreshData && onRefreshData();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    try {
      setLoading(true);
      setUploadResult(null);
      const res = await api.uploadJson(jsonText, userRole);
      setUploadResult(res);
      await fetchBatches();
      const detail = await api.getImportDetail(res.import_id);
      setSelectedBatch(detail);
      onRefreshData && onRefreshData();
    } catch (err: any) {
      alert(`Invalid JSON or Import Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBatch = async (b: ImportBatchItem) => {
    try {
      const detail = await api.getImportDetail(b.id);
      setSelectedBatch(detail);
    } catch (err) {
      setSelectedBatch(b);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Daily Updates Ingestion & Validation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Accepts CSV, JSON, and manual updates. Enforces structural, semantic, security, and deduplication checks.
          </p>
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            await api.loadStarterFixtures();
            await fetchBatches();
            onRefreshData && onRefreshData();
            setLoading(false);
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-teal-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Load Starter Dataset (5 Critical Facts)</span>
        </button>
      </div>

      {/* Upload Zone & Manual Ingestion Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('file')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'file'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload CSV / JSON File</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'manual'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Direct JSON Payload Entry</span>
            </button>
          </div>

          {activeTab === 'file' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive ? 'border-teal-500 bg-teal-50/50' : 'border-slate-300 hover:border-teal-400 bg-slate-50/50'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Drag and drop your CSV or JSON daily updates here
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Supports standardized update schemas with timestamp normalization
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition-all active:scale-95">
                <span>Browse Local Files</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                JSON Payload (Array of update objects):
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={9}
                className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleManualSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processing Pipeline...' : 'Validate and Ingest JSON Batch'}
              </button>
            </div>
          )}

          {/* Quick Result Alert if available */}
          {uploadResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              uploadResult.rejected_rows > 0
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Batch Processed: {uploadResult.import_id}
                </span>
                <span className="font-mono">
                  {uploadResult.accepted_rows} Accepted / {uploadResult.rejected_rows} Rejected / {uploadResult.duplicate_count} Duplicates
                </span>
              </div>
              {uploadResult.rejected_rows > 0 && (
                <p className="text-amber-800">
                  {uploadResult.rejected_rows} row(s) had fatal validation errors. Inspect the validation error log below.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Audit History: Ingested Batches */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Import Batch Audit Trail
              </h2>
              <span className="text-xs font-mono font-medium text-slate-500">
                {batches.length} Batches
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {batches.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectBatch(b)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedBatch?.id === b.id
                      ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                    <span className="font-mono truncate max-w-[160px]">{b.filename}</span>
                    <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Accepted: <strong className="text-slate-700">{b.accepted_rows}</strong> / {b.total_rows}</span>
                    <span>Dups: <strong className="text-amber-700">{b.duplicate_count}</strong></span>
                    <span className="text-slate-400">{b.created_at.split('T')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Audit retention: Full source metadata preserved</span>
            <span className="font-mono text-teal-600 font-medium">SQLite / Postgres</span>
          </div>
        </div>
      </div>

      {/* Selected Batch Drilldown: Row Errors, Warnings, and Deduplication Report */}
      {selectedBatch && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border">
                  Batch: {selectedBatch.id}
                </span>
                <span className="text-xs text-slate-500">File: {selectedBatch.filename}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Row-level validation errors, deduplication decisions, and warnings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                {selectedBatch.accepted_rows} Valid
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                {selectedBatch.rejected_rows} Rejected
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                {selectedBatch.duplicate_count} Deduplicated
              </span>
            </div>
          </div>

          {/* Validation Errors Table */}
          {selectedBatch.errors && selectedBatch.errors.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                <span>Rejected Rows ({selectedBatch.errors.length})</span>
              </h3>
              <div className="border border-rose-200 rounded-lg overflow-x-auto bg-rose-50/30">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-100/60 text-rose-900 font-bold border-b border-rose-200">
                    <tr>
                      <th className="p-2.5">Row #</th>
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Problem / Issue</th>
                      <th className="p-2.5">Suggested Correction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200/50">
                    {selectedBatch.errors.map((e, idx) => (
                      <tr key={idx} className="hover:bg-rose-100/30">
                        <td className="p-2.5 font-mono font-bold text-rose-900">Row {e.row_number}</td>
                        <td className="p-2.5 font-mono text-rose-800">{e.field || 'General'}</td>
                        <td className="p-2.5 text-rose-900 font-medium">{e.issue}</td>
                        <td className="p-2.5 text-slate-700">{e.suggested_correction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All records in this batch passed structural and type validation without fatal rejections.</span>
            </div>
          )}

          {/* Warnings List */}
          {selectedBatch.warnings && selectedBatch.warnings.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Warnings & Auto-Corrected Items ({selectedBatch.warnings.length})</span>
              </h3>
              <div className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50/20 divide-y divide-amber-200/50 text-xs">
                {selectedBatch.warnings.map((w, idx) => (
                  <div key={idx} className="p-2.5 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-mono font-bold text-amber-900 mr-2">Row {w.row_number}:</span>
                      <span className="text-amber-800">{w.warning}</span>
                    </div>
                    <span className="text-slate-600 text-[11px] shrink-0 font-medium">
                      Action: {w.action_taken}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
