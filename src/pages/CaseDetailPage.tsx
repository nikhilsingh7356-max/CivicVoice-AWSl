import React, { useState, useEffect } from 'react';
import { CivicCase, CaseStatus, CivicCategory, CivicPriority, CaseHistoryEvent } from '../types';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/StatusBadge';
import { VisualEvidenceCard } from '../components/VisualEvidenceCard';
import { CivicSeverityCard } from '../components/CivicSeverityCard';
import { AIAuditTrailCard } from '../components/AIAuditTrailCard';
import { InteractiveActionPlan } from '../components/InteractiveActionPlan';
import { SUGGESTED_OFFICER_ROLES } from '../server/lifecycle';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Send,
  FileCheck,
  Languages,
  Eye,
  Calendar,
  Layers,
  Wrench,
  ChevronRight,
  RefreshCw,
  Share2,
  Check,
  User,
  Phone,
  Video,
  Play,
  ShieldCheck,
  Edit3,
} from 'lucide-react';

interface CaseDetailPageProps {
  civicCase: CivicCase;
  onBack: () => void;
  onUpdateStatus: (
    caseId: string,
    status: CaseStatus,
    assignedOfficer?: string | null,
    actionStepsCompleted?: number[]
  ) => Promise<void>;
  onCaseModified?: (updatedCase: CivicCase) => void;
  onNavigate: (path: string) => void;
}

const DEMO_OFFICERS = [
  'Officer A (Roads & Infrastructure)',
  'Officer B (Sanitation & Waste)',
  'Officer C (Water & Utilities)',
  'Officer D (Electrical & Lighting)',
];

