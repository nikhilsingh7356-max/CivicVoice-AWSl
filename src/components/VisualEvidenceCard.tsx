import React, { useState } from 'react';
import { VisualEvidence } from '../types';
import { Eye, ShieldCheck, AlertCircle, Info, Maximize2, X, ZoomIn } from 'lucide-react';

interface VisualEvidenceCardProps {
  evidence?: VisualEvidence;
  image?: string;
  className?: string;
}

export const VisualEvidenceCard: React.FC<VisualEvidenceCardProps> = ({
  evidence,
  image,
  className = '',
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!evidence && !image) {
    return (
      <div
        id="card-visual-evidence-empty"
        className={`rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 ${className}`}
      >
        <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
          <Info className="w-4 h-4 text-slate-500" />
          <span>Visual Evidence Notice</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          No photographic evidence was uploaded with this complaint. Assessment is structured entirely from the citizen's textual account and localized infrastructure taxonomy.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        id="card-visual-evidence"
        className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden ${className}`}
      >
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AI Visual Evidence Inspection
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {evidence?.evidence_confidence && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                Confidence: {evidence.evidence_confidence}
              </span>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Amazon Bedrock Vision
            </span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          {image && (
            <div className="md:col-span-5 flex flex-col gap-2">
              <div 
                className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video md:aspect-4/3 flex items-center justify-center group cursor-pointer"
                onClick={() => setIsZoomed(true)}
              >
                <img
                  src={image}
                  alt="Citizen Civic Evidence"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                  <span>CITIZEN EVIDENCE</span>
                </span>
                <button
                  type="button"
                  aria-label="Expand image view"
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-900"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="italic">Click image to inspect full-res</span>
                <span className="font-mono text-[10px] text-slate-400">Multimodal vision part</span>
              </div>
            </div>
          )}

          <div className={image ? 'md:col-span-7 flex flex-col justify-between' : 'md:col-span-12'}>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
                  AI-Observed Anomaly
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {evidence?.detected_issue || 'Surface or infrastructure anomaly detected'}
                </p>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
                  Visible Physical Characteristics
                </span>
                <div className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  <p className="italic text-slate-500 text-[11px] mb-1">
                    "AI visual inspection appears to show:"
                  </p>
                  <p className="font-medium text-slate-800">
                    {evidence?.visible_evidence || 'Features correspond to the reported civic complaint.'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
                  Potential Public Risk & Impact
                </span>
                <p className="text-xs text-slate-700 mt-0.5 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{evidence?.potential_public_impact || 'Potential commuter hazard or pedestrian hindrance.'}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Visual inference provided as decision support — requires on-ground verification by municipal engineer.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {isZoomed && image && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2 text-xs font-mono">
                <ZoomIn className="w-4 h-4 text-cyan-400" />
                <span>EVIDENCE INSPECTION VIEWER</span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/50 max-h-[75vh] overflow-auto">
              <img
                src={image}
                alt="Enlarged Civic Evidence"
                className="max-h-[70vh] w-auto object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Observation: {evidence?.detected_issue || 'Surface anomaly'}</span>
              <span className="text-[11px] font-mono text-cyan-400">Confidence: {evidence?.evidence_confidence || 'High'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
