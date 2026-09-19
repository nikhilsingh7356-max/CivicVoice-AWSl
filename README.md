# CivicVoice AI — AWS Ship It MVP

CivicVoice turns a citizen civic report into a structured, human-reviewable workflow.

## AWS architecture

```
Citizen Web App
   → API Gateway → Lambda/Express
        → Amazon Bedrock      (multimodal triage + case Q&A)
        → Amazon Transcribe   (voice → text)
        → Amazon S3           (private photo/audio evidence)
        → DynamoDB            (CivicVoiceCases – durable case storage)
        → DynamoDB            (CivicVoiceCaseHistory – append-only audit trail)
        → EventBridge         (CivicVoiceEventBus → CivicVoiceCriticalAlerts SNS)
        → CloudWatch          (CivicVoice metrics + alarms, structured logs)
        → API analytics       (summary + reported-case hotspots)
   → CloudFront + S3          (frontend hosting – deploy the Vite dist/ output)
```

## Important governance rules

- AI is never the decision-maker. Only authorized human officials assign, verify, resolve, or close a case; every human authority action is recorded in the immutable audit trail.
- GPT is deterministic: AI triage output is treated as untrusted AI output and never marks a case as officially verified.
- Priority/severity are recommendations for authorized human officials.
- GPS is never invented or replaced with a fake fallback. Hotspot centroids are averages of **actual citizen-reported coordinates** and are labeled as reported-case concentrations, not predictions.
- The 92% accuracy figure shown in the then-demo is fabricated; the current dashboard shows the real data or explicitly marks verification as pending.
- Raw evidence is stored in private S3, not DynamoDB, and never placed on the audit trail or the event bus.
- Metrics and logs never measure or claim success that did not happen: audit failures, EventBridge failures, Bedrock/Transcribe failures, and metrics disabled locally are all reported honestly.

## Event-Driven Notifications

New civic cases trigger an AWS event workflow for authorized officers. The flow is:

```
Citizen case
  → DynamoDB persistence succeeds
  → EventBridge CivicCaseCreated event published on CivicVoiceEventBus
  → EventBridge rule (CivicVoiceCriticalCaseRule) filters by priority
  → SNS topic CivicVoiceCriticalAlerts
  → authorized officer notification
```

### How it works

1. `POST /api/cases` completes the existing triage flow, then persists the case in DynamoDB.
2. **Only after** DynamoDB persistence succeeds does the Lambda publish a `CivicCaseCreated` event to the custom EventBridge bus **CivicVoiceEventBus** (source `civicvoice`, detail-type `CivicCaseCreated`) via `PutEventsCommand`. The event is never sent before persistence.
3. The event carries routing metadata only — `case_id`, `category`, `department`, `priority`, `severity_score`, `location`, optional `coordinates`, and `created_at`. Raw photos, audio, and AI responses are **never** placed on the event bus; evidence stays in private S3.
4. The **CivicVoiceCriticalCaseRule** listens for that event and forwards it to the SNS topic **CivicVoiceCriticalAlerts** only when `priority` is `CRITICAL` (or `HIGH`). `HIGH` is included because the existing authority dashboard already classifies `HIGH` and `CRITICAL` as the urgent priority-alert tier (`src/pages/AuthorityDashboardPage.tsx`). `LOW` and `MEDIUM` cases never trigger officer notifications.
5. If an `AlertEmail` subscription was created during deployment, the authorized officer receives an SNS email. The message states the AI priority/severity is advisory and that **human field verification is still required**. It does not claim official verification, a confirmed emergency, or guaranteed response.

### Deployment notes

- Event bus name: `CivicVoiceEventBus`
- SNS topic: `CivicVoiceCriticalAlerts` (officer alert emails)
- Rule: `CivicVoiceCriticalCaseRule` (only `CRITICAL`/`HIGH` cases)
- Optional SAM parameter `AlertEmail`: when a value is provided during deployment an `email` SNS subscription is created; when empty (default) no subscription is created and the stack still deploys. **The recipient must confirm the SNS subscription email** (Amazon sends a confirmation link) before messages are delivered.
- The Lambda publishes events with `events:PutEvents` scoped to the CivicVoice bus only. The SNS topic's resource policy allows only EventBridge (`events.amazonaws.com`) to publish. The backend never calls SNS directly and holds no `sns:Publish` permission.
- If `PutEvents` fails after the case is saved, the case remains in DynamoDB, the failure is logged, and the API reports `event.published: false` rather than pretending the notification was sent.

## Case lifecycle

Every case moves through a defined 7-state lifecycle (`src/server/lifecycle.ts`):

```
CREATED → AI_TRIAGED → ASSIGNED → FIELD_VERIFICATION → IN_PROGRESS → RESOLVED → CLOSED
```

- `CREATED`: citizen report received, awaiting AI triage.
- `AI_TRIAGED`: the AI triage artifacts (category explanation + analyzed_at) exist and the case was routed to a department. A new case starts as `AI_TRIAGED` **only** when those real artifacts are present; otherwise it starts as `CREATED`.
- `ASSIGNED`: an authorized official assigned the case to an officer.
- `FIELD_VERIFICATION`: the assigned officer began in-field verification.
- `IN_PROGRESS`: the work is being handled.
- `RESOLVED`: the issue was fixed, decided by a human.
- `CLOSED`: the ticket is closed, decided by a human.

Allowed transitions are enforced by `validateStatusTransition`; an invalid step returns `400 INVALID_STATUS_TRANSITION`. `CREATED` cannot jump straight to `RESOLVED`/`CLOSED`, and `AI_TRIAGED` cannot jump to `CLOSED`.

## Officer assignment

`PATCH /api/cases/:id/assignment` assigns a case to an officer:

