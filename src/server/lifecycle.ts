import { CaseStatus, CivicCase } from '../types';

export const CASE_LIFECYCLE: CaseStatus[] = [
  'CREATED',
  'AI_TRIAGED',
  'ASSIGNED',
  'FIELD_VERIFICATION',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

export const TERMINAL_STATUSES: CaseStatus[] = ['RESOLVED', 'CLOSED'];

export const HUMAN_ACTION_STATUSES: CaseStatus[] = ['RESOLVED', 'CLOSED'];

export const SUGGESTED_OFFICER_ROLES = [
  'FIELD_OFFICER',
  'VERIFICATION_OFFICER',
  'SECTOR_OFFICER',
  'INSPECTOR',
  'SUPERVISOR',
  'DEPARTMENT_HEAD',
];

const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  CREATED: ['AI_TRIAGED'],
  AI_TRIAGED: ['ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS'],
  ASSIGNED: ['FIELD_VERIFICATION', 'IN_PROGRESS', 'RESOLVED'],
  FIELD_VERIFICATION: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export interface TransitionResult {
  valid: boolean;
  reason?: string;
}

export function isKnownStatus(status: string | undefined): status is CaseStatus {
  return !!status && (CASE_LIFECYCLE as string[]).includes(status);
}

export function validateStatusTransition(
  current: CaseStatus | undefined,
  next: CaseStatus | undefined,
): TransitionResult {
  if (!current || !isKnownStatus(current as string)) {
    return { valid: false, reason: `current status is invalid: ${String(current)}` };
  }
  if (!next) {
    return { valid: false, reason: 'status is required.' };
  }
  if (current === next) {
    return { valid: true };
  }
  if (!isKnownStatus(next)) {
    return { valid: false, reason: `unknown status: ${String(next)}` };
  }
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    return {
      valid: false,
      reason: `Cannot move case from ${current} to ${next}. Allowed transitions from ${current}: ${
        allowed.length ? allowed.join(', ') : 'none (terminal state).'
      }`,
    };
  }
  return { valid: true };
}

export function statusRequiresHumanAction(status: CaseStatus): boolean {
  return HUMAN_ACTION_STATUSES.includes(status);
}

/**
 * Determines the initial lifecycle status of a new case.
 *
 * - A case that already carries AI triage artifacts (explanations, an analysis
 *   timestamp and a successful routing decision) is created as AI_TRIAGED.
 * - A case without those artifacts is created as CREATED (awaiting human/AI triage).
 *
 * Note: `ai_generated` is NOT used as a signal because the API always answers it
 * truthfully when the citizen request was processed by the AI pipeline.
 */
export function resolveInitialStatus(caseData: CivicCase | Partial<CivicCase>): CaseStatus {
  const hasAiTriage =
    !!caseData.ai_explanations?.why_category &&
    !!caseData.audit_trail?.analyzed_at &&
    caseData.routing_decision?.status === 'ROUTED';
  return hasAiTriage ? 'AI_TRIAGED' : 'CREATED';
}