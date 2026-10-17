import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  AlertTriangle,
  Copy,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Search,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { AIAgentTriageResult } from '../types';

interface AIAgentCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const AIAgentCopilotModal: React.FC<AIAgentCopilotModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAgentTriageResult | null>(null);

  const runTriage = async (customQuery?: string) => {
    try {
      setLoading(true);
      const text = customQuery !== undefined ? customQuery : query;
      const res = await api.getAIAgentTriage(text || undefined);
      setResult(res);
    } catch (err: any) {
      alert(`AI Agent query error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTriage(initialQuery);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Summarize team progress and completed tasks',
    'What is blocking our current release?',
    'Explain why duplicate files were flagged',
    'Summarize active conflicts and owners',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-purple-950 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">DailySignal AI Intelligence Agent</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Deterministic + LLM
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Automated team progress summarization, blocker explanation, and duplicate file reasoning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(p);
                  runTriage(p);
                }}
                className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-indigo-500" />
                <span>{p}</span>
              </button>
            ))}
          </div>

          {/* AI Response Box */}
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                AI Agent is synthesizing progress reports, active blockers, and duplicate logs...
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Executive AI Synthesis</span>
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {result.summary}
                </p>
              </div>

              {/* Status Metrics Bar */}
              {result.metrics && (
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Completed</span>
                    <strong className="text-emerald-600 font-bold text-sm">
                      {result.metrics.completed} / {result.metrics.total_items}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">In Progress</span>
                    <strong className="text-blue-600 font-bold text-sm">
                      {result.metrics.in_progress}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Blocked Files</span>
                    <strong className="text-rose-600 font-bold text-sm">
                      {result.metrics.blocked}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Duplicates</span>
                    <strong className="text-amber-600 font-bold text-sm">
                      {result.metrics.duplicates}
                    </strong>
                  </div>
                </div>
              )}

              {/* Insights List */}
              {result.insights && result.insights.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-900 block">
                    Detailed Explanations & Root Causes:
                  </span>
                  <div className="space-y-1.5">
                    {result.insights.map((insight, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Next Actions */}
              {result.recommended_actions && result.recommended_actions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-900 block">
                    Recommended Triage Actions:
                  </span>
                  <div className="space-y-1.5">
                    {result.recommended_actions.map((act, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-800 font-medium">{act.action}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          {act.target}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Query Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runTriage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask AI agent (e.g. 'Why is TASK-204 blocked?', 'Summarize team progress')..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <span>Ask Agent</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
