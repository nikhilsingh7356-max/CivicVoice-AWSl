import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AssignmentPayload, CaseStatus, CivicCase, AuditEventType } from './src/types.ts';
import { resolveAuthorityByTaxonomy, AUTHORITY_REGISTRY } from './src/authorityRegistry.ts';
import { publishCaseCreatedEvent } from './src/server/events.ts';
import { resolveInitialStatus, validateStatusTransition, statusRequiresHumanAction, SUGGESTED_OFFICER_ROLES } from './src/server/lifecycle.ts';
import { recordAuditBatch, getCaseHistory, appendAuditEvent, AppendAuditInput } from './src/server/audit.ts';
import { computeAnalyticsSummary, computeHotspots } from './src/server/analytics.ts';
import { structuredLog, structuredError, emitMetricSafe, generateRequestId } from './src/server/observability.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const REGION = process.env.AWS_REGION || 'ap-south-1';
const CASES_TABLE = process.env.CASES_TABLE || 'CivicVoiceCases';
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || '';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } });
const s3 = new S3Client({ region: REGION });
const bedrock = new BedrockRuntimeClient({ region: REGION });
const transcribe = new TranscribeClient({ region: REGION });

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Request correlation id + structured request logging (no raw bodies are ever logged).
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  res.locals.request_id = requestId;
  const startedAt = Date.now();
  res.on('finish', () => {
    structuredLog('http_request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency_ms: Date.now() - startedAt,
      request_id: requestId,
    });
  });
  next();
});

function awsConfigured() {
  return Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function requireAws(res: express.Response) {
  if (!awsConfigured()) {
    res.status(503).json({ success: false, error: 'AWS credentials are not configured. Configure AWS credentials before using live CivicVoice services.' });
    return false;
  }
  return true;
}

function safeJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned);
}

