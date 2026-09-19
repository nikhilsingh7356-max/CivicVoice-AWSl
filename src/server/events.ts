import { EventBridgeClient, PutEventsCommand, type PutEventsCommandOutput } from '@aws-sdk/client-eventbridge';
import { CivicCase } from '../types.ts';

const REGION = process.env.AWS_REGION || 'ap-south-1';

export const CIVICVOICE_EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'CivicVoiceEventBus';
export const CIVICVOICE_EVENT_SOURCE = 'civicvoice';
export const CIVICVOICE_CASE_CREATED_DETAIL_TYPE = 'CivicCaseCreated';

// HIGH is included because the existing authority dashboard already treats
// HIGH and CRITICAL as the urgent priority-alert tier (src/pages/AuthorityDashboardPage.tsx).
// LOW / MEDIUM never trigger officer alerts.
export const CRITICAL_ALERT_PRIORITIES = ['CRITICAL', 'HIGH'] as const;

const eventBridge = new EventBridgeClient({ region: REGION });

export interface CivicCaseCreatedEventDetail {
  case_id: string;
  category: string;
  department: string;
  priority: string;
  severity_score: number;
  location: string | null;
  coordinates?: { latitude: number; longitude: number };
  created_at: string;
}

export interface PublishEventResult {
  ok: boolean;
  event_id?: string;
  error?: string;
}

export function buildCivicCaseCreatedEventDetail(civicCase: CivicCase): CivicCaseCreatedEventDetail {
  const detail: CivicCaseCreatedEventDetail = {
    case_id: civicCase.case_id,
    category: civicCase.category,
    department: civicCase.department,
    priority: civicCase.priority,
    severity_score: Number(civicCase.severity_score || 0),
    location: civicCase.location || null,
    created_at: civicCase.created_at,
  };
  if (civicCase.coordinates && civicCase.coordinates.lat !== undefined && civicCase.coordinates.lng !== undefined) {
    detail.coordinates = { latitude: civicCase.coordinates.lat, longitude: civicCase.coordinates.lng };
  }
  return detail;
}

export function matchesCriticalAlertRule(caseLike: { priority?: string }): boolean {
  return CRITICAL_ALERT_PRIORITIES.includes(caseLike?.priority as (typeof CRITICAL_ALERT_PRIORITIES)[number]);
}

export async function publishCaseCreatedEvent(civicCase: CivicCase): Promise<PublishEventResult> {
  const detail = buildCivicCaseCreatedEventDetail(civicCase);
  const command = new PutEventsCommand({
    Entries: [
      {
        EventBusName: CIVICVOICE_EVENT_BUS_NAME,
        Source: CIVICVOICE_EVENT_SOURCE,
        DetailType: CIVICVOICE_CASE_CREATED_DETAIL_TYPE,
        Detail: JSON.stringify(detail),
        Time: new Date(detail.created_at),
      },
    ],
  });
  try {
    const result: PutEventsCommandOutput = await eventBridge.send(command);
    const entry = result.Entries?.[0];
    if (entry?.EventId) {
      return { ok: true, event_id: entry.EventId };
    }
    const error = `EventBridge rejected CivicCaseCreated event: ${entry?.ErrorCode || 'UNKNOWN'} ${entry?.ErrorMessage || 'No event id returned.'}`;
    console.error(`[CivicVoice] ${error}`, { case_id: detail.case_id });
    return { ok: false, error };
  } catch (e: any) {
    const error = `EventBridge PutEvents failed for case ${detail.case_id}: ${e?.message || 'unknown error'}`;
    console.error(`[CivicVoice] ${error}`);
    return { ok: false, error };
  }
}