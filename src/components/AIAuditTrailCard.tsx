import React, { useState } from 'react';
import { AIAuditTrail } from '../types';
import { Shield, CheckCircle2, ChevronDown, ChevronUp, Cpu, Clock, Terminal, UserCheck } from 'lucide-react';

interface AIAuditTrailCardProps {
  audit?: AIAuditTrail;
  caseId: string;
  className?: string;
}

export const AIAuditTrailCard: React.FC<AIAuditTrailCardProps> = ({
  audit,
  caseId,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!audit) return null;

  return (
    <div
      id="card-ai-audit-trail"
      className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden ${className}`}
    >
      <div 
        className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AI Audit & Sovereign Governance Record
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Verified Triage
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
            {audit.model}
          </span>
          <button 
            type="button" 
            aria-label={isExpanded ? "Collapse audit record" : "Expand audit record"}
            className="text-slate-400 hover:text-white"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4 text-slate-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Analyzed: {new Date(audit.analyzed_at).toLocaleString()}</span>
          </div>
          {audit.latency_ms && (
            <div className="flex items-center gap-1.5 font-mono text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>{audit.latency_ms}ms inference</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Inputs:</span>
          {audit.input_modalities.map((m, idx) => (
            <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded Reasoning & Governance Statement */}
      <div className={`p-4 space-y-3 ${isExpanded ? 'block' : 'hidden'}`}>
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
            Reasoning Chain Summary
          </span>
          <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed border border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] mb-1 font-sans font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              <span>Amazon Bedrock Decision Path</span>
            </div>
            {audit.reasoning_summary}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-start gap-2.5">
          <UserCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 leading-relaxed">
            <span className="font-bold block text-emerald-900">BRICS Human Authority Principle:</span>
            {audit.human_governance_notice || 'All algorithmic triage outputs are non-autonomous recommendations. Statutory public officers retain unilateral authority for physical dispatches, budgets, and case closure.'}
          </div>
        </div>
      </div>
    </div>
  );
};
