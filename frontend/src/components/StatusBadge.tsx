import React from 'react';
import { CheckCircle2, AlertOctagon, Clock, AlertTriangle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', showIcon = true }) => {
  const normalized = (status || 'unknown').toLowerCase();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-medium',
  }[size];

  switch (normalized) {
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200 ${sizeClasses}`}>
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
          <span>Completed</span>
        </span>
      );
    case 'blocked':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          {showIcon && <AlertOctagon className="w-3.5 h-3.5 text-rose-600 animate-pulse" />}
          <span>Blocked</span>
        </span>
      );
    case 'in_progress':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
          {showIcon && <Clock className="w-3.5 h-3.5 text-indigo-600" />}
          <span>In Progress</span>
        </span>
      );
    case 'conflict':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses}`}>
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          <span>Conflict</span>
        </span>
      );
    case 'needs_review':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          <span>Needs Review</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-slate-500" />}
          <span>{status || 'Unknown'}</span>
        </span>
      );
  }
};
