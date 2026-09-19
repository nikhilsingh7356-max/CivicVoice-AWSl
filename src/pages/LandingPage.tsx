import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Eye, Cpu, Users, FileText, CheckCircle2, AlertTriangle, Layers, Globe } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  onLoadDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onLoadDemo }) => {
  return (
    <div className="w-full space-y-16 py-8 sm:py-12">
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Top Banner / Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-slate-200 border border-slate-700 text-xs font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold text-amber-300">BRICS Hackathon Project</span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1 text-slate-300 font-mono">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Powered by Amazon Bedrock Multimodal AI
            </span>
          </div>

          {/* Main Title & Hero Tagline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 font-sans">
              BRICS CIVICVOICE AI
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-amber-600">
              "Speak. Show. We Structure. Authorities Act."
            </p>
          </div>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            An AI-native civic intelligence platform that transforms natural citizen reports into structured, prioritized and actionable civic cases.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="hero-btn-report"
              onClick={() => onNavigate('/citizen')}
              className="px-6 py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm hover:bg-blue-800 transition-all shadow-sm flex items-center gap-2"
            >
              <span>Report a Civic Issue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-btn-authority"
              onClick={() => onNavigate('/authority')}
              className="px-5 py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all border border-slate-800 flex items-center gap-2"
            >
              <span>Authority Dashboard</span>
            </button>

            <button
              id="hero-btn-policy"
              onClick={() => onNavigate('/policy')}
              className="px-5 py-3.5 rounded-xl bg-indigo-900 text-indigo-100 font-semibold text-sm hover:bg-indigo-800 transition-all border border-indigo-700 flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Policy & Planning Dashboard</span>
            </button>

            <button
              id="hero-btn-demo"
              onClick={() => {
                onNavigate('/citizen');
                onLoadDemo();
              }}
              className="px-5 py-3.5 rounded-xl bg-amber-50 text-amber-900 font-semibold text-sm hover:bg-amber-100 transition-all border border-amber-300 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Load 2-Min Demo Case</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3 STEPS CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-black text-slate-300 font-mono">01</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">REPORT</h3>
            <p className="text-xs text-slate-500 uppercase font-semibold mt-1">Natural Citizen Input</p>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
              Citizens describe issues in conversational natural language (Hindi, Portuguese, English, etc.) and snap an optional photo. No complex dropdown hierarchies.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/40 to-white p-6 shadow-xs relative">
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                AMAZON BEDROCK AI
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-black text-blue-300 font-mono">02</span>
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">UNDERSTAND</h3>
            <p className="text-xs text-blue-700 uppercase font-semibold mt-1">Multimodal Civic Extraction</p>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
              Amazon Bedrock analyzes text semantics, inspects photographic evidence, identifies department routing, assesses public hazard severity, and detects correlated cases.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-black text-slate-300 font-mono">03</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">ACT</h3>
            <p className="text-xs text-emerald-700 uppercase font-semibold mt-1">Human-Verified Execution</p>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
              Municipal authorities receive an actionable operational dossier with a clear 4-step work plan, officer dispatch routing, and live transparency timeline.
            </p>
          </div>
        </div>
      </section>

      {/* AI PIPELINE VISUALIZATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-slate-950 text-white p-6 sm:p-8 border border-slate-800 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
            <div>
              <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
                End-to-End Civic Architecture
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                Amazon Bedrock Multimodal Intelligence Pipeline
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-time Server-side Inference</span>
            </div>
          </div>

          {/* Pipeline Horizontal Flow */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1">STAGE 1</span>
                <h4 className="text-sm font-bold text-white">Citizen Input</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Messy complaint text in native vernacular + optional mobile camera photo
                </p>
              </div>
              <span className="text-[11px] font-mono text-blue-400 mt-3 block">Text / Voice / Image</span>
            </div>

            <div className="bg-blue-950/70 rounded-xl p-4 border border-blue-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-300 block mb-1">STAGE 2</span>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  Amazon Bedrock Multimodal
                </h4>
                <p className="text-xs text-blue-200/80 mt-1 leading-relaxed">
                  Dual-stream inference parsing visual damage & contextual semantics
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 mt-3 block">Amazon Bedrock 2.5 Flash</span>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1">STAGE 3</span>
                <h4 className="text-sm font-bold text-white">Civic Intelligence</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Department taxonomy routing, 1-10 severity score, related report matching
                </p>
              </div>
              <span className="text-[11px] font-mono text-amber-400 mt-3 block">Structured Schema</span>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1">STAGE 4</span>
                <h4 className="text-sm font-bold text-white">Actionable Case</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Official CV-2026 record created with AI explanation and action checklist
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 mt-3 block">Registry Dossier</span>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1">STAGE 5</span>
                <h4 className="text-sm font-bold text-white">Authority Response</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Officer dispatch, priority triage queue, resolution timeline updates
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-300 mt-3 block">Human Decision</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM STORY: OLD MODEL VS NEW MODEL & MAIN USP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Main USP Box */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Core Innovation & Positioning
              </span>
              <h3 className="text-xl font-bold text-slate-900 leading-snug">
                "CivicVoice AI does not replace civic reporting systems. It transforms the intake layer from form-based reporting into AI-powered multimodal civic understanding."
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Traditional civic portals place the cognitive burden on the citizen — forcing users to choose from hundreds of administrative sub-codes, departments, and formal terminology. CivicVoice AI lets people speak and show problems naturally.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Designed for 2026 BRICS Cities</span>
              <button
                onClick={() => onNavigate('/citizen')}
                className="text-blue-700 font-semibold hover:underline flex items-center gap-1"
              >
                Try the Intake Flow <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Old Model vs New Model Comparison */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-6 sm:p-7 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Paradigm Shift: The Civic Intake Layer</h3>
              <p className="text-xs text-slate-500 mt-1">Why traditional municipal portals fail citizens and overload staff</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              {/* Old Model */}
              <div className="p-6 bg-rose-50/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Traditional Model</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="p-2.5 rounded-md bg-white border border-rose-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Rigid Multi-Page Forms</span>
                    Citizens must guess obscure municipal department codes.
                  </div>
                  <div className="p-2.5 rounded-md bg-white border border-rose-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Misrouted Complaints</span>
                    40%+ of civic tickets get routed to incorrect departments.
                  </div>
                  <div className="p-2.5 rounded-md bg-white border border-rose-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Duplicate Inundation</span>
                    Ten citizens report the same pothole, creating 10 siloed tickets.
                  </div>
                </div>
              </div>

              {/* New Model */}
              <div className="p-6 bg-emerald-50/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">CivicVoice AI Model</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="p-2.5 rounded-md bg-white border border-emerald-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Conversational & Multimodal</span>
                    Citizens report in natural voice, colloquial text, and photos.
                  </div>
                  <div className="p-2.5 rounded-md bg-white border border-emerald-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Autonomous Smart Routing</span>
                    Amazon Bedrock maps issues directly to the right municipal department with reasons.
                  </div>
                  <div className="p-2.5 rounded-md bg-white border border-emerald-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Correlated Issue Clustering</span>
                    Identifies potentially related nearby cases for decision support.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRICS SCALABILITY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="max-w-3xl mb-6">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              BRICS Readiness
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-2">
              Cross-Border Civic Scalability Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              Common AI-powered civic workflow with country-specific language, department, and governance configuration. The architecture cleanly separates language, country, department taxonomy, and municipal workflow rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg">🇮🇳</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Active</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">India</h4>
              <p className="text-xs text-slate-600">
                Hindi, English & regional vernaculars. Integrated with Public Works & Swachh civic taxonomies.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg">🇧🇷</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Active</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Brazil</h4>
              <p className="text-xs text-slate-600">
                Portuguese language understanding. Mapped to municipal subprefeitura & limpeza urbana structures.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg">🇿🇦</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Active</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">South Africa</h4>
              <p className="text-xs text-slate-600">
                English & 11 official languages ready. Configured for municipal service delivery wards.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg">🇷🇺</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Taxonomy Ready</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Russia</h4>
              <p className="text-xs text-slate-600">
                Cyrillic NLP parsing & municipal housing/utilities (ZHKH) department workflows.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg">🇨🇳</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Taxonomy Ready</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">China</h4>
              <p className="text-xs text-slate-600">
                Simplified Chinese character parsing aligned to urban management (Chengguan) protocols.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HUMAN-IN-THE-LOOP AI GOVERNANCE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-300 bg-slate-900 text-slate-200 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Human-in-the-Loop AI Governance Standard</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              AI recommendations assist civic staff. Final classification, prioritization and action remain strictly under human authority. AI-generated content may require on-site verification.
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              * Compliant with BRICS responsible artificial intelligence civic frameworks.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/authority')}
            className="shrink-0 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
          >
            <span>View Authority Controls</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
