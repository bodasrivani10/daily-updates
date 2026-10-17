import React from 'react';
import { UploadCloud, CheckCircle, Copy, FolderGit2, Compass, AlertOctagon, FileText } from 'lucide-react';

interface PipelineStepperProps {
  currentStage?: number;
  onSelectStage?: (stage: number) => void;
}

const STAGES = [
  { id: 1, name: '1. Ingest', icon: UploadCloud, desc: 'CSV, JSON & raw updates' },
  { id: 2, name: '2. Validate', icon: CheckCircle, desc: 'Type & semantic checks' },
  { id: 3, name: '3. Deduplicate', icon: Copy, desc: '3-tier fuzzy & exact' },
  { id: 4, name: '4. Group', icon: FolderGit2, desc: 'Work-item assignment' },
  { id: 5, name: '5. State Resolve', icon: Compass, desc: 'Deterministic rules' },
  { id: 6, name: '6. Triage', icon: AlertOctagon, desc: 'Blockers & conflicts' },
  { id: 7, name: '7. Cited Digest', icon: FileText, desc: 'Evidence-backed brief' },
];

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ currentStage = 7, onSelectStage }) => {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
            7-Stage Reliable Processing Pipeline
          </span>
        </div>
        <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          Deterministic Data Engine + Cited AI
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map((s) => {
          const Icon = s.icon;
          const isDone = s.id <= currentStage;
          const isCurrent = s.id === currentStage;

          return (
            <div
              key={s.id}
              onClick={() => onSelectStage && onSelectStage(s.id)}
              className={`flex flex-col p-2.5 rounded-lg border transition-all text-left ${
                isCurrent
                  ? 'bg-navy-900 text-white border-navy-800 shadow-md ring-2 ring-teal-500/50'
                  : isDone
                  ? 'bg-teal-50/50 text-slate-800 border-teal-200 hover:bg-teal-50 cursor-pointer'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? 'bg-teal-500 text-white'
                      : isDone
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-[10px] font-mono font-medium ${isCurrent ? 'text-teal-300' : 'text-slate-400'}`}>
                  Stage {s.id}
                </span>
              </div>
              <p className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                {s.name}
              </p>
              <p className={`text-[11px] truncate mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                {s.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
