import React, { useEffect } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  ClipboardList,
  FileText,
  Landmark,
  MapPin,
  Mic,
  Navigation,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  DevModeBanner,
  PublicFooter,
  PublicHeader,
  initHomeHashScroll,
  scrollToSection,
  PublicChromeProps,
} from '../components/public/PublicChrome';

const PROBLEMS = [
  {
    title: 'Reports get lost',
    body: 'Complaints spread across phone calls, messages and paperwork — with no single record of what was raised, when, or by whom.',
  },
  {
    title: 'Information arrives incomplete',
    body: 'Missing location, evidence and detail force unnecessary follow-up before anything can begin.',
  },
  {
    title: 'Classification is inconsistent',
    body: 'The same issue can be labelled differently depending on who files it, making demand impossible to compare.',
  },
  {
    title: 'Citizens never hear back',
    body: 'Without a shared status, the process feels invisible — and trust in it erodes.',
  },
];

const STEPS = [
  {
    icon: FileText,
    step: 'Step 1',
    title: 'Describe',
    body: 'Report in plain words — typed or spoken. CivicVoice understands natural language across multiple languages.',
  },
  {
    icon: Camera,
    step: 'Step 2',
    title: 'Add evidence',
    body: 'Attach a photo or short video that shows the problem exactly as it is. Evidence is stored privately.',
  },
  {
    icon: Navigation,
    step: 'Step 3',
    title: 'Confirm location',
    body: 'Auto-detect your position or place the marker manually, so the responsible authority can respond accurately.',
  },
  {
    icon: ShieldCheck,
    step: 'Step 4',
    title: 'Submit and track',
    body: 'CivicVoice structures the case, routes it to the right authority, and tracks it through the response lifecycle.',
  },
];

const FEATURES = [
  {
    icon: Mic,
    title: 'Multimodal reporting',
    body: 'Text, voice, photo and video capture in one guided flow — no app install needed to report.',
  },
  {
    icon: FileText,
    title: 'Structured civic dossiers',
    body: 'From free-text complaints, Amazon Bedrock helps prepare a structured case: category, severity and responsible authority.',
  },
  {
    icon: MapPin,
    title: 'Location-aware intake',
    body: 'Geolocation or manual pinning. Sector and distance are resolved server-side, so nothing is guessed in the browser.',
  },
  {
    icon: ClipboardList,
    title: 'Transparent case lifecycle',
    body: 'Every case moves through a defined status ladder with a complete, append-only audit history.',
  },
  {
    icon: Landmark,
    title: 'Officer workflow',
    body: 'Review, assign, prioritise and update cases from a single operations console — with human review at every decision.',
  },
  {
    icon: BarChart3,
    title: 'Per-area analytics',
    body: 'Hotspots, workload and community demand summarised by sector and authority to guide response.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    body: 'Status changes reach the right officers at the right time, so reports don\u2019t stall silently.',
  },
];

const ARCH_FLOW = [
  'Citizen web app',
  'Amazon API Gateway',
  'AWS Lambda',
  'Amazon S3 · Transcribe · Bedrock',
  'Amazon DynamoDB',
  'Amazon EventBridge',
  'Amazon SNS',
];

const SAFETY = [
  {
    title: 'AI never decides alone',
    body: 'AI helps organise reporting and drafts structured summaries — it never finalises a case, assigns blame or issues decisions on its own.',
  },
  {
    title: 'Locations and evidence are real',
    body: 'Location and attachments come from what people actually provide. AI is never used to invent a location or fabricate evidence.',
  },
  {
    title: 'Every AI output is reviewable',
    body: 'Generated summaries and classifications sit beside the original report so people can verify anything end to end.',
  },
  {
    title: 'Authorisation stays human',
    body: 'Authority and permissions live in the application layer, where people decide what happens next.',
  },
];