const PRESET_AI_QUESTIONS = [
  'What safety equipment is needed on-site?',
  'Is there a correlated report nearby?',
  'Draft an SMS status update for the citizen',
  'What is the estimated municipal repair cost & timeframe?',
];

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({
  civicCase,
  onBack,
  onUpdateStatus,
  onCaseModified,
  onNavigate,
}) => {
  const [selectedOfficer, setSelectedOfficer] = useState<string>(
    civicCase.assigned_officer || DEMO_OFFICERS[0]
  );
  const [selectedRole, setSelectedRole] = useState<string>(
    civicCase.assigned_role || SUGGESTED_OFFICER_ROLES[0]
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState(false);

  // Append-only audit history
  const [history, setHistory] = useState<CaseHistoryEvent[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  const refreshHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`/api/cases/${civicCase.case_id}/history`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      }
    } catch (e) {
      console.warn('Case history unavailable in local demo mode:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [civicCase.case_id]);

  // Local state for interactive action steps
  const [completedSteps, setCompletedSteps] = useState<number[]>(
    civicCase.action_steps_completed || []
  );

  // Ask Civic AI state
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ q: string; a: string; time: string }>>([]);
  const [isAskingAi, setIsAskingAi] = useState<boolean>(false);

  // Human-in-the-Loop Override Modal / Panel State
  const [showOverridePanel, setShowOverridePanel] = useState<boolean>(false);
  const [overrideCategory, setOverrideCategory] = useState<CivicCategory>(civicCase.category);
  const [overrideDepartment, setOverrideDepartment] = useState<string>(civicCase.department);
  const [overridePriority, setOverridePriority] = useState<CivicPriority>(civicCase.priority);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);
  const [overrideSuccessNotice, setOverrideSuccessNotice] = useState<string | null>(null);

  const handleToggleStep = async (stepIndex: number) => {
    const updated = completedSteps.includes(stepIndex)
      ? completedSteps.filter((i) => i !== stepIndex)
      : [...completedSteps, stepIndex];
    setCompletedSteps(updated);

    try {
      await onUpdateStatus(
        civicCase.case_id,
        civicCase.status,
        civicCase.assigned_officer,
        updated
      );
    } catch (e) {
      console.error('Failed to sync action steps:', e);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(civicCase.case_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Status transition handlers
  const handleAssignOfficer = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/cases/${civicCase.case_id}/assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: selectedOfficer,
          assigned_role: selectedRole,
          assigned_department: civicCase.department,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Assignment failed');
      }

      if (onCaseModified && data.case) {
        onCaseModified(data.case);
      }
      refreshHistory();
    } catch (err: any) {
      console.error('Assignment error:', err);
      alert('Could not assign officer: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetStatus = async (newStatus: CaseStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(
        civicCase.case_id,
        newStatus,
        civicCase.assigned_officer || selectedOfficer,
        completedSteps
      );
      refreshHistory();
    } finally {
      setIsUpdating(false);
    }
  };

  // Human Override Submission
  const handleSaveOverride = async () => {
    if (!overrideReason.trim()) {
      alert('Please provide a brief justification for the human oversight override.');
      return;
    }

    setIsSubmittingOverride(true);
    try {
      const response = await fetch(`/api/cases/${civicCase.case_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: overrideCategory,
          department: overrideDepartment,
          priority: overridePriority,
          human_override_note: overrideReason,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply human override');
      }

      setOverrideSuccessNotice('Human oversight override applied and logged to audit trail.');
      if (onCaseModified && data.case) {
        onCaseModified(data.case);
      }
      refreshHistory();
      setTimeout(() => setShowOverridePanel(false), 1500);
    } catch (err: any) {
      alert('Could not save override: ' + err.message);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Ask Civic AI handler
  const handleAskQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;

    setIsAskingAi(true);
    try {
      const response = await fetch(`/api/cases/${civicCase.case_id}/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get answer from Civic AI');
      }

      setAiAnswers((prev) => [
        {
          q: questionText,
          a: data.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setCustomQuestion('');
    } catch (err: any) {
      console.error('Error asking AI:', err);
      alert('Could not consult Civic AI: ' + err.message);
    } finally {
      setIsAskingAi(false);
    }
  };

  // Status timeline steps
  const steps: CaseStatus[] = ['CREATED', 'AI_TRIAGED', 'ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const currentStepIdx = steps.indexOf(civicCase.status);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar: Back & Case ID header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            id="btn-case-back"
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {civicCase.case_id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100"
                title="Copy Case ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Share2 className="w-3 h-3" />}
                <span>{copiedId ? 'Copied' : 'Copy'}</span>
              </button>
              {civicCase.is_demo && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Demo Case
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight mt-1">
              {civicCase.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PriorityBadge priority={civicCase.priority} />
          <StatusBadge status={civicCase.status} />
        </div>
      </div>

      {/* PUBLIC TRANSPARENCY & SOVEREIGN ROUTING BANNER */}
      <div
        id="card-civic-transparency"
        className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <div>
            <span className="font-bold text-blue-950 uppercase tracking-wide">
              Municipal Case Dossier & Sovereign Router:
            </span>
            <span className="text-blue-900 ml-1.5 font-mono">
              Destination: <span className="font-bold">{civicCase.responsible_authority || 'Prayagraj Municipal Corporation'}</span> • Status: <span className="font-bold">{civicCase.status}</span> • Dept: <span className="font-bold">{civicCase.department}</span>
            </span>
          </div>
        </div>
        <span className="text-blue-700 font-mono text-[11px] shrink-0">
          Created: {new Date(civicCase.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* CITIZEN SUBMISSION & ROUTING SUMMARY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
            <User className="w-3 h-3 text-blue-600" />
            Citizen Identity
          </span>
          <span className="text-xs font-bold text-slate-900 block">
            {civicCase.citizen_name || 'Anonymous Citizen'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono block">
            {civicCase.citizen_contact || 'Unspecified Contact'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
            <Building2 className="w-3 h-3 text-indigo-600" />
            Responsible Authority
          </span>
          <span className="text-xs font-bold text-slate-900 block truncate">
            {civicCase.responsible_authority || 'Municipal Corporation'}
          </span>
          <span className="text-[11px] text-indigo-700 font-medium block truncate">
            {civicCase.jurisdiction || 'Urban Ward Jurisdiction'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-600" />
            Location & Geocode
          </span>
          <span className="text-xs font-bold text-slate-900 block truncate">
            {civicCase.location}
          </span>
          <span className="text-[11px] text-emerald-700 font-mono block">
            Mode: {civicCase.location_type === 'device_detected' ? 'GPS Auto-Detected' : 'Citizen Provided'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            AI Verification Status
          </span>
          <span className="text-xs font-bold text-slate-900 block">
            {civicCase.ai_verification?.evidence_authenticity_score
              ? `Authenticity score: ${civicCase.ai_verification.evidence_authenticity_score}%`
              : 'Field verification pending'}
          </span>
          <span className="text-[11px] text-slate-500 block truncate">
            {civicCase.ai_verification?.verification_summary || 'Human field verification still required.'}
          </span>
        </div>
      </div>

      {/* CIVIC SEVERITY & URGENCY CARD */}
      <CivicSeverityCard
        score={civicCase.severity_score}
        priority={civicCase.priority}
        urgency={civicCase.estimated_urgency || 'Within 24-48 Hours'}
        safetyConcern={civicCase.safety_concern}
        citizenImpact={civicCase.citizen_impact}
      />

      {/* VISUAL STATUS WORKFLOW TIMELINE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Resolution Lifecycle Workflow
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {civicCase.assigned_officer ? `Assigned to: ${civicCase.assigned_officer}` : 'Pending Officer Dispatch'}
          </span>
        </div>

        {/* Visual Timeline Bar */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-1 sm:gap-2 text-center pt-2">
          {steps.map((st, idx) => {
            const isDone = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={st} className="space-y-2">
                <div className="flex items-center">
                  <div
                    className={`w-full h-1.5 rounded-full transition-all ${
                      idx === 0
                        ? 'hidden'
                        : isDone || isCurrent
                        ? 'bg-blue-600'
                        : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-700 text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <div
                    className={`w-full h-1.5 rounded-full transition-all ${
                      idx === steps.length - 1
                        ? 'hidden'
                        : isDone
                        ? 'bg-blue-600'
                        : 'bg-slate-200'
                    }`}
                  />
                </div>
                <div className="text-[11px] font-bold text-slate-800 tracking-tight">
                  {st.replace('_', ' ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Officer Assignment & Status Transition Controls */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl">
          {/* Officer Select */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-700">Officer Assignment:</span>
            <select
              id="select-officer"
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 bg-white focus:border-blue-600 outline-none"
            >
              {DEMO_OFFICERS.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
            <select
              id="select-officer-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 bg-white focus:border-blue-600 outline-none"
            >
              {SUGGESTED_OFFICER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              id="btn-assign-officer"
              disabled={isUpdating}
              onClick={handleAssignOfficer}
              className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
            >
              Assign
            </button>
            <span className="text-[10px] font-mono text-slate-500">
              Demo officer profiles for local judging
            </span>
          </div>

          {/* Quick Status Buttons */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-semibold text-slate-700">Quick Transition:</span>
            {['AI_TRIAGED', 'ASSIGNED'].includes(civicCase.status) && (
              <button
                id="btn-begin-field-verification"
                disabled={isUpdating}
                onClick={() => handleSetStatus('FIELD_VERIFICATION')}
                className="px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-900 font-semibold border border-cyan-300 hover:bg-cyan-200 transition-colors"
              >
                Begin Field Verification
              </button>
            )}
            {['AI_TRIAGED', 'ASSIGNED', 'FIELD_VERIFICATION'].includes(civicCase.status) && (
              <button
                id="btn-set-in-progress"
                disabled={isUpdating}
                onClick={() => handleSetStatus('IN_PROGRESS')}
                className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-semibold border border-amber-300 hover:bg-amber-200 transition-colors"
              >
                Mark In Progress
              </button>
            )}
            {['ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS'].includes(civicCase.status) && (
              <button
                id="btn-set-resolved"
                disabled={isUpdating}
                onClick={() => handleSetStatus('RESOLVED')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                Mark Resolved
              </button>
            )}
            {civicCase.status === 'RESOLVED' && (
              <button
                id="btn-close-case"
                disabled={isUpdating}
                onClick={() => handleSetStatus('CLOSED')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 transition-colors"
              >
                Close Case
              </button>
            )}

            {/* Human Oversight Override Button */}
            <button
              id="btn-toggle-human-override"
              type="button"
              onClick={() => setShowOverridePanel(!showOverridePanel)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>Human Override</span>
            </button>
          </div>
        </div>

        {/* HUMAN-IN-THE-LOOP OVERRIDE PANEL */}
        {showOverridePanel && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 space-y-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Human Authority Reclassification & Routing Override
              </span>
              <span className="text-[10px] font-mono text-amber-800">
                Sovereign Human Governance
              </span>
            </div>

            <p className="text-amber-900 leading-relaxed">
              AI provides decision support. Authorized officers have the explicit right to override category, department, or priority when on-the-ground conditions warrant. All overrides are logged in the immutable audit trail.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Override Category:</label>
                <select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value as CivicCategory)}
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white text-xs"
                >
                  <option value="ROADS">ROADS</option>
                  <option value="WASTE">WASTE</option>
                  <option value="WATER">WATER</option>
                  <option value="ELECTRICITY">ELECTRICITY</option>
                  <option value="SANITATION">SANITATION</option>
                  <option value="STREETLIGHT">STREETLIGHT</option>
                  <option value="PUBLIC_SAFETY">PUBLIC_SAFETY</option>
                  <option value="TRAFFIC">TRAFFIC</option>
                  <option value="DRAINAGE">DRAINAGE</option>
                  <option value="PUBLIC_PROPERTY">PUBLIC_PROPERTY</option>
                  <option value="ENVIRONMENT">ENVIRONMENT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Override Department:</label>
                <input
                  type="text"
                  value={overrideDepartment}
                  onChange={(e) => setOverrideDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Override Priority:</label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value as CivicPriority)}
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white text-xs"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Mandatory Governance Justification Note:
              </label>
              <input
                type="text"
                placeholder="Reason for reclassification (e.g. Field inspection confirmed pipeline rupture rather than drainage overflow)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 bg-white text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 italic">
                Will re-route case and record officer intervention to audit trail.
              </span>
              <button
                type="button"
                disabled={isSubmittingOverride}
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white font-bold text-xs hover:bg-amber-800 transition-colors flex items-center gap-1.5"
              >
                {isSubmittingOverride ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Commit Human Override</span>
                  </>
                )}
              </button>
            </div>

            {overrideSuccessNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-900 font-semibold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{overrideSuccessNotice}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* IMMUTABLE CASE HISTORY / AUDIT TRAIL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Immutable Audit Trail (Case History)
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
            Append-only
          </span>
        </div>

        {isHistoryLoading ? (
          <p className="text-xs text-slate-500 italic">Loading case history...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            No recorded events yet. Updates made on this case will appear here as an immutable, time-ordered record.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {[...history]
              .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
              .map((event) => (
                <div
                  key={event.event_id || event.timestamp_event_id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Actor: <span className="font-semibold">{event.actor_type}</span>
                      {event.actor_id ? ` (${event.actor_id})` : ''}
                      {event.previous_value || event.new_value ? (
                        <>
                          {' '}
                          — {event.previous_value ?? '—'} → {event.new_value ?? '—'}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* CORE DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Citizen Report, Evidence, Action Steps */}
        <div className="lg:col-span-7 space-y-6">
          {/* Original Citizen Report */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Original Citizen Report
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Language: {civicCase.language}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 leading-relaxed font-sans">
              "{civicCase.complaint}"
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Reported Location:</span>
              <span>{civicCase.location}</span>
            </div>
          </div>

          {/* Visual Photographic or Video Evidence */}
          {civicCase.media_type === 'video' && civicCase.video_url ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-indigo-600" />
                  Video Evidence Recording
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                  Field Surveillance Clip
                </span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video
                  src={civicCase.video_url}
                  controls
                  className="w-full h-full object-contain"
                  poster={civicCase.image || undefined}
                >
                  Your browser does not support HTML5 video.
                </video>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Video evidence captured on-site and verified for municipal response dispatch.
              </p>
            </div>
          ) : (
            <VisualEvidenceCard
              evidence={civicCase.evidence_observations}
              image={civicCase.image}
            />
          )}

          {/* Interactive AI Action Plan (Checkable SOP) */}
          <InteractiveActionPlan
            steps={civicCase.recommended_action}
            completedSteps={completedSteps}
            onToggleStep={handleToggleStep}
          />
        </div>

        {/* Right 5 cols: Why This Case Matters, AI Explanation Panel, Potentially Related Cases, Ask Civic AI */}
        <div className="lg:col-span-5 space-y-6">
          {/* WHY THIS CASE MATTERS (Authority Justification) */}
          {civicCase.why_case_matters && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Why This Case Matters (Authority Justification)</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                {civicCase.why_case_matters}
              </p>
            </div>
          )}

          {/* AI EXPLANATION PANEL */}
          <div
            id="panel-ai-explanation"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Why Did Amazon Bedrock Classify This Case This Way?
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                Transparent AI
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Why this category? ({civicCase.category})</span>
                <p className="text-slate-600 leading-relaxed">{civicCase.ai_explanations.why_category}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Why this department? ({civicCase.department})</span>
                <p className="text-slate-600 leading-relaxed">{civicCase.ai_explanations.why_department}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Why this priority? ({civicCase.priority})</span>
                <p className="text-slate-600 leading-relaxed">{civicCase.ai_explanations.why_priority}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Why this severity score? ({civicCase.severity_score}/10)</span>
                <p className="text-slate-600 leading-relaxed">{civicCase.ai_explanations.why_severity}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Why this action sequence?</span>
                <p className="text-slate-600 leading-relaxed">{civicCase.ai_explanations.why_action}</p>
              </div>
            </div>
          </div>

          {/* POTENTIALLY RELATED CASES */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Potentially Related Reports</h4>
              </div>
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold border border-amber-300">
                Decision Support
              </span>
            </div>

            {civicCase.potentially_related_cases && civicCase.potentially_related_cases.length > 0 ? (
              <div className="space-y-2 text-xs">
                {civicCase.potentially_related_cases.map((rel, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigate(`/cases/${rel.case_id}`)}
                    className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 text-slate-800 hover:bg-amber-100/50 hover:border-amber-300 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between font-bold text-blue-700 font-mono">
                      <span className="group-hover:underline flex items-center gap-1">
                        <span>{rel.case_id}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      <span className="text-[11px] font-sans font-normal text-slate-500">
                        {rel.proximity_or_overlap}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{rel.similarity_reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-50 border border-slate-200">
                No potentially related reports identified within 500m.
              </p>
            )}
          </div>

          {/* ASK CIVIC AI (Contextual Assistant) */}
          <div
            id="panel-ask-civic-ai"
            className="rounded-2xl border border-blue-300 bg-slate-950 text-white p-5 sm:p-6 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Ask Civic AI About This Case</h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900 text-blue-200">
                Operational Assistant
              </span>
            </div>

            {/* Quick preset questions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Authority Operational Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_AI_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    disabled={isAskingAi}
                    onClick={() => handleAskQuestion(q)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-left transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input custom question */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ask any question about this complaint..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskQuestion(customQuestion);
                }}
                className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 outline-none"
              />
              <button
                disabled={isAskingAi || !customQuestion.trim()}
                onClick={() => handleAskQuestion(customQuestion)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 disabled:opacity-40 transition-colors"
              >
                {isAskingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* AI Q&A Feed */}
            {aiAnswers.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-800 max-h-60 overflow-y-auto">
                {aiAnswers.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-blue-400 font-semibold text-[11px]">
                      <span>Q: {item.q}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{item.time}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed text-xs whitespace-pre-line">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SOVEREIGN AI AUDIT TRAIL */}
      <AIAuditTrailCard
        audit={civicCase.audit_trail}
        caseId={civicCase.case_id}
      />
    </div>
  );
};
