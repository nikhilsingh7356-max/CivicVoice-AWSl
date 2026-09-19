import React from 'react';
import { CivicPriority } from '../types';
import { ShieldAlert, AlertTriangle, Clock, Users, Activity, Sparkles, CheckCircle2 } from 'lucide-react';

interface CivicSeverityCardProps {
  score: number; // 1.0 - 10.0
  priority: CivicPriority;
  urgency: string;
  safetyConcern: string;
  citizenImpact: string;
  className?: string;
}

export const CivicSeverityCard: React.FC<CivicSeverityCardProps> = ({
  score,
  priority,
  urgency,
  safetyConcern,
  citizenImpact,
  className = '',
}) => {
  // Score percentage for gauge (1.0 - 10.0)
  const percentage = Math.min(100, Math.max(10, (score / 10) * 100));

  // Determine color scheme based on score & priority
  const isCritical = score >= 9.0 || priority === 'CRITICAL';
  const isHigh = !isCritical && (score >= 7.5 || priority === 'HIGH');
  const isMedium = !isCritical && !isHigh && (score >= 5.0 || priority === 'MEDIUM');

  const theme = isCritical
    ? {
        border: 'border-red-200',
        bg: 'bg-red-50/50',
        text: 'text-red-700',
        badgeBg: 'bg-red-100 text-red-800 border-red-200',
        meterBg: 'bg-red-600',
        glow: 'shadow-red-100',
        label: 'CRITICAL SEVERITY',
      }
    : isHigh
    ? {
        border: 'border-amber-200',
        bg: 'bg-amber-50/40',
        text: 'text-amber-800',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        meterBg: 'bg-amber-500',
        glow: 'shadow-amber-100',
        label: 'HIGH SEVERITY',
      }
    : isMedium
    ? {
        border: 'border-blue-200',
        bg: 'bg-blue-50/30',
        text: 'text-blue-800',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
        meterBg: 'bg-blue-600',
        glow: 'shadow-blue-100',
        label: 'MEDIUM SEVERITY',
      }
    : {
        border: 'border-slate-200',
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        meterBg: 'bg-slate-600',
        glow: 'shadow-slate-100',
        label: 'STANDARD SEVERITY',
      };

  return (
    <div
      id="card-ai-civic-severity-assessment"
      className={`rounded-xl border ${theme.border} bg-white shadow-xs overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AI Civic Severity & Urgency Assessment
            </h4>
            <p className="text-[10px] text-slate-400">
              Multimodal multi-factor triage algorithm
            </p>
          </div>
        </div>

        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${theme.badgeBg}`}>
          {theme.label}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Score & Gauge Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white border-2 border-slate-200 shadow-2xs">
              <span className="text-xl font-black tracking-tight text-slate-900 font-mono">
                {score.toFixed(1)}
              </span>
              <span className="absolute -bottom-1 text-[9px] font-bold text-slate-400 uppercase">
                /10
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Compound Severity Score
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  AI-Weighted
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluated from public exposure, incident velocity, and infrastructure vulnerability
              </p>
            </div>
          </div>

          {/* Meter Bar */}
          <div className="w-full sm:w-48 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Minor (1.0)</span>
              <span>Critical (10.0)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${theme.meterBg} transition-all duration-500 rounded-full`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Triple Factor Grid: Urgency, Safety Concern, Public Impact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Estimated Urgency */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Response Window</span>
            </div>
            <p className="text-xs font-semibold text-slate-900 leading-snug">
              {urgency || 'Standard (< 72 hours)'}
            </p>
          </div>

          {/* Safety Concern */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Safety Assessment</span>
            </div>
            <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
              {safetyConcern || 'Standard infrastructure maintenance precautions'}
            </p>
          </div>

          {/* Public Impact */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Public Exposure</span>
            </div>
            <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
              {citizenImpact || 'Commuter and pedestrian corridor hindrance'}
            </p>
          </div>
        </div>

        {/* Human Authority Caution Notice */}
        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Human-in-the-Loop Governance: </span>
            Severity scores and urgency brackets are advisory recommendations generated by Amazon Bedrock AI for operational triage. The statutory municipal engineer retains final dispatch and action authority.
          </div>
        </div>
      </div>
    </div>
  );
};