- Body: `{ assigned_to, assigned_role, assigned_department, actor_id, note }`.
- `assigned_to` is required (`400 ASSIGNEE_REQUIRED`) and capped at 120 characters (`400 ASSIGNEE_TOO_LONG`).
- `assigned_role` must be one of the suggested officer roles in `SUGGESTED_OFFICER_ROLES` (`400 INVALID_ROLE`).
- Assigning a `CREATED` or `AI_TRIAGED` case advances it to `ASSIGNED` automatically.
- The legacy `assigned_officer` field is kept in sync for compatibility with the existing dashboard.
- Every assignment writes an `ASSIGNED` (first time) or `REASSIGNED` (change) audit event. `actor_id` defaults to `civicvoice-demo-console` so that demo actions are never confused with real officer identities.

## Audit trail (append-only case history)

- `GET /api/cases/:id/history` returns the full case history, oldest first.
- Events are stored in the **CivicVoiceCaseHistory** table: PK `case_id`, SK `timestamp_event_id` (`${ISO timestamp}#${uuid}`), so every event is uniquely ordered and immutable.
- IAM grants **only** `dynamodb:PutItem` (append) and `dynamodb:Query` (read) — there is no update/delete route or permission for history records.
- Event types: `CASE_CREATED`, `AI_TRIAGED`, `STATUS_CHANGED`, `ASSIGNED`, `REASSIGNED`, `PRIORITY_CHANGED`, `CATEGORY_CHANGED`, `DEPARTMENT_CHANGED`, `FIELD_VERIFICATION_STARTED`, `RESOLVED`, `CLOSED`.
- Events record `who` (`actor_type`, `actor_id`) and `what changed` (`previous_value` → `new_value`), but **never** raw media or citizen contact microdata.
- If appending the audit event fails, the API reports `audit.recorded: false` (with the error) instead of pretending the audit succeeded; the case itself is still saved/updated.

## CloudWatch observability

- **Structured logs** (`service`: `CivicVoice`): a request-id middleware logs every `http_request` with `method`, `path`, `status`, `latency_ms`, `request_id`; operation logs exist for case create/update/assign, audit append, EventBridge publish, Bedrock analysis, and transcription. Logs are emitted in the AWS `INFO` log format and include case IDs.
- **Metrics** (namespace `CivicVoice`, published with `PutMetricData`): `CasesCreated` (dimension `status`), `CasesCritical`, `CasesHigh`, `CasesResolved`, `BedrockAnalysisFailures`, `TranscriptionFailures`, `EventBridgePublishFailures`.
- **Disabling locally / in tests:** set `DISABLE_CLOUDWATCH_METRICS=true` — metrics become no-ops (`emitMetricSafe`) and never wait on CloudWatch.
- **Redaction:** log fields matching secrets/media/PII are redacted before output.
- **Alarms** (in `aws-resources.yaml`, no actions attached): `CivicVoiceLambdaErrorsAlarm` (AWS/Lambda `Errors` ≥ 1 over 300 s) and `CivicVoiceEventBridgePublishFailuresAlarm` (custom `CivicVoice` metric ≥ 1 over 300 s).
- The Lambda publishes metrics with `cloudwatch:PutMetricData` scope `*` (required for custom-namespace metrics).
- Test coverage ensures analytics/history GET endpoints never publish events and metrics failures are non-fatal.

## Civic analytics dashboard

The frontend routes `/analytics` (CivicAnalyticsPage) against:

- `GET /api/analytics/summary` → totals, open/resolved, priority buckets, status distribution, department load, and recent cases (newest first).
- `GET /api/analytics/hotspots?radius_km=N` → reported-case concentrations (see below).

The API computes analytics live from the `CivicVoiceCases` table over the same data the dashboard shows — never fabricated.

## Reported case hotspots (not predictions)

- Hotspots are computed from **actual citizen-provided coordinates** (`computeHotspots` in `src/server/analytics.ts`).
- Coordinates are clustered into grid cells bound by a radius (default 2 km, clamped 0.5–25 km). Each hotspot's centroid is the **average of the reported coordinates in the cell**, never an invented point.
- Cases without usable coordinates (missing or out-of-range lat/lng) are counted in `excluded_cases` and never silently injected into a hotspot.
- Every hotspot result carries a non-predictive disclaimer note: *"Reported case concentration based on citizen-reported coordinates. It reflects where reports have been filed, not a prediction of future incidents."*

## Human-in-the-loop governance

- Moving a case to `RESOLVED` or `CLOSED` requires a recorded human decision: an assigned officer, a `human_override_note`, or an acting `actor_id`; otherwise the API returns `400 HUMAN_ACTION_REQUIRED`.
- Human override notes are written into the case's `audit_trail.human_governance_notice` and `resolution_note`, and surfaced as audit events — they are never overwritten by AI output.
- The case detail page renders the immutable history trail and blocks AI-only shortcuts to terminal states.

## Local setup

```powershell
npm install
copy .env.example .env
npm run dev
```

Local execution still requires AWS credentials with access to Bedrock, DynamoDB, S3 and Transcribe.

## AWS deployment

1. Install/configure AWS CLI and SAM.
2. Enable access to the selected Bedrock model in the target region/account.
3. Build the Lambda bundle:

```powershell
npm run build:lambda
```

4. Deploy the SAM stack using `aws-resources.yaml`.
5. Build the frontend with `npm run build` and publish `dist/` to an S3 website/origin behind CloudFront.
6. Set the frontend API base/origin to the deployed API Gateway URL if frontend and API are on different origins.

## AI coding tools

If AI coding tools were used during the hackathon, list the exact tools in the submission write-up as required by the event rules.
