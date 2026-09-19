import React, { useState, useRef } from 'react';
import { BedrockAnalysisResult, CivicCase } from '../types';
import { PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { VisualEvidenceCard } from '../components/VisualEvidenceCard';
import { UnstructuredToStructured } from '../components/UnstructuredToStructured';
import { DEMO_POTHOLE_IMAGE } from '../demoImages';
import { resolveAuthorityByTaxonomy } from '../authorityRegistry';
import { safeApiFetch } from '../lib/api';
import {
  Sparkles,
  Upload,
  MapPin,
  Mic,
  MicOff,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Building2,
  FileCheck,
  Languages,
  X,
  ShieldCheck,
  Compass,
  Send,
  User,
  Phone,
  Play,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface CitizenReportPageProps {
  onCaseCreated: (newCase: CivicCase) => void;
  onNavigate: (path: string) => void;
  initialComplaint?: string;
  initialLocation?: string;
  initialImage?: string;
}

const PROCESSING_STAGES = [
  'Understanding complaint semantics in natural language...',
  'Inspecting attached multimodal visual evidence...',
  'Mapping issue into municipal taxonomy...',
  'Assessing public safety severity score...',
  'Resolving responsible municipal authority & jurisdiction...',
  'Generating structured civic dossier and routing package...',
];

export const CitizenReportPage: React.FC<CitizenReportPageProps> = ({
  onCaseCreated,
  onNavigate,
  initialComplaint = '',
  initialLocation = '',
  initialImage = '',
}) => {
  // Citizen basic contact details
  const [citizenName, setCitizenName] = useState<string>('');
  const [citizenContact, setCitizenContact] = useState<string>('');

  // Primary complaint inputs
  const [complaint, setComplaint] = useState<string>(initialComplaint);
  const [location, setLocation] = useState<string>(initialLocation);
  const [locationType, setLocationType] = useState<'device_detected' | 'manual'>('manual');
  const [language, setLanguage] = useState<string>('Auto Detect');

  // Media evidence (Photo or Video)
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [image, setImage] = useState<string>(initialImage);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoFileName, setVideoFileName] = useState<string>('');

  // Voice recording state
  const [isListening, setIsListening] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Analysis & Submitting states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<BedrockAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isSubmittingCase, setIsSubmittingCase] = useState<boolean>(false);
  const [createdCase, setCreatedCase] = useState<CivicCase | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Real microphone recording -> Amazon Transcribe
  const toggleVoiceRecording = async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Microphone recording is not supported in this browser. Please type the complaint.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      recorder.onstart = () => setIsListening(true);
      recorder.onstop = async () => {
        setIsListening(false);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const response = await fetch('/api/transcribe', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: reader.result, contentType: 'audio/webm', language }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Voice transcription failed');
            setComplaint((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
          } catch (error: any) {
            console.error('Amazon Transcribe failed:', error);
            alert(error.message || 'Voice transcription failed. Please type the complaint.');
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
    } catch (error) {
      console.error('Microphone access failed:', error);
      setIsListening(false);
      alert('Microphone permission is required for voice reporting.');
    }
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setLocation(`Civil Lines Sector (GPS: ${lat}, ${lng})`);
        setLocationType('device_detected');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocation('');
        setLocationType('manual');
      },
      { timeout: 8000 }
    );
  };

  // Image Upload handler
  const handleImageFile = (file: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    setImageFileName(file.name);
    setMediaType('photo');
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Video Upload handler
  const handleVideoFile = (file: File) => {
    if (!file) return;
    setVideoFileName(file.name);
    setMediaType('video');
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
  };

  // Quick fill citizen demo profile
  const handleFillDemoCitizen = () => {
    setCitizenName('Aditi Varma');
    setCitizenContact('+91 98765-43210');
  };

  // Preset demo complaint loaders
  const loadPreset = (type: 'pothole' | 'waste' | 'water') => {
    setCreatedCase(null);
    setAnalysisResult(null);
    setAnalysisError(null);

    if (type === 'pothole') {
      setCitizenName('Rajesh Verma');
      setCitizenContact('+91 94150-12345');
      setComplaint(
        'There is a deep pothole near the Stanley Road crossing. It becomes dangerous for two-wheelers and auto-rickshaws, especially in the dark.'
      );
      setLocation('Stanley Road, Prayagraj, Uttar Pradesh');
      setLocationType('manual');
      setLanguage('Auto Detect');
      setMediaType('photo');
      setImage(DEMO_POTHOLE_IMAGE);
      setImageFileName('pothole_evidence.svg');
      setVideoUrl('');
      setVideoFileName('');
    } else if (type === 'waste') {
      setCitizenName('Carlos Silva');
      setCitizenContact('+55 31 9988-7766');
      setComplaint(
        'Há um acúmulo enorme de lixo na esquina da Rua Augusta com a Alameda Santos. O cheiro está insuportável e atraindo roedores há 3 dias.'
      );
      setLocation('Rua Augusta, São Paulo, Brazil');
      setLocationType('device_detected');
      setLanguage('Portuguese');
      setMediaType('photo');
      setImage('');
      setImageFileName('');
      setVideoUrl('');
      setVideoFileName('');
    } else if (type === 'water') {
      setCitizenName('Priya Sharma');
      setCitizenContact('priya.sharma@civicmail.org');
      setComplaint(
        'Potable water pipeline has fractured right outside the municipal primary school gate. Clean water has been gushing all morning, flooding the pedestrian pathway.'
      );
      setLocation('Florida Road, Durban, South Africa');
      setLocationType('device_detected');
      setLanguage('English');
      setMediaType('video');
      setImage('');
      setImageFileName('');
      setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      setVideoFileName('water_leak_surveillance.mp4');
    }
  };

  // Amazon Bedrock AI Analysis Trigger
  const handleAnalyze = async () => {
    if (!complaint.trim() && !image && !videoUrl) {
      setAnalysisError('Please enter a description of the civic problem or add photo/video evidence.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setCreatedCase(null);
    setCurrentStageIndex(0);

    // Animate through the 6 processing stages
    const stageInterval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < PROCESSING_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 550);

    try {
      const response = await fetch('/api/analyze', {
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

      const data = await response.json();
      clearInterval(stageInterval);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI analysis is temporarily unavailable. Please try again.');
      }

      setAnalysisResult(data.analysis);
    } catch (err: any) {
      clearInterval(stageInterval);
      console.error('Error analyzing complaint:', err);
      setAnalysisError(err.message || 'AI analysis is temporarily unavailable. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create & Automatically Route Civic Case
  const handleCreateCase = async () => {
    if (!analysisResult) return;

    setIsSubmittingCase(true);
    try {
      const payload = {
        ...analysisResult,
        citizen_name: citizenName || 'Anonymous Citizen',
        citizen_contact: citizenContact || 'Unspecified Contact',
        complaint,
        location: location || analysisResult.location || 'Unspecified Location',
        location_type: locationType,
        media_type: image ? 'photo' : videoUrl ? 'video' : 'none',
        image: image || undefined,
        video_url: videoUrl || undefined,
      };

      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit case to municipal registry');
      }

      setCreatedCase(data.case);
      onCaseCreated(data.case);
    } catch (err: any) {
      console.error('Error creating case:', err);
      alert('Could not submit case: ' + err.message);
    } finally {
      setIsSubmittingCase(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header — Explicitly Simple and Friendly */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            AI-Powered Municipal Router
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Tell us what happened.
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Speak or write your problem. Add a photo or video if you have one. You do not need to know which department or authority to contact — CivicVoice AI will understand and automatically route your case.
          </p>
        </div>

        {/* Demo Preset Buttons for Hackathon Judges */}
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300 text-xs flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-950 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              1-Click Demo Inputs:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              id="btn-demo-pothole"
              type="button"
              onClick={() => loadPreset('pothole')}
              className="px-2.5 py-1 rounded bg-white text-slate-800 font-semibold border border-amber-300 hover:bg-amber-100 transition-colors text-[11px]"
            >
              Road Pothole (Prayagraj)
            </button>
            <button
              id="btn-demo-waste"
              type="button"
              onClick={() => loadPreset('waste')}
              className="px-2.5 py-1 rounded bg-white text-slate-800 font-semibold border border-amber-300 hover:bg-amber-100 transition-colors text-[11px]"
            >
              Lixo / Waste (Portuguese)
            </button>
            <button
              id="btn-demo-water"
              type="button"
              onClick={() => loadPreset('water')}
              className="px-2.5 py-1 rounded bg-white text-slate-800 font-semibold border border-amber-300 hover:bg-amber-100 transition-colors text-[11px]"
            >
              Water Leak (Video)
            </button>
          </div>
        </div>
      </div>

      {/* EXTREMELY SIMPLE CITIZEN INTAKE CONTAINER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        {/* Step A: Basic Details (Optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Your Details</span>
              <span className="text-[11px] font-normal text-slate-400">(Optional for status updates)</span>
            </label>
            <button
              type="button"
              onClick={handleFillDemoCitizen}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Quick fill citizen details
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="input-citizen-name"
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="Your Name (e.g. Aditi Varma)"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
              />
            </div>

            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="input-citizen-contact"
                type="text"
                value={citizenContact}
                onChange={(e) => setCitizenContact(e.target.value)}
                placeholder="Phone or Email (e.g. +91 98765-43210)"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Step B: Speak or Write Your Problem */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label htmlFor="complaint-input" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>What is the civic problem?</span>
              <span className="text-rose-500">*</span>
            </label>

            {/* Voice Input Button */}
            <button
              type="button"
              id="btn-voice-input"
              onClick={toggleVoiceRecording}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-2xs ${
                isListening
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
              title="Click to speak your problem via speech recognition"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 text-rose-600 animate-bounce" />
                  <span>Listening... Speak now</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-blue-600" />
                  <span>Speak problem</span>
                </>
              )}
            </button>
          </div>

          <textarea
            id="complaint-input"
            rows={4}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="Explain what happened in your own words, in any language (English, Hindi, Portuguese, etc.). For example: 'A huge pothole has formed on the crossing near the school. Water is collecting and cars are hitting it at night.'"
            className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>You do not need category codes or technical terms. Natural everyday language is supported.</span>
            <div className="flex items-center gap-1">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <span>Multi-lingual AI</span>
            </div>
          </div>
        </div>

        {/* Step C: Photo or Video Evidence (Optional) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Photo or Video Evidence</span>
              <span className="text-xs font-normal text-slate-500">(Optional)</span>
            </label>

            {/* Photo / Video Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMediaType('photo')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  mediaType === 'photo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  mediaType === 'video' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-indigo-600" />
                <span>Video</span>
              </button>
            </div>
          </div>

          {/* Photo Dropzone or Preview */}
          {mediaType === 'photo' && (
            <>
              {!image ? (
                <div
                  id="image-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleImageFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-600 group-hover:text-blue-600 transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-blue-700">Click to upload photo</span> or drag and drop
                  </div>
                  <p className="text-[11px] text-slate-400">JPG, PNG, WEBP (Multimodal Vision ready)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
                    }}
                  />
                </div>
              ) : (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        {imageFileName || 'Civic Photo Evidence Attached'}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-mono flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Ready for Amazon Bedrock Multimodal Verification
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-remove-image"
                    onClick={() => {
                      setImage('');
                      setImageFileName('');
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-500 hover:text-rose-600 hover:border-rose-300 transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Video Dropzone or Preview */}
          {mediaType === 'video' && (
            <>
              {!videoUrl ? (
                <div
                  id="video-dropzone"
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-indigo-700">Click to upload short video clip</span> (MP4, WebM)
                  </div>
                  <p className="text-[11px] text-slate-400">Useful for gushing water leaks, live traffic gridlock, or flickering lights</p>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleVideoFile(e.target.files[0]);
                    }}
                  />
                </div>
              ) : (
                <div className="relative rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-indigo-200 bg-black flex items-center justify-center shrink-0">
                      <Play className="w-6 h-6 text-white opacity-80" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        {videoFileName || 'Civic Video Evidence Attached'}
                      </span>
                      <span className="text-[11px] text-indigo-700 font-mono flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Queued for Field Officer Inspection Video Player
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl('');
                      setVideoFileName('');
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-500 hover:text-rose-600 transition-colors"
                    title="Remove video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Step D: Problem Location (Optional) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label htmlFor="location-input" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Problem Location</span>
              <span className="text-xs font-normal text-slate-500">(Optional)</span>
            </label>
            <button
              type="button"
              id="btn-use-gps"
              onClick={handleUseCurrentLocation}
              className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Use device location</span>
            </button>
          </div>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="location-input"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setLocationType('manual');
              }}
              placeholder="e.g. Stanley Road, Prayagraj or Rua Augusta, São Paulo"
              className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
            />
          </div>
          {locationType === 'device_detected' && (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" /> Geolocation captured via device GPS
            </p>
          )}
        </div>

        {/* Action Button: AI UNDERSTAND & ROUTE */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span>Powered by Amazon Bedrock Multimodal AI + Configured Authority Routing</span>
          </div>

          <button
            id="btn-analyze-bedrock"
            disabled={isAnalyzing}
            onClick={handleAnalyze}
            className={`px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
              isAnalyzing
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-800 active:scale-[0.99]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>AI is Understanding & Routing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Analyze & Continue</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {analysisError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Beautiful Animated Processing Screen */}
        {isAnalyzing && (
          <div
            id="ai-processing-animation"
            className="p-6 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-4 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
                  Civic Intelligence & Routing Pipeline
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Stage {currentStageIndex + 1} of {PROCESSING_STAGES.length}
              </span>
            </div>

            {/* Current Active Stage */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-sm font-semibold text-amber-300 flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>{PROCESSING_STAGES[currentStageIndex]}</span>
            </div>

            {/* All Stage indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
              {PROCESSING_STAGES.map((st, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border flex items-center gap-1.5 transition-colors ${
                    idx < currentStageIndex
                      ? 'bg-slate-900 border-emerald-800 text-emerald-400'
                      : idx === currentStageIndex
                      ? 'bg-blue-950 border-blue-600 text-white font-bold'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span className="truncate">{st.replace('...', '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          AI ANALYSIS & ROUTING PREVIEW SECTION
          ============================================================ */}
      {analysisResult && (
        <div id="ai-analysis-results" className="space-y-6 animate-in fade-in duration-300">
          {/* Analysis Complete Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl text-emerald-900 text-xs font-medium gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">AI Processing Complete:</span>
              <span>Case structured & responsible authority identified</span>
            </div>
            <span className="font-mono text-emerald-800 font-semibold">{analysisResult.confidence}</span>
          </div>

          {/* 1. Visually Prominent Innovation Moment: Unstructured -> Structured */}
          <UnstructuredToStructured
            rawInput={complaint}
            analysis={analysisResult}
            location={location || analysisResult.location}
          />

          {/* 2. Visual / Media Evidence Analysis */}
          <VisualEvidenceCard
            evidence={analysisResult.evidence_observations}
            image={image}
          />

          {/* 3. Responsible Authority Routing Card (Key Innovation) */}
          <div className="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                <Building2 className="w-5 h-5 text-blue-700" />
                <span>AI Automated Authority Routing Decision</span>
              </div>
              <PriorityBadge priority={analysisResult.priority} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Identified Responsible Authority:
                </span>
                <span className="text-base font-extrabold text-slate-950 block">
                  {analysisResult.responsible_authority || 'Prayagraj Municipal Corporation'}
                </span>
                <span className="text-xs text-blue-700 font-semibold block">
                  Department: {analysisResult.department}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  Jurisdiction: {analysisResult.jurisdiction || 'Municipal Urban Ward'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Why this authority was chosen:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {analysisResult.why_department}
                </p>
                <div className="pt-1 text-[11px] text-emerald-700 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Matched via Sovereign Municipal Registry</span>
                </div>
              </div>
            </div>

            {/* Citizen Summary & Authority Summary */}
            <div className="space-y-2 pt-1">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block mb-0.5">Citizen-Friendly Summary:</span>
                <p className="text-slate-700 leading-relaxed">{analysisResult.citizen_summary}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800 text-xs">
                <span className="font-bold text-amber-300 block mb-0.5 font-mono text-[11px]">
                  Authority Operational Dispatch Summary:
                </span>
                <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                  {analysisResult.authority_summary}
                </p>
              </div>
            </div>

            {/* AI Action Sequence */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-900 block mb-2">
                Recommended 4-Step Operational Plan for Municipal Crew:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysisResult.recommended_action?.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                    <span className="w-4 h-4 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CASE CONFIRMATION & AUTOMATIC ROUTING CTA */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div>
              <h3 className="text-lg font-bold">Confirm & Route to Responsible Authority</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Will register case CV-2026-XXXX and automatically deliver to {analysisResult.responsible_authority || analysisResult.department} queue.
              </p>
            </div>

            <button
              id="btn-create-civic-case"
              disabled={isSubmittingCase}
              onClick={handleCreateCase}
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-sm text-white transition-all shadow-sm flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isSubmittingCase ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Routing Case...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Route Case</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Success Dialog / Case Created confirmation */}
          {createdCase && (
            <div
              id="case-created-banner"
              className="p-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-950 space-y-4 shadow-md animate-in fade-in duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-emerald-800 tracking-wider">
                    Case Successfully Structured & Routed
                  </span>
                  <h3 className="text-2xl font-black text-emerald-950 font-mono">
                    {createdCase.case_id}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-emerald-950 py-1 bg-white/60 p-2.5 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Complaint received</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AI analysis completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Authority identified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Case routed (Configured Authority Routing)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-emerald-300 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Destination Authority:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {createdCase.responsible_authority || createdCase.department}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Routing Status:</span>
                  <span className="font-mono text-emerald-700 font-semibold">DELIVERED TO WORKFLOW QUEUE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Assigned Jurisdiction:</span>
                  <span className="font-mono text-slate-700">{createdCase.jurisdiction || 'Urban Division'}</span>
                </div>
              </div>

              <p className="text-sm text-emerald-900 leading-relaxed">
                Your report has been received and prioritized for action. It is now live in the Authority Dashboard for human review and operational dispatch.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="btn-view-case-detail"
                  onClick={() => onNavigate(`/case/${createdCase.case_id}`)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors flex items-center gap-1.5"
                >
                  <span>View Full Case Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  id="btn-view-authority-dashboard"
                  onClick={() => onNavigate('/authority')}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
                >
                  <span>Open Responsible Authority Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
