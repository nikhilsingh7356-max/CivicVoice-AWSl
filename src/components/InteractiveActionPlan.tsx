import React from 'react';
import { CheckSquare, Square, CheckCircle2, ListChecks, ShieldAlert, Sparkles } from 'lucide-react';

interface InteractiveActionPlanProps {
  steps: string[];
  completedSteps?: number[];
  onToggleStep?: (index: number) => void;
  readOnly?: boolean;
  className?: string;
}

export const InteractiveActionPlan: React.FC<InteractiveActionPlanProps> = ({
  steps,
  completedSteps = [],
  onToggleStep,
  readOnly = false,
  className = '',
}) => {
  const total = steps.length;
  const completedCount = completedSteps.length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div
      id="card-interactive-action-plan"
      className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden ${className}`}
    >
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            AI Recommended Operational Action Plan
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {completedCount}/{total} Steps Done
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            {progressPercent}%
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 italic">
          Standard Operating Procedure structured by Amazon Bedrock based on municipal civil guidelines:
        </p>

        <div className="space-y-2 pt-1">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            return (
              <div
                key={index}
                onClick={() => !readOnly && onToggleStep && onToggleStep(index)}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                    : 'bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100/70'
                } ${!readOnly ? 'cursor-pointer' : ''}`}
              >
                <div className="mt-0.5 shrink-0 text-slate-400">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  )}
                </div>

                <div className="flex-1 text-xs leading-relaxed">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      Step {index + 1}
                    </span>
                    {isCompleted && (
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 font-medium ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                    {step}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <p className="text-[11px] text-slate-400 pt-1 text-right italic">
            * Click any step to mark as inspected or executed on-ground
          </p>
        )}
      </div>
    </div>
  );
};
