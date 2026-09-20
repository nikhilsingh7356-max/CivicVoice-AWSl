import React, { useState, useEffect } from 'react';
import {
  CivicCase,
  CaseStatus,
  CivicCategory,
  CivicPriority,
  CaseHistoryEvent,
  AuditEventType,
} from '../types';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/StatusBadge';
import { Panel } from '../components/ui/Panel';
import { ScaleBar } from '../components/ui/Charts';
import { useToast } from '../components/ui/Toast';
import { SUGGESTED_OFFICER_ROLES } from '../server/lifecycle';
import { apiUrl } from '../lib/api';
import {
  ArrowLeft,
  Building2,
  MapPin,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Send,
  Copy,
  Check,
  RefreshCw,
  ChevronRight,
  User,
  Video,
  CircleAlert,
  ShieldAlert,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import {
  STATUS_ORDER,
  clampSeverity,
  severityLabel,
  severityTone,
  formatDate,
  timeAgo,
  CATEGORY_LABELS,
  initials,
} from '../lib/format';

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

const STEP: CaseStatus[] = ['CREATED', 'AI_TRIAGED', 'ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const EVENT_TONE: Record<AuditEventType, string> = {
  CASE_CREATED: '#274252',
  AI_TRIAGED: '#2a5b55',
  STATUS_CHANGED: '#d97706',
  ASSIGNED: '#0284c7',
  REASSIGNED: '#0284c7',
  PRIORITY_CHANGED: '#6d28d9',
  CATEGORY_CHANGED: '#6d28d9',
  DEPARTMENT_CHANGED: '#6d28d9',
  FIELD_VERIFICATION_STARTED: '#4f46e5',
  RESOLVED: '#059669',
  CLOSED: '#78716c',
};

const PRESET_AI_QUESTIONS = [
  'Draft an SMS status update for the citizen',
  'What safety considerations apply on-site?',
  'Is there a correlated report nearby?',
];

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({
  civicCase,
  onBack,
  onUpdateStatus,
  onCaseModified,
  onNavigate,
}) => {
  const { notify } = useToast();
  const [officerName, setOfficerName] = useState<string>(civicCase.assigned_officer ?? '');
  const [officerRole, setOfficerRole] = useState<string>(civicCase.assigned_role ?? SUGGESTED_OFFICER_ROLES[0]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [history, setHistory] = useState<CaseHistoryEvent[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const refreshHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/cases/${civicCase.case_id}/history`));
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) setHistory(data.history);
      }
    } catch (e) {
      console.warn('Case history unavailable offline:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [civicCase.case_id]);

  const [completedSteps, setCompletedSteps] = useState<number[]>(civicCase.action_steps_completed ?? []);
  const [question, setQuestion] = useState('');
  const [aiQA, setAiQA] = useState<Array<{ q: string; a: string; time: string }>>([]);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  const [overrideCategory, setOverrideCategory] = useState<CivicCategory>(civicCase.category);
  const [overrideDepartment, setOverrideDepartment] = useState<string>(civicCase.department);
  const [overridePriority, setOverridePriority] = useState<CivicPriority>(civicCase.priority);
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  const handleToggleStep = async (stepIndex: number) => {
    const updated = completedSteps.includes(stepIndex)
      ? completedSteps.filter((i) => i !== stepIndex)
      : [...completedSteps, stepIndex];
    setCompletedSteps(updated);
    await onUpdateStatus(civicCase.case_id, civicCase.status, civicCase.assigned_officer, updated);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(civicCase.case_id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleAssignOfficer = async () => {
    if (!officerName.trim()) {
      notify('error', 'Enter an officer name before assigning.');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(apiUrl(`/api/cases/${civicCase.case_id}/assignment`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: officerName.trim(),
          assigned_role: officerRole,
          assigned_department: civicCase.department,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Assignment failed');
      if (onCaseModified && data.case) onCaseModified(data.case);
      refreshHistory();
      notify('success', 'Officer assigned and logged to the audit trail.');
    } catch (err: any) {
      notify('error', `Could not assign officer: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetStatus = async (newStatus: CaseStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(civicCase.case_id, newStatus, civicCase.assigned_officer || officerName || null, completedSteps);
      refreshHistory();
      notify('success', `Case moved to ${newStatus.replace(/_/g, ' ').toLowerCase()}.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideReason.trim()) {
      notify('error', 'A justification is required before committing an override.');
      return;
    }
    setIsSubmittingOverride(true);
    try {
      const res = await fetch(apiUrl(`/api/cases/${civicCase.case_id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: overrideCategory,
          department: overrideDepartment,
          priority: overridePriority,
          human_override_note: overrideReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Override failed');
      if (onCaseModified && data.case) onCaseModified(data.case);
      refreshHistory();
      notify('success', 'Human override applied and logged to the audit trail.');
      setShowOverride(false);
    } catch (err: any) {
      notify('error', `Could not save override: ${err.message}`);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleAskQuestion = async (text: string) => {
    if (!text.trim()) return;
    setIsAskingAi(true);
    try {
      const res = await fetch(apiUrl(`/api/cases/${civicCase.case_id}/ask-ai`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
      setAiQA((prev) => [
        { q: text, a: data.answer, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ...prev,
      ]);
      setQuestion('');
    } catch (err: any) {
      notify('error', `Could not consult AI assistant: ${err.message}`);
    } finally {
      setIsAskingAi(false);
    }
  };

  const currentStepIdx = STEP.indexOf(civicCase.status);
  const sev = clampSeverity(civicCase.severity_score);
  const sortedHistory = [...history].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="btn btn-secondary btn-sm mt-0.5" aria-label="Back to cases">
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Cases</span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] font-semibold text-navy-700">{civicCase.case_id}</span>
              <button onClick={handleCopyId} className="btn btn-ghost btn-sm !px-1.5 !py-0.5 text-navy-400" title="Copy case ID">
                {copied ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} aria-hidden="true" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {civicCase.is_demo && (
                <span className="badge border-stone-300 bg-stone-100 text-stone-600">Demo</span>
              )}
              <span className="meta">Reported {timeAgo(civicCase.created_at)}</span>
            </div>
            <h1 className="page-title mt-1">{civicCase.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={civicCase.priority} />
              <StatusBadge status={civicCase.status} />
              <CategoryBadge category={civicCase.category} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Original citizen report" subtitle={`Language: ${civicCase.language ?? 'English'} · Category: ${CATEGORY_LABELS[civicCase.category]}`}>
            <blockquote className="border-l-2 border-navy-200 bg-cv-subtle px-4 py-3 text-[13.5px] leading-relaxed text-navy-800">
              “{civicCase.complaint}”
            </blockquote>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 text-navy-300" aria-hidden="true" />
                <div>
                  <dt className="font-medium text-navy-900">Location</dt>
                  <dd className="text-navy-500">{civicCase.location}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User size={13} className="mt-0.5 text-navy-300" aria-hidden="true" />
                <div>
                  <dt className="font-medium text-navy-900">Submitted by</dt>
                  <dd className="text-navy-500">
                    {civicCase.citizen_name ?? 'Anonymous'} · {civicCase.citizen_contact ?? 'no contact'}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 size={13} className="mt-0.5 text-navy-300" aria-hidden="true" />
                <div>
                  <dt className="font-medium text-navy-900">Responsible authority</dt>
                  <dd className="text-navy-500">{civicCase.responsible_authority ?? 'Municipal corporation'}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Landmark size={13} className="mt-0.5 text-navy-300" aria-hidden="true" />
                <div>
                  <dt className="font-medium text-navy-900">Department</dt>
                  <dd className="text-navy-500">{civicCase.department}</dd>
                </div>
              </div>
            </dl>
          </Panel>

          {/* Evidence */}
          {(civicCase.image || civicCase.video_url || civicCase.evidence_observations) && (
            <Panel title="Evidence" subtitle="Photo, video, or AI visual observations">
              {civicCase.media_type === 'video' && civicCase.video_url ? (
                <div>
                  <video src={civicCase.video_url} controls poster={civicCase.image || undefined} className="max-h-80 w-full rounded-lg bg-navy-950 object-contain">
                    Your browser does not support HTML5 video.
                  </video>
                  <p className="meta mt-2 flex items-center gap-1.5">
                    <Video size={13} aria-hidden="true" /> Video submitted by the reporter.
                  </p>
                </div>
              ) : civicCase.image ? (
                <div>
                  <img src={civicCase.image} alt={`Photo submitted with ${civicCase.case_id}`} className="max-h-80 w-full rounded-lg border border-cv-line object-cover" />
                  <p className="meta mt-2">Photo submitted by the reporter.</p>
                </div>
              ) : null}
              {civicCase.evidence_observations && (
                <div className="mt-3 grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-3">
                  <div className="rounded-md border border-cv-line bg-cv-subtle p-3">
                    <p className="label-xs mb-1">Detected issue</p>
                    <p className="text-navy-700">{civicCase.evidence_observations.detected_issue}</p>
                  </div>
                  <div className="rounded-md border border-cv-line bg-cv-subtle p-3">
                    <p className="label-xs mb-1">Visible evidence</p>
                    <p className="text-navy-700">{civicCase.evidence_observations.visible_evidence}</p>
                  </div>
                  <div className="rounded-md border border-cv-line bg-cv-subtle p-3">
                    <p className="label-xs mb-1">Confidence</p>
                    <p className="text-navy-700">{civicCase.evidence_observations.evidence_confidence}</p>
                  </div>
                </div>
              )}
            </Panel>
          )}

          {/* Recommended action plan */}
          {civicCase.recommended_action.length > 0 && (
            <Panel
              title="Recommended action plan"
              subtitle="Suggested SOP steps — check off completed actions. AI suggestions are advisory."
            >
              <ul className="space-y-1">
                {civicCase.recommended_action.map((step, idx) => {
                  const done = completedSteps.includes(idx);
                  return (
                    <li key={idx}>
                      <button
                        onClick={() => handleToggleStep(idx)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-cv-subtle"
                        aria-pressed={done}
                      >
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border ${
                            done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-cv-line-strong bg-cv-surface'
                          }`}
                          aria-hidden="true"
                        >
                          {done && <Check size={12} />}
                        </span>
                        <span className={`text-[13px] ${done ? 'text-navy-400 line-through' : 'text-navy-800'}`}>{step}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="meta mt-2">{completedSteps.length} of {civicCase.recommended_action.length} steps completed</p>
            </Panel>
          )}

          {/* Audit trail */}
          <Panel
            title="Audit trail"
            subtitle="Append-only record of every change to this case"
          >
            {isHistoryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton h-12 w-full" />
                ))}
              </div>
            ) : sortedHistory.length === 0 ? (
              <p className="subtitle py-2">
                No recorded events yet. Updates on this case will appear here as a time-ordered record.
              </p>
            ) : (
              <ol className="max-h-[420px] space-y-0 overflow-y-auto">
                {sortedHistory.map((event, i) => (
                  <li key={event.event_id || event.timestamp_event_id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < sortedHistory.length - 1 && (
                      <span className="absolute left-[5px] top-3 h-full w-px bg-cv-line" aria-hidden="true" />
                    )}
                    <span
                      className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-cv-surface"
                      style={{ backgroundColor: EVENT_TONE[event.event_type] ?? '#78716c' }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-[12.5px] font-semibold capitalize text-navy-900">
                          {event.event_type.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        <span className="meta font-mono">{formatDate(event.timestamp)}</span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-navy-500">
                        {event.actor_type === 'CITIZEN' ? 'Citizen' : event.actor_type === 'AI' ? 'AI assistance' : event.actor_type.toLowerCase()}
                        {event.actor_id ? ` · ${event.actor_id}` : ''}
                        {(event.previous_value || event.new_value) && (
                          <span className="text-navy-400"> — {event.previous_value ?? '—'} → {event.new_value ?? '—'}</span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Processing status */}
          <Panel title="Processing status" subtitle="Lifecycle and assignments">
            <ol className="space-y-0">
              {STEP.map((st, idx) => {
                const state = idx < currentStepIdx ? 'done' : idx === currentStepIdx ? 'current' : 'todo';
                return (
                  <li key={st} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < STEP.length - 1 && (
                      <span className={`absolute left-[9px] top-6 h-full w-0.5 ${state === 'done' ? 'bg-emerald-500' : 'bg-cv-line'}`} aria-hidden="true" />
                    )}
                    <span
                      className={`relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                        state === 'done'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : state === 'current'
                          ? 'border-navy-700 bg-navy-700 text-white ring-4 ring-navy-100'
                          : 'border-cv-line-strong bg-cv-surface text-navy-400'
                      }`}
                      aria-hidden="true"
                    >
                      {state === 'done' ? <Check size={10} /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className={`text-[12.5px] ${state === 'done' ? 'text-navy-400' : state === 'current' ? 'font-semibold text-navy-900' : 'text-navy-600'}`}>
                        {st.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                      {state === 'current' && <span className="ml-1.5 text-[10.5px] text-navy-400">current</span>}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 space-y-3 border-t border-cv-line pt-4">
              <div>
                <p className="label-xs mb-1">Assigned officer</p>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-700 text-[10px] font-semibold text-white">
                    {initials(civicCase.assigned_officer)}
                  </span>
                  <span className="truncate text-[13px] text-navy-800">
                    {civicCase.assigned_officer ?? 'Not yet assigned'}
                  </span>
                </div>
              </div>

              <div>
                <p className="label-xs mb-1">Assign or reassign</p>
                <input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Officer name"
                  className="input"
                  aria-label="Officer name"
                />
                <select value={officerRole} onChange={(e) => setOfficerRole(e.target.value)} className="select mt-2" aria-label="Officer role">
                  {SUGGESTED_OFFICER_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={handleAssignOfficer} disabled={isUpdating} className="btn btn-secondary btn-sm mt-2 w-full">
                  <UserCheck size={13} aria-hidden="true" />
                  Assign
                </button>
              </div>

              <div>
                <p className="label-xs mb-2">Quick status transitions</p>
                <div className="flex flex-wrap gap-1.5">
                  {['AI_TRIAGED', 'ASSIGNED'].includes(civicCase.status) && (
                    <button onClick={() => handleSetStatus('FIELD_VERIFICATION')} disabled={isUpdating} className="btn btn-secondary btn-sm">
                      Field verification
                    </button>
                  )}
                  {['AI_TRIAGED', 'ASSIGNED', 'FIELD_VERIFICATION'].includes(civicCase.status) && (
                    <button onClick={() => handleSetStatus('IN_PROGRESS')} disabled={isUpdating} className="btn btn-secondary btn-sm">
                      In progress
                    </button>
                  )}
                  {['ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS'].includes(civicCase.status) && (
                    <button onClick={() => handleSetStatus('RESOLVED')} disabled={isUpdating} className="btn btn-secondary btn-sm">
                      Mark resolved
                    </button>
                  )}
                  {civicCase.status === 'RESOLVED' && (
                    <button onClick={() => handleSetStatus('CLOSED')} disabled={isUpdating} className="btn btn-primary btn-sm">
                      Close case
                    </button>
                  )}
                  {isUpdating && <RefreshCw size={14} className="mt-1 animate-spin text-navy-300" aria-hidden="true" />}
                  {['RESOLVED', 'CLOSED'].includes(civicCase.status) && <span className="text-[12px] text-navy-400">Case is closed to changes.</span>}
                </div>
              </div>
            </div>
          </Panel>

          {/* Severity + impact */}
          <Panel title="Severity & impact">
            <ScaleBar value={sev} tone={severityTone(sev)} />
            <p className="mt-3 text-[12.5px] text-navy-600">
              <span className="font-semibold">{severityLabel(sev)}</span> severity · {civicCase.estimated_urgency ?? 'Urgency not specified'}
            </p>
            <div className="mt-3 space-y-2 text-[12.5px]">
              {civicCase.safety_concern && (
                <p className="flex items-start gap-2 text-navy-600">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                  {civicCase.safety_concern}
                </p>
              )}
              {civicCase.citizen_impact && (
                <p className="text-navy-500">{civicCase.citizen_impact}</p>
              )}
            </div>
          </Panel>

          {/* Human override */}
          <Panel
            title="Human oversight"
            subtitle="Officers may override AI routing with justification"
            actions={
              <button onClick={() => setShowOverride(!showOverride)} className="btn btn-ghost btn-sm">
                <ShieldAlert size={13} aria-hidden="true" /> {showOverride ? 'Hide' : 'Override'}
              </button>
            }
          >
            {showOverride ? (
              <div className="space-y-3">
                <p className="text-[12.5px] leading-relaxed text-navy-500">
                  Adjust category, department, or priority when on-the-ground conditions warrant. Every override is recorded in the audit trail.
                </p>
                <div>
                  <label className="field-label" htmlFor="ovr-cat">Category</label>
                  <select id="ovr-cat" value={overrideCategory} onChange={(e) => setOverrideCategory(e.target.value as CivicCategory)} className="select">
                    {Object.keys(CATEGORY_LABELS).map((k) => (
                      <option key={k} value={k}>{CATEGORY_LABELS[k as CivicCategory]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="ovr-dept">Department</label>
                  <input id="ovr-dept" value={overrideDepartment} onChange={(e) => setOverrideDepartment(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="field-label" htmlFor="ovr-pri">Priority</label>
                  <select id="ovr-pri" value={overridePriority} onChange={(e) => setOverridePriority(e.target.value as CivicPriority)} className="select">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="ovr-reason">Justification</label>
                  <textarea
                    id="ovr-reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Why is this reclassification required?"
                    className="textarea"
                    rows={2}
                  />
                </div>
                <button onClick={handleSaveOverride} disabled={isSubmittingOverride} className="btn btn-primary btn-sm w-full">
                  {isSubmittingOverride ? <RefreshCw size={13} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}
                  Commit override
                </button>
              </div>
            ) : (
              <p className="subtitle">
                AI suggestions are advisory. Authorized officers retain the final decision and routing power.
              </p>
            )}
          </Panel>

          {/* AI reasoning */}
          <Panel
            title="Why this classification?"
            subtitle="Plain-language reasoning behind the AI suggestions"
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-pine-600" aria-hidden="true" />
              <span className="text-[12.5px] text-navy-600">
                AI confidence: <span className="font-semibold text-navy-900">{civicCase.confidence}</span>
                <span className="text-navy-400"> · advisory only</span>
              </span>
            </div>
            <div className="space-y-3 text-[12.5px] leading-relaxed">
              <div>
                <p className="label-xs mb-0.5">Category — {CATEGORY_LABELS[civicCase.category]}</p>
                <p className="text-navy-600">{civicCase.ai_explanations.why_category}</p>
              </div>
              <div>
                <p className="label-xs mb-0.5">Department — {civicCase.department}</p>
                <p className="text-navy-600">{civicCase.ai_explanations.why_department}</p>
              </div>
              <div>
                <p className="label-xs mb-0.5">Priority — {civicCase.priority}</p>
                <p className="text-navy-600">{civicCase.ai_explanations.why_priority}</p>
              </div>
              <div>
                <p className="label-xs mb-0.5">Severity — {sev}/10</p>
                <p className="text-navy-600">{civicCase.ai_explanations.why_severity}</p>
              </div>
              <div>
                <p className="label-xs mb-0.5">Action sequence</p>
                <p className="text-navy-600">{civicCase.ai_explanations.why_action}</p>
              </div>
              {civicCase.why_case_matters && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-[12.5px] text-amber-900">
                  <span className="font-semibold">Why this case matters: </span>
                  {civicCase.why_case_matters}
                </div>
              )}
            </div>
          </Panel>

          {/* Related */}
          {civicCase.potentially_related_cases && civicCase.potentially_related_cases.length > 0 && (
            <Panel title="Potentially related reports" subtitle="Clusters suggested by the assistant">
              <ul className="space-y-2">
                {civicCase.potentially_related_cases.map((rel, idx) => (
                  <li key={idx}>
                    <button onClick={() => onNavigate(`/cases/${rel.case_id}`)} className="flex w-full items-start gap-2 rounded-md border border-cv-line bg-cv-subtle px-3 py-2.5 text-left hover:border-navy-200 hover:bg-navy-50">
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[11.5px] font-semibold text-navy-700">{rel.case_id}</span>
                        <span className="mt-0.5 block text-[12px] text-navy-500">{rel.similarity_reason}</span>
                      </span>
                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-navy-300" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Ask AI */}
          <Panel title="Ask the assistant" subtitle="Contextual answers about this case (advisory)">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PRESET_AI_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => handleAskQuestion(q)} disabled={isAskingAi} className="btn btn-ghost btn-sm border border-cv-line bg-cv-subtle !font-medium normal-case">
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAskQuestion(question); }}
                placeholder="Ask about this report…"
                className="input"
                aria-label="Question about this case"
              />
              <button onClick={() => handleAskQuestion(question)} disabled={isAskingAi || !question.trim()} className="btn btn-primary" aria-label="Ask">
                {isAskingAi ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
              </button>
            </div>
            {aiQA.length > 0 && (
              <div className="mt-4 space-y-3">
                {aiQA.map((item, i) => (
                  <div key={i} className="rounded-md border border-cv-line bg-cv-subtle p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">Q · {item.q}</span>
                      <span className="meta font-mono">{item.time}</span>
                    </div>
                    <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-navy-700">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {civicCase.audit_trail && (
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-cv-line bg-cv-surface px-4 py-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={15} className="mt-0.5 text-pine-600" aria-hidden="true" />
            <div>
              <p className="text-[12px] font-semibold text-navy-800">Analysis metadata</p>
              <p className="mt-0.5 text-[12px] text-navy-500">
                Model: {civicCase.audit_trail.model} · Analyzed {formatDate(civicCase.audit_trail.analyzed_at)} · Inputs: {civicCase.audit_trail.input_modalities.join(', ')}
                {civicCase.audit_trail.latency_ms ? ` · ${civicCase.audit_trail.latency_ms} ms` : ''}
              </p>
            </div>
          </div>
          <p className="max-w-xs text-[11.5px] text-navy-400">
            {civicCase.audit_trail.human_governance_notice}
          </p>
        </div>
      )}
    </div>
  );
};