import React, { useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface CitationBadgeProps {
  sourceId: string;
  onClick: (sourceId: string) => void;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({ sourceId, onClick }) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(sourceId);
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 text-xs font-mono font-medium rounded bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 hover:border-teal-400 hover:shadow transition-all group cursor-pointer"
      title={`Click to view verified evidence for ${sourceId}`}
    >
      <ShieldCheck className="w-3 h-3 text-teal-600 group-hover:scale-110 transition-transform" />
      <span>{sourceId}</span>
      <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
    </button>
  );
};