function makeCaseId() {
  return `CV-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
const ALLOWED_CATEGORIES = new Set([
  'ROADS',
  'WASTE',
  'WATER',
  'ELECTRICITY',
  'SANITATION',
  'STREETLIGHT',
  'PUBLIC_SAFETY',
  'TRAFFIC',
  'DRAINAGE',
  'PUBLIC_PROPERTY',
  'ENVIRONMENT',
  'OTHER',
]);

function normalizeCategory(category: unknown): string {
  const normalized = String(category || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  return ALLOWED_CATEGORIES.has(normalized)
    ? normalized
    : 'OTHER';
}

function applyCategorySafeguard(
  category: string,
  complaint: string
): string {
  const text = String(complaint || '').toLowerCase().trim();

  if (
    /\bstreet\s*lights?\b/.test(text) ||
    /\bstreet\s*lamps?\b/.test(text) ||
    /\bstreetlight\b/.test(text) ||
    /\bstreet\s*lighting\b/.test(text) ||
    /\blights?\s+(?:are|is)\s+not\s+working\b/.test(text) ||
    /\blights?\s+(?:are|is)\s+broken\b/.test(text) ||
    /\blights?\s+(?:are|is)\s+out\b/.test(text) ||
    /\bno\s+street\s+lights?\b/.test(text)
  ) {
    return 'STREETLIGHT';
  }

  if (
    /\bpotholes?\b|\bdamaged\s+road\b|\bbroken\s+road\b/.test(text)
  ) {
    return 'ROADS';
  }

  if (
    /\bgarbage\b|\btrash\b|\bwaste\s+accumulation\b/.test(text)
  ) {
    return 'WASTE';
  }

  return normalizeCategory(category);
}

async function listCases() {
  const out = await ddb.send(new ScanCommand({ TableName: CASES_TABLE, Limit: 100 }));
  return ((out.Items || []) as CivicCase[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function getCase(id: string) {
  const out = await ddb.send(new GetCommand({ TableName: CASES_TABLE, Key: { case_id: id } }));
  return out.Item as CivicCase | undefined;
}

async function saveCase(civicCase: CivicCase) {
  await ddb.send(new PutCommand({ TableName: CASES_TABLE, Item: civicCase }));
  return civicCase;
}

async function updateCase(id: string, updates: Partial<CivicCase>) {
  const current = await getCase(id);
  if (!current) return undefined;
  const updated = { ...current, ...updates } as CivicCase;
  await saveCase(updated);
  return updated;
}

async function analyzeWithBedrock(input: { complaint: string; image?: string; location?: string; language?: string; existingCases: CivicCase[] }) {
  const system = `You are CivicVoice AI, a civic infrastructure triage assistant.

Convert citizen reports into structured operational recommendations.

AI output is untrusted and must never:
- invent GPS coordinates
- claim that a report is officially verified
- invent evidence that is not present
- override human officials

Clearly distinguish observed visual evidence from assumptions.

Priority and severity are recommendations for human officials.

Allowed categories:
ROADS,
WASTE,
WATER,
ELECTRICITY,
SANITATION,
STREETLIGHT,
PUBLIC_SAFETY,
TRAFFIC,
DRAINAGE,
PUBLIC_PROPERTY,
ENVIRONMENT,
OTHER.

IMPORTANT CATEGORY RULES:
- If the complaint mentions street lights, street lamps, street lighting, broken street lights, lights not working, lights being out, or no street lights, classify it as STREETLIGHT.
- A clear street-light failure must NOT be classified as OTHER.
- If a complaint is about potholes, damaged roads, or broken roads, use ROADS.
- If a complaint is about garbage, trash, or waste accumulation, use WASTE.
- Use OTHER only when none of the allowed categories reasonably matches.

Allowed priorities:
LOW,
MEDIUM,
HIGH,
CRITICAL.

Return only information supported by the citizen complaint, supplied location, and image evidence.`;
  const casesContext = input.existingCases.slice(0, 8).map(c => `${c.case_id}: ${c.category}; ${c.location}; ${c.title}`).join('\n');
  const prompt = `Return ONLY valid JSON.\nCitizen complaint: ${JSON.stringify(input.complaint || '')}\nDevice location text: ${JSON.stringify(input.location || 'Unavailable')}\nLanguage hint: ${JSON.stringify(input.language || 'Auto Detect')}\nExisting cases for possible similarity:\n${casesContext || 'None'}\n\nSchema:\n{\n"title":"string","category":"allowed category","subcategory":"string","citizen_summary":"string","authority_summary":"string","detailed_description":"string","department":"string","priority":"LOW|MEDIUM|HIGH|CRITICAL","severity_score":5.0,"language":"string","location":"use supplied location only","citizen_impact":"string","recommended_action":["string"],"evidence_observations":{"detected_issue":"string","visible_evidence":"string","potential_public_impact":"string","evidence_confidence":"High|Medium|Low"},"safety_concern":"string","estimated_urgency":"string","confidence":"string","confidence_score":0,"why_department":"string","why_case_matters":"string","ai_explanations":{"why_category":"string","why_department":"string","why_priority":"string","why_severity":"string","why_action":"string"},"potentially_related_cases":[]}`;
  const content: any[] = [{ text: prompt }];
  if (input.image) {
    const match = input.image.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
    if (match) content.push({ image: { format: match[1].split('/')[1] === 'jpeg' ? 'jpeg' : match[1].split('/')[1], source: { bytes: Buffer.from(match[2], 'base64') } } });
  }
  const response = await bedrock.send(new ConverseCommand({
    modelId: BEDROCK_MODEL_ID,
    system: [{ text: system }],
    messages: [{ role: 'user', content }],
    inferenceConfig: { temperature: 0.1, maxTokens: 2500 },
  }));
  const text = response.output?.message?.content?.map((x: any) => x.text || '').join('') || '';
  return safeJson(text);
}

app.get(['/api/health', '/health'], async (_req, res) => {
  let dbOk = false;
  try { await ddb.send(new ScanCommand({ TableName: CASES_TABLE, Limit: 1 })); dbOk = true; } catch {}
  res.json({ status: 'ok', app: 'CivicVoice AWS', region: REGION, bedrockModel: BEDROCK_MODEL_ID, dynamodbConfigured: dbOk, s3Configured: Boolean(MEDIA_BUCKET) });
});

app.get(['/api/cases', '/cases'], async (_req, res) => {
  try {
    if (!requireAws(res)) return;
    const cases = await listCases();
    res.json({ success: true, cases, total: cases.length });
  } catch (e: any) { structuredError('cases_list_failed', e); res.status(500).json({ success: false, error: 'Could not load civic cases', details: e.message }); }
});

app.get(['/api/cases/:id', '/cases/:id'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const civicCase = await getCase(req.params.id);
    if (!civicCase) return res.status(404).json({ success: false, error: 'Case not found' });
    res.json({ success: true, case: civicCase });
  } catch (e: any) { structuredError('case_load_failed', e, { case_id: req.params.id }); res.status(500).json({ success: false, error: 'Could not load case', details: e.message }); }
});

app.get(['/api/authorities', '/authorities'], (_req, res) => res.json({ success: true, authorities: AUTHORITY_REGISTRY }));

app.post('/api/transcribe', async (req, res) => {
  try {
    if (!requireAws(res)) return;
    if (!MEDIA_BUCKET) return res.status(500).json({ success: false, error: 'MEDIA_BUCKET is not configured' });
    const { audio, contentType = 'audio/webm', language = 'Auto Detect' } = req.body || {};
    const match = String(audio || '').match(/^data:audio\/[\w.+-]+;base64,(.+)$/);
    if (!match) return res.status(400).json({ success: false, error: 'Valid recorded audio is required.' });
    const key = `voice/${new Date().toISOString().slice(0,10)}/${randomUUID()}.webm`;
    await s3.send(new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, Body: Buffer.from(match[1], 'base64'), ContentType: contentType, ServerSideEncryption: 'AES256' }));
    const jobName = `civicvoice-${randomUUID()}`;
    const langMap: Record<string, any> = { Hindi: 'hi-IN', English: 'en-US', Portuguese: 'pt-BR', Spanish: 'es-US' };
    const languageCode = langMap[language] || 'en-US';
    await transcribe.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: `s3://${MEDIA_BUCKET}/${key}` },
      MediaFormat: 'webm',
      LanguageCode: languageCode,
      OutputBucketName: MEDIA_BUCKET,
    }));
    let status = 'IN_PROGRESS';
    let transcriptUri = '';
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const out = await transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
      status = out.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';
      transcriptUri = out.TranscriptionJob?.Transcript?.TranscriptFileUri || '';
      if (status === 'COMPLETED' || status === 'FAILED') break;
    }
    if (status !== 'COMPLETED' || !transcriptUri) {
      emitMetricSafe('TranscriptionFailures');
      return res.status(504).json({ success: false, error: 'Voice transcription did not complete in time.' });
    }
    const transcriptResponse = await fetch(transcriptUri);
    if (!transcriptResponse.ok) {
      emitMetricSafe('TranscriptionFailures');
      return res.status(502).json({ success: false, error: 'Could not retrieve the Transcribe result.' });
    }
    const transcriptJson: any = await transcriptResponse.json();
    const text = transcriptJson?.results?.transcripts?.[0]?.transcript || '';
    structuredLog('transcription_completed', { job_name: jobName, transcript_length: text.length });
    res.json({ success: true, transcript: text, audio_object_key: key, transcription_job: jobName });
  } catch (e: any) {
    structuredError('transcription_failed', e);
    emitMetricSafe('TranscriptionFailures');
    res.status(500).json({ success: false, error: 'Amazon Transcribe failed.', details: e.message });
  }
});

