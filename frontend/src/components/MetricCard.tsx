import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'teal' | 'rose' | 'amber' | 'indigo' | 'slate';
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'slate',
  trend,
}) => {
  const variantStyles = {
    teal: {
      bg: 'bg-teal-50/50 hover:bg-teal-50/80',
      border: 'border-teal-200',
      iconBg: 'bg-teal-500/10 text-teal-600 border-teal-200',
      valueColor: 'text-teal-900',
    },
    rose: {
      bg: 'bg-rose-50/50 hover:bg-rose-50/80',
      border: 'border-rose-200',
      iconBg: 'bg-rose-500/10 text-rose-600 border-rose-200',
      valueColor: 'text-rose-900',
    },
    amber: {
      bg: 'bg-amber-50/50 hover:bg-amber-50/80',
      border: 'border-amber-200',
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-200',
      valueColor: 'text-amber-900',
    },
    indigo: {
      bg: 'bg-indigo-50/50 hover:bg-indigo-50/80',
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
      valueColor: 'text-indigo-900',
    },
    slate: {
      bg: 'bg-white hover:bg-slate-50',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
      valueColor: 'text-slate-900',
    },
  }[variant];

  return (
    <div className={`p-5 rounded-xl border ${variantStyles.bg} ${variantStyles.border} shadow-sm transition-all hover:shadow-md flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${variantStyles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold tracking-tight ${variantStyles.valueColor}`}>
            {value}
          </span>
          {trend && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {trend}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
