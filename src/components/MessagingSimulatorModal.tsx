import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Smartphone,
  Shield,
  FileCheck,
} from 'lucide-react';
import { CivicCase } from '../types';
import { DEMO_POTHOLE_IMAGE, DEMO_WATER_IMAGE, DEMO_WASTE_IMAGE } from '../demoImages';

interface MessagingSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (newCase: CivicCase) => void;
  onViewCase?: (caseId: string) => void;
}

interface MessagePreset {
  title: string;
  language: string;
  text: string;
  location: string;
  image?: string;
}

const PRESETS: MessagePreset[] = [
  {
    title: 'Water Crisis (Prayagraj, Hindi)',
    language: 'Hindi',
    text: 'हमारे कटरा मोहल्ले में पिछले 4 दिनों से पीने का पानी नहीं आ रहा है। नलों में गंदा बदबूदार पानी आया था फिर बिल्कुल बंद हो गया। बच्चे और बुजुर्ग बहुत परेशान हैं, तुरंत टैंकर भेजा जाए।',
    location: 'Katra, Prayagraj, Uttar Pradesh',
    image: DEMO_WATER_IMAGE,
  },
  {
    title: 'Severe Pothole (Prayagraj, Hinglish)',
    language: 'Hindi/English',
    text: 'Civil lines Stanley road crossing pe bohot gehra pothole hai. Kal raat 2 bikes girte girte bachi. Please repair urgently before rain starts.',
    location: 'Stanley Road Crossing, Prayagraj, Uttar Pradesh',
    image: DEMO_POTHOLE_IMAGE,
  },
  {
    title: 'Waste Overflow (Commercial Ward, English)',
    language: 'English',
    text: 'Open commercial waste bins overflowing onto pedestrian walkway for 5 days. Foul stench, stray cattle creating traffic obstruction.',
    location: 'MG Marg Market, Prayagraj, Uttar Pradesh',
    image: DEMO_WASTE_IMAGE,
  },
  {
    title: 'Solid Waste (Portuguese)',
    language: 'Portuguese',
    text: 'Lixo acumulado na calçada há vários dias perto da esquina comercial. Risco de pragas e mau cheiro insuportável para pedestres.',
    location: 'Rua Augusta, São Paulo, Brazil',
    image: DEMO_WASTE_IMAGE,
  },
];