app.post('/api/media/presign', async (req, res) => {
  try {
    if (!requireAws(res)) return;
    if (!MEDIA_BUCKET) return res.status(500).json({ success: false, error: 'MEDIA_BUCKET is not configured' });
    const { contentType = 'image/jpeg', extension = 'jpg' } = req.body || {};
    if (!String(contentType).startsWith('image/')) return res.status(400).json({ success: false, error: 'Only image uploads are enabled in this MVP.' });
    const key = `evidence/${new Date().toISOString().slice(0,10)}/${randomUUID()}.${extension.replace(/[^a-z0-9]/gi, '')}`;
    const command = new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, ContentType: contentType, ServerSideEncryption: 'AES256' });
    const upload_url = await getSignedUrl(s3, command, { expiresIn: 600 });
    res.json({ success: true, upload_url, object_key: key, expires_in: 600 });
  } catch (e: any) { structuredError('media_presign_failed', e); res.status(500).json({ success: false, error: 'Could not create upload URL', details: e.message }); }
});

app.post(['/api/analyze', '/analyze'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const { complaint = '', image, location, location_type, language } = req.body || {};
    if (!complaint && !image) return res.status(400).json({ success: false, error: 'Provide a complaint or photo evidence.' });
    if (location_type === 'device_detected' && (!location || location.includes('Prayagraj, Uttar Pradesh'))) {
      return res.status(400).json({ success: false, error: 'Device location is unavailable. Please enable location or enter the location manually.' });
    }
    const existingCases = await listCases();

const analysis = await analyzeWithBedrock({
  complaint,
  image,
  location,
  language,
  existingCases
});

analysis.category = applyCategorySafeguard(
  normalizeCategory(analysis.category),
  complaint
);

const reg = resolveAuthorityByTaxonomy(
  analysis.category,
  location
);
    analysis.responsible_authority = analysis.responsible_authority || reg.authority;
    analysis.department = analysis.department || reg.department;
    analysis.jurisdiction = analysis.jurisdiction || reg.jurisdiction;
    analysis.location_type = location_type || 'manual';
    analysis.routing_decision = { authority: reg.authority, department: analysis.department, jurisdiction: reg.jurisdiction, endpoint: reg.routing_endpoint, routed_at: new Date().toISOString(), status: 'ROUTED', method: 'Deterministic category router' };
    analysis.ai_verification = { verified: false, verification_summary: 'AI triage completed. Human field verification is still required.', evidence_status: image ? 'Photo inspected by Amazon Bedrock' : 'Text-only evidence', confidence_level: `${analysis.confidence_score || 0}%` };
    analysis.audit_trail = { model: BEDROCK_MODEL_ID, analyzed_at: new Date().toISOString(), reasoning_summary: 'Multimodal civic triage recommendation generated by Amazon Bedrock.', input_modalities: image ? ['Text', 'Photographic Vision'] : ['Text'], human_governance_notice: 'AI assists with classification and routing. Final verification and operational decisions remain with authorized officials.', latency_ms: undefined };
    structuredLog('analysis_completed', { category: analysis.category, priority: analysis.priority });
    res.json({ success: true, analysis });
  } catch (e: any) {
    structuredError('bedrock_analysis_failed', e);
    emitMetricSafe('BedrockAnalysisFailures');
    res.status(500).json({ success: false, error: 'AWS AI analysis failed. Check Bedrock access, model access, and IAM permissions.', details: e.message });
  }
});

