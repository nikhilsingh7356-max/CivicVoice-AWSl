import React from 'react';
import { ShieldCheck, Sparkles, Globe2, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 border-t border-slate-800 text-xs py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand & Manifesto */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <span>BRICS CIVICVOICE AI</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900 text-blue-300">
                Hackathon Prototype
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              "From Citizen Voice to Actionable Civic Intelligence." Transforming unstructured citizen inputs (multilingual text and photographic evidence) into structured, prioritized, and human-verified civic cases using Amazon Bedrock multimodal AI.
            </p>
            <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Core Intelligence: Amazon Bedrock 2.5 Flash</span>
            </div>
          </div>

          {/* BRICS Member Readiness */}
          <div className="md:col-span-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
              <Globe2 className="w-3.5 h-3.5 text-blue-400" />
              <span>BRICS Localization Architecture</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Designed with modular language understanding, local department taxonomies, and cross-border civic governance standards:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                🇮🇳 India (Hindi / English)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                🇧🇷 Brazil (Portuguese)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                🇿🇦 South Africa (Multi-Language)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                🇷🇺 Russia
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                🇨🇳 China
              </span>
            </div>
          </div>

          {/* AI Governance Note */}
          <div className="md:col-span-3 space-y-2 p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Responsible AI Governance</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              AI recommendations assist civic staff. Final classification, prioritization, and budget dispatch remain strictly under human municipal authority.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <div>
            © 2026 BRICS CivicVoice AI Initiative. Demonstrator project for hackathon evaluation.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <HeartHandshake className="w-3 h-3 text-amber-500" />
              Human-in-the-Loop Protocol
            </span>
            <span>•</span>
            <span>AI Studio Cloud Run Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