const HomePage: React.FC<PublicChromeProps> = ({ onNavigate }) => {
  const { status, user, login } = useAuth();
  const authenticated = status === 'authenticated' && Boolean(user);

  useEffect(() => {
    initHomeHashScroll();
  }, []);

  const report = () => {
    if (authenticated) {
      onNavigate('/app/report');
    } else {
      login('/app/report');
    }
  };

  const metrics = authenticated && user ? user : null;

  return (
    <div className="min-h-screen bg-cv-canvas">
      <DevModeBanner />
      <PublicHeader onNavigate={onNavigate} />

      <main>
        {/* Hero */}
        <section className="border-b border-cv-line bg-cv-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-20">
            <div>
              <p className="eyebrow">
                <span className="dot bg-pine-500" aria-hidden="true" />
                Global civic infrastructure reporting
              </p>
              <h1 className="mt-4 max-w-2xl text-[2.1rem] font-semibold leading-[1.15] tracking-[-0.02em] text-navy-950 md:text-[2.6rem]">
                Report civic problems. Help communities respond faster.
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-navy-600">
                CivicVoice turns a messy citizen report into a structured, trackable case — broken roads,
                water leaks, hazardous drains, streetlight failures — and routes it to the responsible
                authority, with human review in control throughout.
              </p>
              <ul className="mt-5 flex max-w-xl flex-wrap gap-x-5 gap-y-1.5 text-[13px] font-medium text-navy-700">
                <li>AI-assisted classification</li>
                <li>Photo, video &amp; voice evidence</li>
                <li>Human review in control</li>
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button onClick={report} className="btn btn-primary btn-lg">
                  Report an issue
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works', onNavigate)}
                  className="btn btn-secondary btn-lg"
                >
                  See how it works
                </button>
              </div>
              <p className="meta mt-4">Free for citizens. Every report is routed to the responsible authority.</p>
            </div>

            <div aria-hidden="true" className="hidden md:block">
              <div className="rounded-xl border border-cv-line bg-cv-subtle p-6 shadow-cv-1">
                <p className="eyebrow">Example report</p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-navy-800">
                  “The water main on Station Road has been leaking for a week. The sidewalk is flooded
                  near the school gate and water is being wasted.”
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge border-pine-200 bg-pine-50 text-pine-800">Water supply</span>
                  <span className="badge border-amber-200 bg-amber-50 text-amber-800">High severity</span>
                  <span className="badge border-navy-200 bg-navy-50 text-navy-700">Responsible: water authority</span>
                </div>
                <p className="mt-4 grid grid-cols-[auto_1fr] items-center gap-2 border-t border-cv-line pt-4 text-[12px] text-navy-500">
                  <MapPin size={13} className="text-pine-600" />
                  Station Road sector — detected from geolocation
                </p>
                <p className="mt-2 flex items-center gap-2 text-[12px] text-navy-500">
                  <ShieldCheck size={13} className="text-pine-600" />
                  Human review required before status changes are finalised
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-cv-line bg-cv-canvas">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <p className="eyebrow">Why reporting is stuck</p>
            <h2 className="mt-3 max-w-xl text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-navy-950">
              The problem isn't that people don't report. It's that reports don't travel well.
            </h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PROBLEMS.map((p, i) => (
                <div key={p.title} className="panel p-5">
                  <p className="label-xs text-pine-700">0{i + 1}</p>
                  <h3 className="section-title mt-2">{p.title}</h3>
                  <p className="subtitle mt-1.5 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-2xl text-[14px] leading-relaxed text-navy-600">
              CivicVoice is built to change that: one consistent report shape, one structured case,
              one visible lifecycle — and a system that keeps citizens and officers on the same page.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 border-b border-cv-line bg-cv-surface">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 max-w-xl text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-navy-950">
              Four steps from street scene to structured case.
            </h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.title} className="panel p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-800 text-white" aria-hidden="true">
                    <s.icon size={16} />
                  </span>
                  <p className="label-xs mt-4 text-pine-700">{s.step}</p>
                  <h3 className="section-title mt-1">{s.title}</h3>
                  <p className="subtitle mt-1.5 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-7 max-w-2xl text-[13.5px] leading-relaxed text-navy-600">
              AI summarises and classifies your report. People review, verify and decide. Officers can
              correct anything before it matters.
            </p>
          </div>
        </section>

        {/* Architecture / Trust */}
        <section id="about" className="scroll-mt-24 border-b border-cv-line bg-cv-canvas">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <p className="eyebrow">Built on AWS</p>
            <h2 className="mt-3 max-w-2xl text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-navy-950">
              A defensible architecture — managed services end to end.
            </h2>
            <div className="mt-8 flex flex-wrap items-center gap-y-3 rounded-xl border border-cv-line bg-cv-surface p-5 shadow-cv-1">
              {ARCH_FLOW.map((node, i) => (
                <React.Fragment key={node}>
                  <span className="rounded-md border border-navy-200 bg-navy-50 px-3 py-1.5 text-[12.5px] font-medium text-navy-800">
                    {node}
                  </span>
                  {i < ARCH_FLOW.length - 1 && (
                    <ArrowRight size={14} className="mx-1.5 text-navy-300" aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="panel p-6">
                <h3 className="section-title">How data flows</h3>
                <p className="subtitle mt-2 leading-relaxed">
                  Reports arrive through API Gateway into Lambda. Evidence goes to private S3 storage,
                  voice is transcribed with Amazon Transcribe, and structured dossiers are prepared with
                  Amazon Bedrock foundation models. Cases and a full audit history live in DynamoDB with
                  point-in-time recovery. Workflow events flow through EventBridge and officer alerts
                  through SNS.
                </p>
              </div>
              <div className="panel p-6">
                <h3 className="section-title">How trust is kept</h3>
                <p className="subtitle mt-2 leading-relaxed">
                  AI outputs are treated as recommendations and validated by deterministic application
                  rules. A human officer reviews each case before status changes are finalised, and the
                  full history is append-only — so every decision can be traced back to the original report.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 border-b border-cv-line bg-cv-surface">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <p className="eyebrow">Features</p>
            <h2 className="mt-3 max-w-xl text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-navy-950">
              Everything a civic report needs to become action.
            </h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="panel p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-pine-100 text-pine-700" aria-hidden="true">
                    <f.icon size={16} />
                  </span>
                  <h3 className="section-title mt-4">{f.title}</h3>
                  <p className="subtitle mt-1.5 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Safety */}
        <section id="ai-assists" className="scroll-mt-24 border-b border-cv-line bg-navy-950">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <p className="eyebrow" style={{ color: 'var(--color-pine-300)' }}>
              <span className="dot bg-pine-400" aria-hidden="true" />
              Our safety position
            </p>
            <h2 className="mt-3 max-w-2xl text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-white">
              AI assists. People decide.
            </h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {SAFETY.map((s) => (
                <div key={s.title} className="rounded-lg border border-navy-800 bg-navy-900/70 p-5">
                  <h3 className="text-[14px] font-semibold text-navy-100">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-navy-300">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-cv-canvas">
          <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
            <h2 className="mx-auto max-w-xl text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-navy-950">
              Have a civic issue to report?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-navy-600">
              Take a couple of minutes to tell us what's broken in your street. A structured report
              gets a structured response.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button onClick={report} className="btn btn-primary btn-lg">
                Report an issue
                <ArrowRight size={15} aria-hidden="true" />
              </button>
              <button
                onClick={() => scrollToSection('how-it-works', onNavigate)}
                className="btn btn-secondary btn-lg"
              >
                See how it works
              </button>
            </div>
            {metrics?.developmentMode && (
              <p className="meta mt-5">Development session is active — see the operations dashboard from the header.</p>
            )}
          </div>
        </section>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};

export default HomePage;