app.post(['/api/cases', '/cases'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const data = req.body || {};
    const category = data.category || 'OTHER';
    const reg = resolveAuthorityByTaxonomy(category, data.location);
    const now = new Date().toISOString();
    const initialStatus = resolveInitialStatus(data);
    const civicCase: CivicCase = {
      ...data,
      case_id: makeCaseId(), created_at: now, category,
      title: data.title || 'Civic Infrastructure Report',
      complaint: data.complaint || '', location: data.location || 'Unspecified Location',
      location_type: data.location_type || 'manual', media_type: data.media_type || 'none',
      department: data.department || reg.department, responsible_authority: data.responsible_authority || reg.authority, jurisdiction: data.jurisdiction || reg.jurisdiction,
      priority: data.priority || 'MEDIUM', severity_score: Number(data.severity_score || 5),
      confidence_score: Number(data.confidence_score || 0), confidence: data.confidence || 'AI confidence unavailable',
      status: initialStatus, assigned_officer: null, assigned_to: null, assigned_role: null, assigned_department: null,
      action_steps_completed: [], ai_generated: true, is_demo: false,
      citizen_name: data.citizen_name || 'Anonymous Citizen', citizen_contact: data.citizen_contact || 'Unspecified Contact',
      recommended_action: Array.isArray(data.recommended_action) ? data.recommended_action : ['Verify report on site'],
      ai_verification: { ...(data.ai_verification || {}), verified: false, verification_summary: 'Awaiting human field verification.' },
      audit_trail: data.audit_trail || { model: BEDROCK_MODEL_ID, analyzed_at: now, reasoning_summary: 'Case persisted after AI triage.', input_modalities: ['Text'], human_governance_notice: 'Human officials retain final operational authority.' },
    } as CivicCase;
    delete (civicCase as any).image; // raw evidence must not be persisted in DynamoDB
    if (data.image && MEDIA_BUCKET) {
      const match = String(data.image).match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      if (match) {
        const ext = match[1].split('/')[1].replace('jpeg', 'jpg');
        const key = `evidence/${civicCase.case_id}.${ext}`;
        await s3.send(new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, Body: Buffer.from(match[2], 'base64'), ContentType: match[1], ServerSideEncryption: 'AES256' }));
        (civicCase as any).evidence_object_key = key;
      }
    }
    await saveCase(civicCase);

    const creationAuditInputs: AppendAuditInput[] = [
      {
        case_id: civicCase.case_id,
        event_type: 'CASE_CREATED',
        actor_type: 'CITIZEN',
        new_value: civicCase.status,
        metadata: { category: civicCase.category, priority: civicCase.priority, department: civicCase.department },
      },
    ];
    if (civicCase.status === 'AI_TRIAGED') {
      creationAuditInputs.push({
        case_id: civicCase.case_id,
        event_type: 'AI_TRIAGED',
        actor_type: 'AI',
        new_value: 'AI_TRIAGED',
        metadata: { model: civicCase.audit_trail?.model },
      });
    }
    const creationAudit = await recordAuditBatch(creationAuditInputs);

    const eventResult = await publishCaseCreatedEvent(civicCase);
    if (!eventResult.ok) {
      emitMetricSafe('EventBridgePublishFailures');
      structuredError('case_event_publish_failed', new Error(eventResult.error || 'EventBridge publish failed'), { case_id: civicCase.case_id });
      res.status(201).json({
        success: true,
        case: civicCase,
        event: {
          published: false,
          error: eventResult.error,
          note: 'The case was saved to DynamoDB, but the officer notification event could not be published to EventBridge.',
        },
        audit: creationAudit.recorded
          ? { recorded: true, events: creationAudit.events.length }
          : { recorded: false, error: creationAudit.failed.join('; ') || 'Audit record unavailable.' },
      });
      return;
    }

    emitMetricSafe('CasesCreated', 1, { status: civicCase.status });
    if (civicCase.priority === 'CRITICAL') emitMetricSafe('CasesCritical', 1, {});
    if (civicCase.priority === 'HIGH') emitMetricSafe('CasesHigh', 1, {});

    structuredLog('case_creation_completed', { case_id: civicCase.case_id, status: civicCase.status, priority: civicCase.priority });
    res.status(201).json({
      success: true,
      case: civicCase,
      event: { published: true, event_id: eventResult.event_id },
      audit: creationAudit.recorded
        ? { recorded: true, events: creationAudit.events.length }
        : { recorded: false, error: creationAudit.failed.join('; ') || 'Audit record unavailable.' },
    });
  } catch (e: any) {
    structuredError('case_creation_failed', e);
    res.status(500).json({ success: false, error: 'Could not persist case to DynamoDB', details: e.message });
  }
});

