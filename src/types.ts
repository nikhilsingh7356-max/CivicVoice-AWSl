export type CivicCategory =
  | 'ROADS'
  | 'WASTE'
  | 'WATER'
  | 'ELECTRICITY'
  | 'SANITATION'
  | 'STREETLIGHT'
  | 'PUBLIC_SAFETY'
  | 'TRAFFIC'
  | 'DRAINAGE'
  | 'PUBLIC_PROPERTY'
  | 'ENVIRONMENT'
  | 'OTHER';

export type CivicPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CaseStatus =
  | 'CREATED'
  | 'AI_TRIAGED'
  | 'ASSIGNED'
  | 'FIELD_VERIFICATION'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type AuditEventType =
  | 'CASE_CREATED'
  | 'AI_TRIAGED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'PRIORITY_CHANGED'
  | 'CATEGORY_CHANGED'
  | 'DEPARTMENT_CHANGED'
  | 'FIELD_VERIFICATION_STARTED'
  | 'RESOLVED'
  | 'CLOSED';

export type AuditActorType = 'CITIZEN' | 'AI' | 'OFFICER' | 'AUTHORIZED_OFFICER' | 'SYSTEM';

export interface CaseHistoryEvent {
  case_id: string;
  event_id: string;
  timestamp_event_id: string; // `${ISO timestamp}#${event id}` used as the sort key
  event_type: AuditEventType;
  timestamp: string;
  actor_type: AuditActorType;
  actor_id?: string | null;
  previous_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AssignmentPayload {
  assigned_to: string;
  assigned_role?: string;
  assigned_department?: string;
  actor_id?: string;
  note?: string;
}

export interface VisualEvidence {
  detected_issue: string;
  visible_evidence: string;
  potential_public_impact: string;
  evidence_confidence: 'High' | 'Medium' | 'Low';
}

export interface AIExplanations {
  why_category: string;
  why_department: string;
  why_priority: string;
  why_severity: string;
  why_action: string;
}

export interface AIAuditTrail {
  model: string;
  analyzed_at: string;
  reasoning_summary: string;
  input_modalities: string[];
  human_governance_notice: string;
  latency_ms?: number;
}

export interface PotentiallyRelatedCaseRef {
  case_id: string;
  similarity_reason: string;
  proximity_or_overlap: string;
}

export interface CivicCoordinates {
  lat: number;
  lng: number;
}

export interface RoutingDecision {
  authority: string;
  department: string;
  jurisdiction: string;
  endpoint: string;
  routed_at: string;
  status: 'ROUTED' | 'PENDING';
  method: string;
}

export interface AIVerificationRecord {
  verified: boolean;
  verification_summary: string;
  evidence_status: string;
  confidence_level: string;
  evidence_authenticity_score?: number;
  discrepancies?: string;
}

export interface CivicCase {
  case_id: string;
  created_at: string;
  citizen_name?: string;
  citizen_contact?: string;
  complaint: string;
  image?: string;
  video_url?: string;
  media_type?: 'photo' | 'video' | 'none';
  title: string;
  category: CivicCategory;
  subcategory: string;
  citizen_summary: string;
  authority_summary: string;
  detailed_description: string;
  department: string;
  responsible_authority?: string;
  jurisdiction?: string;
  priority: CivicPriority;
  severity_score: number; // 1 - 10
  language: string;
  location: string;
  location_type?: 'device_detected' | 'manual' | 'unspecified';
  coordinates?: CivicCoordinates;
  cluster_id?: string;
  cluster_name?: string;
  citizen_impact: string;
  recommended_action: string[];
  action_steps_completed?: number[]; // indices of completed steps
  evidence_observations?: VisualEvidence;
  safety_concern: string;
  estimated_urgency: string;
  confidence: string; // e.g. "High (88%)"
  confidence_score: number;
  status: CaseStatus;
  assigned_officer?: string | null;
  assigned_at?: string | null;
  assigned_to?: string | null;
  assigned_role?: string | null;
  assigned_department?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  ai_generated: boolean;
  why_department: string;
  why_case_matters?: string;
  ai_explanations: AIExplanations;
  routing_decision?: RoutingDecision;
  ai_verification?: AIVerificationRecord;
  potentially_related_cases?: PotentiallyRelatedCaseRef[];
  audit_trail?: AIAuditTrail;
  is_demo?: boolean;
}

export interface BedrockAnalysisResult {
  title: string;
  category: CivicCategory;
  subcategory: string;
  citizen_summary: string;
  authority_summary: string;
  detailed_description: string;
  department: string;
  responsible_authority?: string;
  jurisdiction?: string;
  media_type?: 'photo' | 'video' | 'none';
  priority: CivicPriority;
  severity_score: number;
  language: string;
  location: string;
  location_type?: 'device_detected' | 'manual' | 'unspecified';
  coordinates?: CivicCoordinates;
  cluster_id?: string;
  cluster_name?: string;
  citizen_impact: string;
  recommended_action: string[];
  evidence_observations?: VisualEvidence;
  safety_concern: string;
  estimated_urgency: string;
  confidence: string;
  confidence_score: number;
  why_department: string;
  why_case_matters?: string;
  ai_explanations: AIExplanations;
  routing_decision?: RoutingDecision;
  ai_verification?: AIVerificationRecord;
  potentially_related_cases: PotentiallyRelatedCaseRef[];
  audit_trail?: AIAuditTrail;
}

export interface AskAICaseResponse {
  answer: string;
  suggested_actions?: string[];
  confidence_note?: string;
}
