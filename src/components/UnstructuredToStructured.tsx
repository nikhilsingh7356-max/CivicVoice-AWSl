import React from 'react';
import { BedrockAnalysisResult, CivicCase } from '../types';
import { PriorityBadge, CategoryBadge } from './StatusBadge';
import { ArrowRight, Sparkles, User, Cpu, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';

interface UnstructuredToStructuredProps {
  rawInput: string;
  analysis: BedrockAnalysisResult | CivicCase;
  location?: string;
}

export const UnstructuredToStructured: React.FC<UnstructuredToStructuredProps> = ({
  rawInput,
  analysis,
  location,
}) => {
  return (
    <div
      id="unstructured-to-structured-container"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
    >
      <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Intake Transformation: Unstructured Voice → Structured Civic Intelligence
            </h3>
            <p className="text-[11px] text-slate-400">
              Eliminates rigid administrative forms via Amazon Bedrock Multimodal extraction
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Amazon Bedrock 2.5 Flash Core
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left: Raw Citizen Input */}
        <div className="lg:col-span-5 p-5 bg-slate-50/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-slate-500">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Raw Citizen Input
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {analysis.language || 'Natural Voice/Text'}
              </span>
            </div>

            <div className="rounded-lg bg-white border border-slate-200 p-4 font-mono text-xs text-slate-800 leading-relaxed shadow-2xs relative">
              <div className="absolute top-2 right-2 text-slate-300">
                <span className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider">Unfiltered</span>
              </div>
              "{rawInput || 'No raw complaint provided'}"
            </div>

            {location && (
              <div className="mt-3 text-xs text-slate-600 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Reported Locality:</span>
                <span className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {location}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
            <span>Traditional intake requires filling 12 form fields.</span>
            <div className="hidden lg:flex items-center gap-1 text-blue-700 font-medium">
              <span>Transformed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Right: Structured Civic Intelligence */}
        <div className="lg:col-span-7 p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-blue-900">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              Structured Civic Intelligence
            </span>
            <PriorityBadge priority={analysis.priority} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] uppercase font-semibold text-slate-500 block">Category</span>
              <div className="mt-1 flex items-center gap-1.5">
                <CategoryBadge category={analysis.category} />
                <span className="text-[11px] text-slate-600 font-medium truncate">{analysis.subcategory}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] uppercase font-semibold text-slate-500 block">Department Routing</span>
              <div className="mt-1 flex items-center gap-1 text-slate-900 font-medium truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{analysis.department}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] uppercase font-semibold text-slate-500 block">Severity Assessment</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {analysis.severity_score}/10
                </span>
                <span className="text-[11px] text-slate-500">({analysis.estimated_urgency})</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] uppercase font-semibold text-slate-500 block">Model Confidence</span>
              <div className="mt-1 flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-mono">{analysis.confidence || 'High (91%)'}</span>
              </div>
            </div>
          </div>

          {/* Citizen Impact & Recommended Action */}
          <div className="mt-3 space-y-2 text-xs">
            <div className="p-2.5 rounded-lg border border-amber-200/80 bg-amber-50/50">
              <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-700" />
                Identified Public Impact
              </span>
              <p className="text-amber-950 mt-0.5 leading-relaxed font-normal">
                {analysis.citizen_impact}
              </p>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide block">
                Primary Recommended Operational Step
              </span>
              <p className="text-slate-800 mt-0.5 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>
                  {Array.isArray(analysis.recommended_action)
                    ? analysis.recommended_action[0]
                    : analysis.recommended_action}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
