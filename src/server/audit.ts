import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { CaseHistoryEvent } from '../types';
import { structuredError, structuredLog } from './observability';

const REGION = process.env.AWS_REGION || 'ap-south-1';

export const CASE_HISTORY_TABLE = process.env.CASE_HISTORY_TABLE || 'CivicVoiceCaseHistory';

const ddbHistory = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION, endpoint: process.env.DYNAMODB_ENDPOINT }),
  {
    marshallOptions: { removeUndefinedValues: true },
  },
);

export type AuditWriteResult =
  | { recorded: true; event: CaseHistoryEvent }
  | { recorded: false; error: string; event_type: string };

export interface AppendAuditInput {
  case_id: string;
  event_type: CaseHistoryEvent['event_type'];
  actor_type: CaseHistoryEvent['actor_type'];
  actor_id?: string | null;
  previous_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Appends an immutable event to the case history table.
 *
 * The table is append-only (PutItem for new sort keys only). No route or code
 * path is exposed to update or delete history records, and citizen microdata
 * (contact details, media bodies) is never written to history records.
 */
export async function appendAuditEvent(input: AppendAuditInput): Promise<AuditWriteResult> {
  const event: CaseHistoryEvent = {
    case_id: input.case_id,
    event_id: randomUUID(),
    timestamp_event_id: `${input.timestamp || new Date().toISOString()}#${randomUUID()}`,
    event_type: input.event_type,
    timestamp: input.timestamp || new Date().toISOString(),
    actor_type: input.actor_type,
    actor_id: input.actor_id ?? null,
    previous_value: input.previous_value ?? null,
    new_value: input.new_value ?? null,
    metadata: input.metadata ?? {},
  };

  try {
    await ddbHistory.send(
      new PutCommand({ TableName: CASE_HISTORY_TABLE, Item: event }),
    );
    structuredLog('case_history_append', {
      case_id: event.case_id,
      event_type: event.event_type,
      actor_type: event.actor_type,
    });
    return { recorded: true, event };
  } catch (err) {
    structuredError('case_history_append_failed', err, {
      case_id: event.case_id,
      event_type: event.event_type,
    });
    return { recorded: false, error: 'Failed to record the audit event on the case history.', event_type: event.event_type };
  }
}

/**
 * Records multiple audit events sequentially, returning an overall summary.
 * A single audit write failure is surfaced explicitly (recorded:false + message)
 * but does not cause the case update to be rolled back.
 */
export async function recordAuditBatch(
  inputs: AppendAuditInput[],
): Promise<{ recorded: boolean; failed: string[]; events: CaseHistoryEvent[] }> {
  const events: CaseHistoryEvent[] = [];
  const failed: string[] = [];
  for (const input of inputs) {
    const result = await appendAuditEvent(input);
    if (result.recorded) {
      events.push(result.event);
    } else {
      failed.push(`${result.event_type}: ${result.error}`);
    }
  }
  return { recorded: failed.length === 0, failed, events };
}

export async function getCaseHistory(
  caseId: string,
  options: { limit?: number } = {},
): Promise<CaseHistoryEvent[]> {
  const { limit = 100 } = options;
  try {
    const result = await ddbHistory.send(
      new QueryCommand({
        TableName: CASE_HISTORY_TABLE,
        KeyConditionExpression: 'case_id = :caseId',
        ExpressionAttributeValues: { ':caseId': caseId },
        ScanIndexForward: true,
        Limit: limit,
      }),
    );
    return (result.Items as CaseHistoryEvent[] | undefined) ?? [];
  } catch (err) {
    structuredError('case_history_query_failed', err, { case_id: caseId });
    throw err;
  }
}