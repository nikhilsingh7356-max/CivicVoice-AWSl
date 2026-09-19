import { randomUUID } from 'crypto';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const REGION = process.env.AWS_REGION || 'ap-south-1';

export const OBSERVABILITY_NAMESPACE = 'CivicVoice';

const METRICS_DISABLED = process.env.DISABLE_CLOUDWATCH_METRICS === 'true';

let cloudWatchClient: CloudWatchClient | null = null;

function getCloudWatchClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({ region: REGION });
  }
  return cloudWatchClient;
}

const SENSITIVE_KEY_PATTERN =
  /(secret|token|password|authorization|credential|pii|contact|phone|email|image|audio|video|base64|blob|private)/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }
  if (typeof value === 'string' && value.length > 2000) {
    return value.slice(0, 2000) + '…';
  }
  return value;
}

export interface LogData {
  [key: string]: unknown;
}

export function structuredLog(operation: string, data: LogData = {}): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    service: 'CivicVoice',
    operation,
  };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    entry[key] = sanitizeValue(key, value);
  }
  console.log(JSON.stringify(entry));
}

export function structuredError(operation: string, error: unknown, data: LogData = {}): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    service: 'CivicVoice',
    operation,
    error:
      typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: unknown }).message
        : String(error),
    error_code: typeof error === 'object' && error !== null && 'name' in error ? (error as { name: unknown }).name : 'Error',
  };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    entry[key] = sanitizeValue(key, value);
  }
  console.error(JSON.stringify(entry));
}

/**
 * Emits a custom CloudWatch metric in the CivicVoice namespace.
 *
 * Passed task just requires structured logging & metrics; never log raw media
 * bodies, citizen contact details or scanned documents.
 *
 * Fire-and-forget: callers should `void emitMetric(...)` and is a best-effort
 * call. Failures are logged (structurally) but never break the request.
 */
export async function emitMetric(
  metricName: string,
  value = 1,
  dimensions?: Record<string, string>,
): Promise<void> {
  if (METRICS_DISABLED) return;
  try {
    await getCloudWatchClient().send(
      new PutMetricDataCommand({
        Namespace: OBSERVABILITY_NAMESPACE,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: 'Count',
            Dimensions: dimensions
              ? Object.entries(dimensions).map(([Name, v]) => ({ Name, Value: v }))
              : undefined,
          },
        ],
      }),
    );
  } catch (err) {
    structuredError('cloudwatch_emit_metric', err, { metric_name: metricName });
  }
}

export function emitMetricSafe(
  metricName: string,
  value = 1,
  dimensions?: Record<string, string>,
): void {
  void emitMetric(metricName, value, dimensions);
}

/**
 * Convenience wrapper that logs a structured operation start/result and LATENCY
 * for an async handler and measures latency.
 */
export async function trackOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context: LogData = {},
): Promise<T> {
  const requestId = context.request_id || (context.request_id = `req-${randomUUID()}`);
  const startedAt = Date.now();
  structuredLog(`${operation}_started`, { ...context, request_id: requestId });
  try {
    const result = await fn();
    structuredLog(`${operation}_completed`, {
      ...context,
      request_id: requestId,
      latency_ms: Date.now() - startedAt,
    });
    return result;
  } catch (err) {
    structuredError(`${operation}_failed`, err, {
      ...context,
      request_id: requestId,
      latency_ms: Date.now() - startedAt,
    });
    throw err;
  }
}

export function generateRequestId(): string {
  return `req-${randomUUID()}`;
}