app.get(['/api/cases/:id/history', '/cases/:id/history'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const civicCase = await getCase(req.params.id);
    if (!civicCase) return res.status(404).json({ success: false, error: 'Case not found' });
    const history = await getCaseHistory(req.params.id);
    res.json({ success: true, case_id: civicCase.case_id, history });
  } catch (e: any) {
    structuredError('case_history_failed', e, { case_id: req.params.id });
    res.status(500).json({ success: false, error: 'Could not load case history', details: e.message });
  }
});

app.patch(['/api/cases/:id/status', '/api/cases/:id'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const existing = await getCase(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Case not found' });

    const body = req.body || {};
    const now = new Date().toISOString();
    const requestedStatus = body.status as CaseStatus | undefined;
    const auditInputs: AppendAuditInput[] = [];
    const metricsToEmit: string[] = [];

    if (requestedStatus !== undefined) {
      const transition = validateStatusTransition(existing.status, requestedStatus);
      if (!transition.valid) {
        return res.status(400).json({
          success: false,
          error: transition.reason,
          code: 'INVALID_STATUS_TRANSITION',
          current_status: existing.status,
          requested_status: requestedStatus,
        });
      }
      if (requestedStatus !== existing.status && statusRequiresHumanAction(requestedStatus) && !(body.assigned_officer || body.human_override_note || body.actor_id)) {
        return res.status(400).json({
          success: false,
          error: `Moving a case to ${requestedStatus} requires human decision authorisation. Provide an assigned_officer or human_override_note to confirm the action.`,
          code: 'HUMAN_ACTION_REQUIRED',
        });
      }
    }

    const updates: Partial<CivicCase> = {};

    if (requestedStatus !== undefined) {
      updates.status = requestedStatus;
      if (requestedStatus !== existing.status) {
        if (requestedStatus === 'ASSIGNED') updates.assigned_at = now;
        if (requestedStatus === 'RESOLVED') updates.resolved_at = now;
        if (requestedStatus === 'CLOSED') updates.closed_at = now;
        if (requestedStatus === 'RESOLVED' || requestedStatus === 'CLOSED') {
          updates.resolution_note = body.resolution_note || body.human_override_note || existing.resolution_note || null;
        }
        if (requestedStatus === 'RESOLVED' || requestedStatus === 'CLOSED') metricsToEmit.push('CasesResolved');

        const eventType: AuditEventType =
          requestedStatus === 'FIELD_VERIFICATION' ? 'FIELD_VERIFICATION_STARTED'
          : requestedStatus === 'RESOLVED' ? 'RESOLVED'
          : requestedStatus === 'CLOSED' ? 'CLOSED'
          : 'STATUS_CHANGED';

        auditInputs.push({
          case_id: existing.case_id,
          event_type: eventType,
          actor_type: 'AUTHORIZED_OFFICER',
          actor_id: body.actor_id || body.assigned_officer || null,
          previous_value: existing.status,
          new_value: requestedStatus,
          metadata:
            body.human_override_note ? { note: body.human_override_note }
            : body.resolution_note ? { note: body.resolution_note }
            : undefined,
        });
      }
    }

    if (body.assigned_officer && body.assigned_officer !== existing.assigned_to && body.assigned_officer !== existing.assigned_officer) {
      const prevAssignee = existing.assigned_to || existing.assigned_officer || null;
      updates.assigned_to = body.assigned_officer;
      updates.assigned_officer = body.assigned_officer;
      updates.assigned_at = now;
      if (body.assigned_role) updates.assigned_role = body.assigned_role;
      if (body.assigned_department) updates.assigned_department = body.assigned_department;
      auditInputs.push({
        case_id: existing.case_id,
        event_type: prevAssignee ? 'REASSIGNED' : 'ASSIGNED',
        actor_type: 'AUTHORIZED_OFFICER',
        actor_id: body.actor_id || 'civicvoice-demo-console',
        previous_value: prevAssignee,
        new_value: body.assigned_officer,
        metadata: {
          ...(body.assigned_role ? { role: body.assigned_role } : {}),
          ...(body.assigned_department ? { department: body.assigned_department } : {}),
        },
      });
    }

    if (body.priority && body.priority !== existing.priority) {
      updates.priority = body.priority;
      auditInputs.push({ case_id: existing.case_id, event_type: 'PRIORITY_CHANGED', actor_type: 'AUTHORIZED_OFFICER', actor_id: body.actor_id || null, previous_value: existing.priority, new_value: body.priority });
    }
    if (body.category && body.category !== existing.category) {
      updates.category = body.category;
      auditInputs.push({ case_id: existing.case_id, event_type: 'CATEGORY_CHANGED', actor_type: 'AUTHORIZED_OFFICER', actor_id: body.actor_id || null, previous_value: existing.category, new_value: body.category });
    }
    if (body.department && body.department !== existing.department) {
      updates.department = body.department;
      auditInputs.push({ case_id: existing.case_id, event_type: 'DEPARTMENT_CHANGED', actor_type: 'AUTHORIZED_OFFICER', actor_id: body.actor_id || null, previous_value: existing.department, new_value: body.department });
    }

    const auditTrail = body.human_override_note
      ? {
          model: existing.audit_trail?.model || BEDROCK_MODEL_ID,
          analyzed_at: existing.audit_trail?.analyzed_at || now,
          reasoning_summary: existing.audit_trail?.reasoning_summary || 'Case persisted after AI triage.',
          input_modalities: existing.audit_trail?.input_modalities || ['Text'],
          human_governance_notice: `Human official update recorded: ${body.human_override_note}`,
          latency_ms: existing.audit_trail?.latency_ms,
        }
      : existing.audit_trail;
    if (body.human_override_note) updates.audit_trail = auditTrail;

    const nothingChanged = Object.keys(updates).length === 0 && auditInputs.length === 0;
    if (nothingChanged) {
      res.json({ success: true, case: existing, audit: { recorded: true, events: 0 } });
      return;
    }

    const updated = await updateCase(existing.case_id, updates);
    const auditResult = await recordAuditBatch(auditInputs);
    for (const metric of metricsToEmit) emitMetricSafe(metric, 1, {});

    structuredLog('case_status_update', { case_id: existing.case_id, previous_status: existing.status, current_status: updates.status, audit_recorded: auditResult.recorded });

    res.json({
      success: true,
      case: updated,
      audit: auditResult.recorded
        ? { recorded: true, events: auditResult.events.length }
        : { recorded: false, error: auditResult.failed.join('; ') || 'Audit record unavailable.' },
    });
  } catch (e: any) {
    structuredError('case_status_update_failed', e, { case_id: req.params.id });
    res.status(500).json({ success: false, error: 'Could not update case', details: e.message });
  }
});

