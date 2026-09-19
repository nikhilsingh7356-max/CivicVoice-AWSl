import React, { useState } from 'react';
import { CivicCase } from '../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from './StatusBadge';
import { Search, X, CheckCircle2, Clock, MapPin, Building2, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface TrackCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
}

export const TrackCaseModal: React.FC<TrackCaseModalProps> = ({
  isOpen,
  onClose,
  cases,
  onSelectCase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedCase, setSearchedCase] = useState<CivicCase | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSearch = (idToSearch?: string) => {
    const id = (idToSearch || searchQuery).trim().toUpperCase();
    if (!id) {
      setErrorMsg('Please enter a valid Case ID (e.g. CV-2026-001)');
      return;
    }

    const found = cases.find((c) => c.case_id.toUpperCase() === id);
    if (found) {
      setSearchedCase(found);
      setErrorMsg('');
    } else {
      setSearchedCase(null);
      setErrorMsg(`No case found with ID "${id}". Try one of the demo cases below.`);
    }
  };

  return (
    <div
      id="modal-track-civic-case"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Track My Civic Case
              </h3>
              <p className="text-xs text-slate-400">
                Transparent citizen status verification & timeline tracking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Search Bar */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Enter Case Tracking ID
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. CV-2026-001"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent uppercase"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <button
                type="button"
                onClick={() => handleSearch()}
                className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors shrink-0 shadow-xs"
              >
                Track Status
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 mt-2 font-medium">{errorMsg}</p>
            )}

            {/* Quick Demo Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px] font-medium">Quick Demo Cases:</span>
              {cases.slice(0, 4).map((c) => (
                <button
                  key={c.case_id}
                  type="button"
                  onClick={() => {
                    setSearchQuery(c.case_id);
                    handleSearch(c.case_id);
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-[11px] font-mono transition-colors"
                >
                  {c.case_id} ({c.category})
                </button>
              ))}
            </div>
          </div>

          {/* Searched Case Result Card */}
          {searchedCase && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-slate-900">
                      {searchedCase.case_id}
                    </span>
                    <CategoryBadge category={searchedCase.category} />
                    <PriorityBadge priority={searchedCase.priority} size="sm" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1">
                    {searchedCase.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{searchedCase.location}</span>
                  </div>
                </div>

                <div className="text-right">
                  <StatusBadge status={searchedCase.status} />
                  <p className="text-[10px] font-mono text-slate-400 mt-1">
                    Logged: {new Date(searchedCase.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Citizen Summary */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-800 leading-relaxed">
                <span className="font-bold text-blue-900 block mb-0.5">
                  Citizen-Facing Update:
                </span>
                {searchedCase.citizen_summary}
              </div>

              {/* Status Timeline */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Workflow Resolution Status
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                  {[
                    { label: '1. Received', done: true },
                    {
                      label: '2. AI Triaged',
                      done: ['AI_TRIAGED', 'ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(searchedCase.status),
                    },
                    {
                      label: '3. Assigned',
                      done: ['ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(searchedCase.status),
                    },
                    {
                      label: '4. Field Handling',
                      done: ['FIELD_VERIFICATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(searchedCase.status),
                    },
                    {
                      label: '5. Resolved / Closed',
                      done: ['RESOLVED', 'CLOSED'].includes(searchedCase.status),
                    },
                  ].map((step) => (
                    <div
                      key={step.label}
                      className={`p-1.5 rounded font-medium ${
                        step.done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Routing & Officer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Responsible Department</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{searchedCase.department}</p>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Officer</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {searchedCase.assigned_officer || 'Pending Dispatch Assignment'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectCase(searchedCase.case_id);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Open Complete Case Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