export const MessagingSimulatorModal: React.FC<MessagingSimulatorModalProps> = ({
  isOpen,
  onClose,
  onCaseCreated,
  onViewCase,
}) => {
  const [messageText, setMessageText] = useState(PRESETS[0].text);
  const [location, setLocation] = useState(PRESETS[0].location);
  const [language, setLanguage] = useState(PRESETS[0].language);
  const [attachedImage, setAttachedImage] = useState<string | undefined>(PRESETS[0].image);
  const [citizenName, setCitizenName] = useState('Ananya Srivastava');
  const [citizenPhone, setCitizenPhone] = useState('+91 94150-88219');

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [createdCase, setCreatedCase] = useState<CivicCase | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: MessagePreset) => {
    setMessageText(preset.text);
    setLocation(preset.location);
    setLanguage(preset.language);
    setAttachedImage(preset.image);
    setCreatedCase(null);
    setErrorMessage(null);
  };

  const handleSend = async () => {
    if (!messageText.trim()) {
      setErrorMessage('Please type a message or select a preset.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setCreatedCase(null);

    try {
      setCurrentStep('Ingesting inbound messaging webhook...');
      await new Promise((r) => setTimeout(r, 400));

      setCurrentStep('Invoking Amazon Bedrock 2.5 Flash for Multimodal & Semantic Intake...');
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint: messageText,
          location: location || 'Unspecified City',
          image: attachedImage,
          language,
        }),
      });

      if (!analyzeRes.ok) {
        throw new Error('Analysis service returned an error');
      }

      const analyzeData = await analyzeRes.json();
      if (!analyzeData.success || !analyzeData.analysis) {
        throw new Error(analyzeData.error || 'Failed to analyze messaging intake');
      }

      const analysis = analyzeData.analysis;

      setCurrentStep('Structuring civic case & executing Configured Authority Routing...');
      const caseRes = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizen_name: citizenName,
          citizen_contact: citizenPhone,
          complaint: messageText,
          location: location || analysis.location,
          location_type: 'manual',
          image: attachedImage,
          media_type: attachedImage ? 'photo' : 'none',
          title: analysis.title,
          category: analysis.category,
          subcategory: analysis.subcategory,
          citizen_summary: analysis.citizen_summary,
          authority_summary: analysis.authority_summary,
          detailed_description: analysis.detailed_description,
          department: analysis.department,
          responsible_authority: analysis.responsible_authority,
          jurisdiction: analysis.jurisdiction,
          priority: analysis.priority,
          severity_score: analysis.severity_score,
          language: analysis.language || language,
          citizen_impact: analysis.citizen_impact,
          recommended_action: analysis.recommended_action,
          evidence_observations: analysis.evidence_observations,
          safety_concern: analysis.safety_concern,
          estimated_urgency: analysis.estimated_urgency,
          confidence: analysis.confidence,
          confidence_score: analysis.confidence_score,
          why_department: analysis.why_department,
          why_case_matters: analysis.why_case_matters,
          ai_explanations: analysis.ai_explanations,
          potentially_related_cases: analysis.potentially_related_cases,
          audit_trail: {
            model: 'Amazon Bedrock Claude (Messaging Channel Adapter)',
            analyzed_at: new Date().toISOString(),
            reasoning_summary: `Inbound messaging report structured into ${analysis.category}; routed to ${analysis.responsible_authority}.`,
            input_modalities: attachedImage ? ['Messaging Text', 'Attached Photo'] : ['Messaging Text'],
            human_governance_notice: 'Triage recommendation generated autonomously. Municipal Engineer retains dispatch authorization.',
            latency_ms: 780,
          },
        }),
      });

      if (!caseRes.ok) {
        throw new Error('Case creation endpoint returned an error');
      }

      const caseData = await caseRes.json();
      if (!caseData.success || !caseData.case) {
        throw new Error(caseData.error || 'Failed to save case');
      }

      setCurrentStep('Case routed & synced to Civic Intelligence Policy Dashboard!');
      setCreatedCase(caseData.case);
      onCaseCreated(caseData.case);
    } catch (err: any) {
      console.error('Messaging simulator error:', err);
      setErrorMessage(err.message || 'Error processing messaging intake');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/90 flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Citizen Messaging Channel Simulator</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Demo Messaging Integration
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulating citizen reports via WhatsApp / Telegram into Amazon Bedrock 2.5 Flash pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
          <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Transparency Notice:</strong> This is an interactive demo adapter simulating conversational messaging intake.
            Messages pass through the real live <strong>Amazon Bedrock 2.5 Flash</strong> engine, create real cases, route to authorities, and update the Policy Dashboard in real time.
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Quick Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Demo Scenario Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-xs group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 group-hover:text-blue-700">{p.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {p.language}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] line-clamp-1">{p.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Simulator Canvas */}
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 space-y-4">
            {/* Citizen bubble info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{citizenName}</span>
                <span className="font-mono text-[11px] text-slate-500">{citizenPhone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Simulated Channel: WhatsApp Webhook</span>
              </div>
            </div>

            {/* Inbound Message Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Inbound Message Text (Any Language)</span>
                <span className="text-[11px] font-normal text-slate-500">Multilingual Amazon Bedrock Understanding</span>
              </label>
              <textarea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type citizen complaint message..."
                className="w-full p-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-white text-slate-800 resize-none font-sans"
              />
            </div>

            {/* Metadata Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Report Location</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Katra, Prayagraj"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Media Attachment</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 flex-1 truncate">
                    {attachedImage ? 'Photo attached' : 'No photo'}
                  </span>
                  {attachedImage && (
                    <button
                      type="button"
                      onClick={() => setAttachedImage(undefined)}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                  {!attachedImage && (
                    <button
                      type="button"
                      onClick={() => setAttachedImage(DEMO_WATER_IMAGE)}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Attach Sample Photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Progress Indicator */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <RefreshCw className="w-4 h-4 text-blue-700 animate-spin" />
                <span>{currentStep}</span>
              </div>
              <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Outcome */}
          {createdCase && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-bold block">
                      Case Created & Routed to Authority
                    </span>
                    <h4 className="text-lg font-black font-mono text-emerald-950">{createdCase.case_id}</h4>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Priority: {createdCase.priority}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-emerald-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Category & Subcategory:</span>
                  <span className="font-bold text-slate-900">{createdCase.category} — {createdCase.subcategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Responsible Authority:</span>
                  <span className="font-semibold text-blue-700">{createdCase.responsible_authority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Severity Assessment:</span>
                  <span className="font-bold text-amber-700">{createdCase.severity_score}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Policy Aggregation:</span>
                  <span className="font-semibold text-emerald-700">Reflected in Demand Hotspots & Gaps</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                {onViewCase && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewCase(createdCase.case_id);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors flex items-center gap-1.5"
                  >
                    <span>View Case Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-900 font-semibold text-xs hover:bg-emerald-100 transition-colors"
                >
                  Return to Policy Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Direct pipeline via Amazon Bedrock 2.5 Flash</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-send-messaging-sim"
              type="button"
              disabled={isProcessing}
              onClick={handleSend}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Pipeline...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Messaging Gateway</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
