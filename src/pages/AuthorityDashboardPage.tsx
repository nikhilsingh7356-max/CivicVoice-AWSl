import React, { useState, useMemo } from 'react';
import { CivicCase, CivicCategory, CivicPriority, CaseStatus } from '../types';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/StatusBadge';
import { CivicHotspotView } from '../components/CivicHotspotView';
import { TrackCaseModal } from '../components/TrackCaseModal';
import {
  LayoutDashboard,
  Search,
  Filter,
  Flame,
  ArrowUpDown,
  Building2,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Eye,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Layers,
  SearchCode,
  Zap,
} from 'lucide-react';

interface AuthorityDashboardPageProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
  onNavigate: (path: string) => void;
}

export const AuthorityDashboardPage: React.FC<AuthorityDashboardPageProps> = ({
  cases,
  onSelectCase,
  onNavigate,
}) => {
  // View mode: 'TABLE' or 'HOTSPOTS'
  const [activeTab, setActiveTab] = useState<'TABLE' | 'HOTSPOTS'>('TABLE');
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedAuthority, setSelectedAuthority] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [showPriorityQueueOnly, setShowPriorityQueueOnly] = useState(false);

  // Derive unique departments, authorities, and languages for filter dropdowns
  const uniqueDepartments = useMemo(() => {
    const set = new Set(cases.map((c) => c.department).filter(Boolean));
    return Array.from(set);
  }, [cases]);

  const uniqueAuthorities = useMemo(() => {
    const set = new Set(cases.map((c) => c.responsible_authority).filter(Boolean));
    return Array.from(set);
  }, [cases]);

  const uniqueLanguages = useMemo(() => {
    const set = new Set(cases.map((c) => c.language).filter(Boolean));
    return Array.from(set);
  }, [cases]);

  // Statistics
  const totalCount = cases.length;
  const receivedCount = cases.filter((c) => c.status === 'CREATED' || c.status === 'AI_TRIAGED').length;
  const highPriorityCount = cases.filter(
    (c) => c.priority === 'HIGH' || c.priority === 'CRITICAL'
  ).length;
  const inProgressCount = cases.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED' || c.status === 'FIELD_VERIFICATION').length;
  const resolvedCount = cases.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const relatedReportsCount = cases.reduce(
    (acc, c) => acc + (c.potentially_related_cases?.length || 0),
    0
  );

  // Filtered & Sorted cases
  const filteredCases = useMemo(() => {
    let result = [...cases];

    if (showPriorityQueueOnly) {
      // Sort strictly by severity_score descending and urgent priorities
      result.sort((a, b) => b.severity_score - a.severity_score);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.complaint.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'ALL') {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (selectedPriority !== 'ALL') {
      result = result.filter((c) => c.priority === selectedPriority);
    }

    if (selectedStatus !== 'ALL') {
      result = result.filter((c) => c.status === selectedStatus);
    }

    if (selectedDepartment !== 'ALL') {
      result = result.filter((c) => c.department === selectedDepartment);
    }

    if (selectedAuthority !== 'ALL') {
      result = result.filter((c) => (c.responsible_authority || '') === selectedAuthority);
    }

    if (selectedLanguage !== 'ALL') {
      result = result.filter((c) => c.language.includes(selectedLanguage));
    }

    return result;
  }, [
    cases,
    searchQuery,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    selectedDepartment,
    selectedAuthority,
    selectedLanguage,
    showPriorityQueueOnly,
  ]);

  // Top urgent cases for the AI Priority Queue banner
  const priorityQueueTop = useMemo(() => {
    return [...cases]
      .filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED')
      .sort((a, b) => b.severity_score - a.severity_score)
      .slice(0, 3);
  }, [cases]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md mb-2 w-fit">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Municipal Control Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Civic Intelligence Center
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time multimodal intake triage, AI department routing, and dispatch monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-track-modal"
            onClick={() => setIsTrackModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors text-xs font-semibold shadow-2xs flex items-center gap-1.5"
          >
            <SearchCode className="w-3.5 h-3.5 text-blue-600" />
            <span>Track My Case</span>
          </button>

          <button
            id="btn-open-analytics"
            onClick={() => onNavigate('/analytics')}
            className="px-3.5 py-2 rounded-xl bg-indigo-700 text-white hover:bg-indigo-800 transition-colors text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Civic Intelligence</span>
          </button>

          <button
            id="btn-fast-demo-tour"
            onClick={() => onSelectCase('CV-2026-001')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors text-xs font-bold shadow-xs flex items-center gap-1.5"
            title="Jump directly to the Stanley Road showcase case"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>2-Min Demo Case</span>
          </button>

          <button
            id="btn-switch-to-citizen"
            onClick={() => onNavigate('/citizen')}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 transition-colors text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <span>+ Report New Issue</span>
          </button>
        </div>
      </div>

      {/* STATISTICS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Cases
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Cross-category</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Received / Triaged
          </span>
          <p className="text-2xl font-black text-slate-700 mt-1 font-mono">{receivedCount}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Pending dispatch</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-50/50 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
            High Priority
          </span>
          <p className="text-2xl font-black text-amber-950 mt-1 font-mono">{highPriorityCount}</p>
          <span className="text-[10px] text-amber-800 font-medium mt-0.5 block">Urgent triage</span>
        </div>

        <div className="p-4 rounded-xl border border-sky-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider block">
            In Progress
          </span>
          <p className="text-2xl font-black text-sky-900 mt-1 font-mono">{inProgressCount}</p>
          <span className="text-[10px] text-sky-700 mt-0.5 block">Officer assigned</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Resolved
          </span>
          <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">{resolvedCount}</p>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Resolved / closed</span>
        </div>

        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-900 uppercase tracking-wider block">
            Related Reports
          </span>
          <p className="text-2xl font-black text-indigo-950 mt-1 font-mono">{relatedReportsCount}</p>
          <span className="text-[10px] text-indigo-700 mt-0.5 block">Correlated links</span>
        </div>
      </div>

      {/* AI ACTIVITY PANEL & AI PRIORITY QUEUE HIGHLIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* AI Priority Queue */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-800 flex items-center justify-center font-bold">
                <Flame className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>AI Priority Queue</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold border border-amber-300">
                    AI-assisted prioritization
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Automated ranking based on severity (1-10), public impact, urgency, and safety risk. Not an official emergency determination.
                </p>
              </div>
            </div>

            <button
              id="btn-toggle-priority-filter"
              onClick={() => setShowPriorityQueueOnly(!showPriorityQueueOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                showPriorityQueueOnly
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{showPriorityQueueOnly ? 'Showing Queue Ranking' : 'Filter by Priority Queue'}</span>
            </button>
          </div>

          {/* Top 3 Urgent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {priorityQueueTop.map((c) => (
              <div
                key={c.case_id}
                onClick={() => onSelectCase(c.case_id)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-mono font-bold text-blue-700">{c.case_id}</span>
                    <PriorityBadge priority={c.priority} size="sm" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                    {c.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                    {c.citizen_impact}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-slate-900">
                    Severity: {c.severity_score}/10
                  </span>
                  <span className="text-blue-700 font-semibold flex items-center gap-0.5">
                    Review <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Activity Panel */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-slate-900 text-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">AI Activity</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
              Demo data
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <span>Amazon Bedrock analyzed reports</span>
              <span className="font-mono font-bold text-white text-sm">24</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <span>Routed automatically for review</span>
              <span className="font-mono font-bold text-blue-400 text-sm">18</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <span>High-priority reports detected</span>
              <span className="font-mono font-bold text-amber-400 text-sm">6</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <span>Potentially related reports clustered</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">4</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed pt-1">
            * Note: Statistical activity counts reflect hackathon demo telemetry and testing batches.
          </div>
        </div>
      </div>

      {/* VIEW MODE TABS: Table Queue vs Hotspot View */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('TABLE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'TABLE'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Cases Queue ({cases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HOTSPOTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'HOTSPOTS'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Civic Hotspots & Clusters</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
              Corridors
            </span>
          </button>
        </div>

        <span className="text-xs text-slate-500 italic hidden sm:inline-block">
          {activeTab === 'TABLE' ? 'Standard triage queue sorted by municipal workflow' : 'Cross-agency correlated infrastructure hotspots'}
        </span>
      </div>

      {activeTab === 'HOTSPOTS' ? (
        <CivicHotspotView cases={cases} onSelectCase={onSelectCase} />
      ) : (
        <>
          {/* FILTER CONTROLS */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Case Filters & Search</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search Box */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-search-cases"
                  type="text"
                  placeholder="Search case ID, location, issue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  id="filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white focus:border-blue-600 outline-none"
                >
                  <option value="ALL">All Categories</option>
                  <option value="ROADS">ROADS</option>
                  <option value="WASTE">WASTE</option>
                  <option value="WATER">WATER</option>
                  <option value="ELECTRICITY">ELECTRICITY</option>
                  <option value="SANITATION">SANITATION</option>
                  <option value="STREETLIGHT">STREETLIGHT</option>
                  <option value="PUBLIC_SAFETY">PUBLIC_SAFETY</option>
                  <option value="TRAFFIC">TRAFFIC</option>
                  <option value="DRAINAGE">DRAINAGE</option>
                  <option value="PUBLIC_PROPERTY">PUBLIC_PROPERTY</option>
                  <option value="ENVIRONMENT">ENVIRONMENT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  id="filter-priority"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white focus:border-blue-600 outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  id="filter-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white focus:border-blue-600 outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CREATED">CREATED</option>
                  <option value="AI_TRIAGED">AI TRIAGED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="FIELD_VERIFICATION">FIELD VERIFICATION</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <select
                  id="filter-department"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white focus:border-blue-600 outline-none truncate"
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Authority Filter */}
              <div>
                <select
                  id="filter-authority"
                  value={selectedAuthority}
                  onChange={(e) => setSelectedAuthority(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white focus:border-blue-600 outline-none truncate"
                >
                  <option value="ALL">All Authorities</option>
                  {uniqueAuthorities.map((auth) => (
                    <option key={auth} value={auth}>
                      {auth}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CASE TABLE */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Active Civic Cases ({filteredCases.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Click any row to open full case dossier and assignment tools
              </span>
            </div>

            <div className="overflow-x-auto">
              <table id="table-civic-cases" className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Issue Title & Summary</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority & Score</th>
                    <th className="py-3 px-4">Authority & Dept</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">AI Confidence</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No civic cases match your selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((item) => (
                      <tr
                        key={item.case_id}
                        onClick={() => onSelectCase(item.case_id)}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {item.case_id}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.citizen_summary || item.complaint}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CategoryBadge category={item.category} />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <PriorityBadge priority={item.priority} size="sm" />
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              Sev: {item.severity_score.toFixed(1)}/10
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap max-w-[200px] text-slate-700 font-medium">
                          <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{item.responsible_authority || item.department}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate pl-5">
                            {item.department}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap max-w-[150px] truncate text-slate-600">
                          {item.location}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={item.status} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {item.confidence_score ? `${item.confidence_score}%` : '90%'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCase(item.case_id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TRACK CASE MODAL */}
      <TrackCaseModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        cases={cases}
        onSelectCase={onSelectCase}
      />
    </div>
  );
};
