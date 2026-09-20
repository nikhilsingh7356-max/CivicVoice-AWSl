import React, { useState, useRef } from 'react';
import { BedrockAnalysisResult, CivicCase } from '../types';
import { PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { Panel } from '../components/ui/Panel';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/useAuth';
import {
  Upload,
  MapPin,
  Mic,
  MicOff,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Building2,
  Compass,
  Send,
  User,
  Phone,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  formatDate,
  severityLabel,
  clampSeverity,
} from '../lib/format';

interface ReportIssuePageProps {
  onCaseCreated: (newCase: CivicCase) => void;
  onNavigate: (path: string) => void;
}

const PROCESSING_STAGES = [
  'Understanding the complaint in natural language…',
  'Reviewing attached photo or video evidence…',
  'Mapping the issue to the municipal taxonomy…',
  'Assessing public-safety severity…',
  'Identifying the responsible authority…',
  'Preparing the structured civic dossier…',
];

const LANGUAGES = ['Auto Detect', 'English', 'Hindi', 'Portuguese', 'Spanish', 'Other'];

const STEP_LABELS = ['Describe', 'Location', 'Evidence', 'Review'];

export const ReportIssuePage: React.FC<ReportIssuePageProps> = ({ onCaseCreated, onNavigate }) => {
  const { notify } = useToast();
  const { user, developmentMode } = useAuth();

  const [step, setStep] = useState(0);

  // Citizen details — prefilled from the signed-in profile; editable.
  const [citizenName, setCitizenName] = useState(user?.name ?? '');
  const [citizenContact, setCitizenContact] = useState(user?.email ?? '');

  // Complaint
  const [complaint, setComplaint] = useState('');
  const [language, setLanguage] = useState('Auto Detect');

  // Location
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'device_detected' | 'manual'>('manual');

  // Media
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [image, setImage] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Voice
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Analysis + submit
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [analysis, setAnalysis] = useState<BedrockAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCase, setCreatedCase] = useState<CivicCase | null>(null);

  const hasContent = Boolean(complaint.trim() || image || videoUrl);

  const toggleVoiceRecording = async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      notify('error', 'Voice recording is not supported in this browser — please type the complaint.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstart = () => setIsListening(true);
      recorder.onstop = async () => {
        setIsListening(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: reader.result, contentType: 'audio/webm', language }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Transcription failed');
            setComplaint((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
            notify('success', 'Your spoken complaint was transcribed.');
          } catch (err: any) {
            notify('error', `Transcription failed: ${err.message}`);
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
    } catch (err) {
      console.error('Microphone access failed:', err);
      setIsListening(false);
      notify('error', 'Microphone permission is required for voice reporting.');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      notify('error', 'Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setLocation(`${lat}, ${lng}`);
        setLocationType('device_detected');
        notify('success', 'Device location captured.');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocation('');
        setLocationType('manual');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleImageFile = (file: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify('error', 'Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    setImageFileName(file.name);
    setMediaType('photo');
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) setImage(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleVideoFile = (file: File) => {
    if (!file) return;
    setVideoFileName(file.name);
    setMediaType('video');
    setVideoUrl(URL.createObjectURL(file));
  };

  const canContinue = (s: number) => {
    if (s === 0) return true;
    if (s === 3) return hasContent;
    return true;
  };

  const handleAnalyze = async () => {
    if (!hasContent) {
      setAnalysisError('Please describe the problem or add photo/video evidence.');
      setStep(3);
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setStageIndex(0);
    const interval = window.setInterval(() => {
      setStageIndex((prev) => (prev < PROCESSING_STAGES.length - 1 ? prev + 1 : prev));
    }, 520);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint,
          location: location || 'Unspecified location',
          location_type: locationType,
          language,
          citizen_name: citizenName || 'Anonymous Citizen',
          citizen_contact: citizenContact || 'Unspecified',
          image: image || undefined,
          video_url: videoUrl || undefined,
          media_type: image ? 'photo' : videoUrl ? 'video' : 'none',
        }),
      });
      const data = await res.json();
      window.clearInterval(interval);
      if (!res.ok || !data.success) throw new Error(data.error || 'AI analysis is temporarily unavailable.');
      setAnalysis(data.analysis);
      setStep(4);
    } catch (err: any) {
      window.clearInterval(interval);
      setAnalysisError(err.message || 'AI analysis is temporarily unavailable.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateCase = async () => {
    if (!analysis) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...analysis,
        citizen_name: citizenName || 'Anonymous Citizen',
        citizen_contact: citizenContact || 'Unspecified Contact',
        complaint,
        location: location || analysis.location || 'Unspecified Location',
        location_type: locationType,
        media_type: image ? 'photo' : videoUrl ? 'video' : 'none',
        image: image || undefined,
        video_url: videoUrl || undefined,
      };
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit the case');
      setCreatedCase(data.case);
      onCaseCreated(data.case);
    } catch (err: any) {
      notify('error', `Could not submit the case: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdCase) {
    return (
      <div className="mx-auto max-w-2xl">
        <Panel title="Report submitted">
          <div className="flex flex-col items-center py-6 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 size={22} aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-navy-950">Your report has been filed</h2>
            <p className="subtitle mt-1 max-w-md">
              It was structured and routed to the responsible authority for human review. Your case reference is:
            </p>
            <p className="mt-3 font-mono text-[15px] font-semibold text-navy-800">{createdCase.case_id}</p>
            <dl className="mt-5 w-full max-w-sm space-y-2 rounded-lg border border-cv-line bg-cv-subtle p-4 text-left text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-navy-400">Authority</dt>
                <dd className="font-medium text-navy-800">{createdCase.responsible_authority ?? createdCase.department}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-navy-400">Department</dt>
                <dd className="font-medium text-navy-800">{createdCase.department}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-navy-400">Priority</dt>
                <dd className="font-medium text-navy-800">{createdCase.priority}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-navy-400">Submitted</dt>
                <dd className="font-medium text-navy-800">{formatDate(createdCase.created_at)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button onClick={() => onNavigate(`/cases/${createdCase.case_id}`)} className="btn btn-primary">
                View case <ArrowRight size={14} aria-hidden="true" />
              </button>
              <button onClick={() => onNavigate('/cases')} className="btn btn-secondary">
                Cases registry
              </button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const sev = analysis ? clampSeverity(analysis.severity_score) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="eyebrow mb-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-pine-500" aria-hidden="true" />
          Citizen report
        </p>
        <h1 className="page-title">Report a civic problem</h1>
        <p className="subtitle mt-1.5">
          Describe what happened in your own words — in any language. You don&rsquo;t need to know which
          department handles it; the system will route your report to the right authority.
        </p>
      </header>

      {step < 4 && (
        <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  i < step
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : i === step
                    ? 'border-navy-700 bg-navy-700 text-white'
                    : 'border-cv-line-strong bg-cv-surface text-navy-400'
                }`}
                aria-hidden="true"
              >
                {i < step ? <CheckCircle2 size={13} /> : i + 1}
              </span>
              <span className={`text-[12.5px] ${i === step ? 'font-semibold text-navy-900' : 'text-navy-400'}`}>{label}</span>
              {i < STEP_LABELS.length - 1 && <span className="h-px flex-1 bg-cv-line" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      )}

      {step === 0 && (
        <Panel title="Describe the problem">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="citizen-name">Your name <span className="font-normal text-navy-300">(optional)</span></label>
                <div className="relative">
                  <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" aria-hidden="true" />
                  <input id="citizen-name" value={citizenName} onChange={(e) => setCitizenName(e.target.value)} placeholder="e.g. Aditi Varma" className="input pl-9" />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="citizen-contact">Phone or email <span className="font-normal text-navy-300">(optional)</span></label>
                <div className="relative">
                  <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" aria-hidden="true" />
                  <input id="citizen-contact" value={citizenContact} onChange={(e) => setCitizenContact(e.target.value)} placeholder="For status updates" className="input pl-9" />
                </div>
              </div>
            </div>
            <p className="meta flex items-center gap-1.5">
              <ShieldCheck size={12} className="shrink-0 text-pine-600" aria-hidden="true" />
              {developmentMode
                ? 'Development session active — reporter details default to your local session.'
                : `Signed in as ${user?.email ?? 'you'} · reporter details default to your profile and remain editable.`}
            </p>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="field-label !mb-0" htmlFor="complaint-input">What is the problem? <span className="text-red-700">*</span></label>
                <button
                  onClick={toggleVoiceRecording}
                  className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                  aria-pressed={isListening}
                >
                  {isListening ? <MicOff size={13} aria-hidden="true" /> : <Mic size={13} aria-hidden="true" />}
                  {isListening ? 'Listening…' : 'Speak instead'}
                </button>
              </div>
              <textarea
                id="complaint-input"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                rows={5}
                placeholder="e.g. A deep pothole has formed on the crossing near the school. Water collects there and vehicles hit it at night."
                className="textarea"
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="field-hint !mt-0">Plain language in any language is fine — no category codes needed.</span>
                <label className="flex items-center gap-2 text-[12px] text-navy-500">
                  <span>Report language</span>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="select w-auto !py-1 text-[12px]">
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setStep(1)} className="btn btn-primary">
              Continue <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel title="Where is the problem?">
          <div className="space-y-3">
            <button onClick={handleUseCurrentLocation} className="btn btn-secondary btn-sm">
              <Compass size={13} aria-hidden="true" /> Use my device location
            </button>
            {locationType === 'device_detected' && (
              <p className="flex items-center gap-1.5 text-[12px] text-emerald-800">
                <ShieldCheck size={13} aria-hidden="true" /> Captured via device GPS ({location})
              </p>
            )}
            <div>
              <label className="field-label" htmlFor="location-input">Location <span className="font-normal text-navy-300">(optional)</span></label>
              <div className="relative">
                <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" aria-hidden="true" />
                <input
                  id="location-input"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setLocationType('manual'); }}
                  placeholder="e.g. Stanley Road, near the school crossing"
                  className="input pl-9"
                />
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            <button onClick={() => setStep(0)} className="btn btn-ghost">
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </button>
            <button onClick={() => setStep(2)} className="btn btn-primary">
              Continue <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </Panel>
      )}

      {step === 2 && (
        <Panel title="Add evidence" subtitle="A photo or short video helps officers assess what happened.">
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => setMediaType('photo')}
              className={`btn btn-sm ${mediaType === 'photo' ? 'btn-active' : 'btn-secondary'}`}
            >
              <ImageIcon size={13} aria-hidden="true" /> Photo
            </button>
            <button
              onClick={() => setMediaType('video')}
              className={`btn btn-sm ${mediaType === 'video' ? 'btn-active' : 'btn-secondary'}`}
            >
              <Video size={13} aria-hidden="true" /> Video
            </button>
          </div>

          {mediaType === 'photo' &&
            (image ? (
              <div className="flex items-center gap-4 rounded-lg border border-cv-line bg-cv-subtle p-3">
                <img src={image} alt="Preview of the evidence photo" className="h-20 w-20 rounded-md border border-cv-line object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-navy-800">{imageFileName || 'Photo attached'}</p>
                  <p className="text-[11.5px] text-emerald-800">Ready for review by the response team.</p>
                </div>
                <button onClick={() => { setImage(''); setImageFileName(''); }} className="btn btn-ghost btn-sm text-navy-400" aria-label="Remove photo">
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]); }}
                className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-cv-line-strong px-4 py-8 text-center hover:border-navy-300 hover:bg-cv-subtle"
              >
                <Upload size={18} className="text-navy-300" aria-hidden="true" />
                <span className="text-[13px] text-navy-700">Click to upload or drag &amp; drop a photo</span>
                <span className="text-[11.5px] text-navy-400">JPG, PNG, or WEBP</span>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); }} />
              </button>
            ))}

          {mediaType === 'video' &&
            (videoUrl ? (
              <div>
                <video src={videoUrl} controls className="max-h-72 w-full rounded-lg bg-navy-950 object-contain" />
                <div className="mt-2 flex items-center justify-between">
                  <p className="truncate text-[13px] text-navy-700">{videoFileName || 'Video attached'}</p>
                  <button onClick={() => { setVideoUrl(''); setVideoFileName(''); }} className="btn btn-ghost btn-sm text-navy-400" aria-label="Remove video">
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-cv-line-strong px-4 py-8 text-center hover:border-navy-300 hover:bg-cv-subtle"
              >
                <Video size={18} className="text-navy-300" aria-hidden="true" />
                <span className="text-[13px] text-navy-700">Upload a short video clip</span>
                <span className="text-[11.5px] text-navy-400">MP4 or WebM</span>
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleVideoFile(e.target.files[0]); }} />
              </button>
            ))}

          <div className="mt-5 flex justify-between">
            <button onClick={() => setStep(1)} className="btn btn-ghost">
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </button>
            <button onClick={() => setStep(3)} className="btn btn-primary">
              Continue <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </Panel>
      )}

      {step === 3 && (
        <Panel title="Review and submit">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-navy-400">Complaint</dt>
              <dd className="min-w-0 flex-1 text-right text-navy-800">{complaint.trim() ? complaint.trim() : (image || videoUrl) ? 'Provided as photo/video + no text' : '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy-400">Location</dt>
              <dd className="text-navy-800">{location || 'Not specified'}{locationType === 'device_detected' ? ' (GPS)' : ''}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy-400">Contact</dt>
              <dd className="text-navy-800">{citizenName || citizenContact ? `${citizenName || 'Anonymous'}${citizenContact ? ` · ${citizenContact}` : ''}` : 'None provided'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy-400">Evidence</dt>
              <dd className="text-navy-800">{image ? 'Photo attached' : videoUrl ? 'Video attached' : 'None'}</dd>
            </div>
          </dl>

          {analysisError && (
            <p className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {analysisError}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-cv-line pt-5">
            <button onClick={() => setStep(2)} className="btn btn-ghost">
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </button>
            <button onClick={handleAnalyze} disabled={isAnalyzing} className="btn btn-primary btn-lg">
              {isAnalyzing ? (
                <><RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Analyzing…</>
              ) : (
                <><Sparkles size={14} aria-hidden="true" /> Analyze &amp; route</>
              )}
            </button>
          </div>

          {isAnalyzing && (
            <div className="mt-5 space-y-2">
              {PROCESSING_STAGES.map((stage, i) => (
                <div key={i} className={`flex items-center gap-2.5 text-[12.5px] ${i <= stageIndex ? 'text-navy-700' : 'text-navy-300'}`}>
                  <span className={`h-2 w-2 rounded-full ${i < stageIndex ? 'bg-emerald-500' : i === stageIndex ? 'bg-pine-600 animate-pulse' : 'bg-navy-100'}`} aria-hidden="true" />
                  {stage}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {step === 4 && analysis && (
        <div className="space-y-5">
          <Panel
            title="How your report was understood"
            subtitle="AI suggestion — reviewed and confirmed by the responsible authority before any action."
          >
            <div className="flex flex-wrap gap-2">
              <CategoryBadge category={analysis.category} />
              <PriorityBadge priority={analysis.priority} />
              <span className="badge border-pine-200 bg-pine-50 text-pine-800">{analysis.confidence}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-cv-line bg-cv-subtle p-4">
                <p className="label-xs mb-1">Your summary</p>
                <p className="text-[13px] leading-relaxed text-navy-700">{analysis.citizen_summary}</p>
              </div>
              <div className="rounded-lg border border-cv-line bg-cv-subtle p-4">
                <p className="label-xs mb-1">Officer summary</p>
                <p className="text-[13px] leading-relaxed text-navy-700">{analysis.authority_summary}</p>
              </div>
            </div>
            {sev !== null && (
              <p className="mt-3 text-[12.5px] text-navy-500">
                Estimated severity: <span className="font-semibold text-navy-800">{severityLabel(sev)} ({sev}/10)</span> · {analysis.estimated_urgency}
              </p>
            )}
          </Panel>

          <Panel title="Routing" subtitle="Where this report will be delivered">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-700">
                <Building2 size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-navy-900">
                  {analysis.responsible_authority ?? analysis.department}
                </p>
                <p className="text-[12.5px] text-navy-500">
                  Department: {analysis.department} · Jurisdiction: {analysis.jurisdiction ?? 'Municipal division'}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-navy-600">{analysis.why_department}</p>
              </div>
            </div>
          </Panel>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button onClick={() => setStep(3)} disabled={isSubmitting} className="btn btn-ghost">
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </button>
            <button onClick={handleCreateCase} disabled={isSubmitting} className="btn btn-primary btn-lg">
              {isSubmitting ? (
                <><RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Submitting…</>
              ) : (
                <><CheckCircle2 size={15} aria-hidden="true" /> Confirm &amp; submit report</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};