app.patch(['/api/cases/:id/assignment', '/cases/:id/assignment'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const existing = await getCase(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Case not found' });

    const body: AssignmentPayload = req.body || {};
    const assignedTo = String(body.assigned_to || '').trim();
    if (!assignedTo) {
      return res.status(400).json({ success: false, error: 'assigned_to (the officer or team the case is assigned to) is required.', code: 'ASSIGNEE_REQUIRED' });
    }
    if (assignedTo.length > 120) {
      return res.status(400).json({ success: false, error: 'assigned_to must be 120 characters or fewer.', code: 'ASSIGNEE_TOO_LONG' });
    }
    if (body.assigned_role && !SUGGESTED_OFFICER_ROLES.includes(body.assigned_role)) {
      return res.status(400).json({ success: false, error: `assigned_role must be one of: ${SUGGESTED_OFFICER_ROLES.join(', ')}.`, code: 'INVALID_ROLE' });
    }

    const now = new Date().toISOString();
    const prevAssignee = existing.assigned_to || existing.assigned_officer || null;
    const updates: Partial<CivicCase & AssignmentPayload> = {
      assigned_to: assignedTo,
      assigned_officer: assignedTo,
      assigned_role: body.assigned_role || existing.assigned_role || undefined,
      assigned_department: body.assigned_department || existing.assigned_department || undefined,
      assigned_at: now,
    };
    if (existing.status === 'CREATED' || existing.status === 'AI_TRIAGED') updates.status = 'ASSIGNED';

    const updated = { ...existing, ...updates } as CivicCase;
    await saveCase(updated);

    const assignmentAudit = await appendAuditEvent({
      case_id: existing.case_id,
      event_type: prevAssignee ? 'REASSIGNED' : 'ASSIGNED',
      actor_type: 'AUTHORIZED_OFFICER',
      actor_id: body.actor_id || 'civicvoice-demo-console',
      previous_value: prevAssignee,
      new_value: assignedTo,
      metadata: {
        ...(body.assigned_role ? { role: body.assigned_role } : {}),
        ...(body.assigned_department ? { department: body.assigned_department } : {}),
        ...(body.note ? { note: body.note } : {}),
      },
    });

    structuredLog('case_assignment', { case_id: existing.case_id, from: prevAssignee, to: assignedTo, audit_recorded: assignmentAudit.recorded });

    res.json({
      success: true,
      case: updated,
      audit: assignmentAudit.recorded
        ? { recorded: true }
        : { recorded: false, error: 'Failed to record the assignment audit event.' },
    });
  } catch (e: any) {
    structuredError('case_assignment_failed', e, { case_id: req.params.id });
    res.status(500).json({ success: false, error: 'Could not assign the case', details: e.message });
  }
});

app.get(['/api/analytics/summary', '/analytics/summary'], async (_req, res) => {
  try {
    if (!requireAws(res)) return;
    const cases = await listCases();
    res.json({ success: true, generated_at: new Date().toISOString(), summary: computeAnalyticsSummary(cases) });
  } catch (e: any) {
    structuredError('analytics_summary_failed', e);
    res.status(500).json({ success: false, error: 'Could not load analytics summary', details: e.message });
  }
});

app.get(['/api/analytics/hotspots', '/analytics/hotspots'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const cases = await listCases();
    const radiusKm = Number(req.query.radius_km) || 2;
    res.json({ success: true, ...computeHotspots(cases, { radiusKm }) });
  } catch (e: any) {
    structuredError('analytics_hotspots_failed', e);
    res.status(500).json({ success: false, error: 'Could not load reported case hotspots', details: e.message });
  }
});

app.post(['/api/cases/:id/ask-ai', '/cases/:id/ask-ai'], async (req, res) => {
  try {
    if (!requireAws(res)) return;
    const civicCase = await getCase(req.params.id);
    if (!civicCase) return res.status(404).json({ success: false, error: 'Case not found' });
    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ success: false, error: 'Question is required' });
    const prompt = `Answer this civic operations question using only the supplied case facts. Do not invent facts.\nCASE: ${JSON.stringify({ case_id: civicCase.case_id, title: civicCase.title, category: civicCase.category, department: civicCase.department, priority: civicCase.priority, status: civicCase.status, location: civicCase.location, recommended_action: civicCase.recommended_action })}\nQUESTION: ${question}`;
    const response = await bedrock.send(new ConverseCommand({ modelId: BEDROCK_MODEL_ID, messages: [{ role: 'user', content: [{ text: prompt }] }], inferenceConfig: { temperature: 0.2, maxTokens: 700 } }));
    const answer = response.output?.message?.content?.map((x: any) => x.text || '').join('') || 'No answer generated.';
    res.json({ success: true, answer });
  } catch (e: any) { structuredError('ask_ai_failed', e, { case_id: req.params.id }); res.status(500).json({ success: false, error: 'Could not process AI question', details: e.message }); }
});

app.post(['/api/policy/recommendations', '/policy/recommendations'], async (_req, res) => {
  const { INITIAL_AI_DEVELOPMENT_PRIORITIES } = await import('./src/policyData');
  res.json({ success: true, recommendations: INITIAL_AI_DEVELOPMENT_PRIORITIES, source: 'data-backed demo layer', generated_at: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`[CivicVoice AWS] http://localhost:${PORT}`));
}

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) startServer();
export default app;
export { app };