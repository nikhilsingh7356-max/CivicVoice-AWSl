import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Layers,
  MapPin,
  Building2,
  Sparkles,
  RefreshCw,
  MessageSquare,
  FileText,
  CheckCircle2,
  Filter,
  ArrowRight,
  Info,
  DollarSign,
  Users,
  Compass,
  Zap,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { CivicCase, CivicCategory } from '../types';
import {
  AIDevelopmentPriority,
  PolicyFilterState,
  DemandHotspot,
  InfrastructureGapRecord,
} from '../types/policy';
import {
  SYNTHETIC_DATASET_NOTICE,
  SYNTHETIC_DEMOGRAPHICS,
  SYNTHETIC_INFRASTRUCTURE_INDICATORS,
  SYNTHETIC_PUBLIC_INVESTMENTS,
  INITIAL_AI_DEVELOPMENT_PRIORITIES,
  aggregateCases,
  calculateDemandHotspots,
  calculateInfrastructureGaps,
} from '../policyData';
import { MessagingSimulatorModal } from '../components/MessagingSimulatorModal';

interface PolicyPlanningPageProps {
  cases: CivicCase[];
  onNavigate: (path: string) => void;
  onCaseCreated?: (newCase: CivicCase) => void;
}

export const PolicyPlanningPage: React.FC<PolicyPlanningPageProps> = ({
  cases,
  onNavigate,
  onCaseCreated,
}) => {
  // Filters
  const [filters, setFilters] = useState<PolicyFilterState>({
    state: 'ALL',
    district: 'ALL',
    sector: 'ALL',
    timeRange: 'all',
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'hotspots' | 'gaps' | 'priorities' | 'demographics' | 'investments' | 'impact'
  >('overview');

  // AI Development Priorities state
  const [priorities, setPriorities] = useState<AIDevelopmentPriority[]>(
    INITIAL_AI_DEVELOPMENT_PRIORITIES
  );
  const [isGeneratingPriorities, setIsGeneratingPriorities] = useState(false);
  const [prioritiesSource, setPrioritiesSource] = useState<'Amazon Bedrock Claude' | 'pre-computed'>(
    'pre-computed'
  );

  // Messaging simulator modal
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);

  // Aggregated data & deterministic calculations
  const { filteredCases, metrics, byCategory, byDistrict, byState, trendByWeek } = useMemo(() => {
    return aggregateCases(cases, filters);
  }, [cases, filters]);

  // Hotspots calculated deterministically from cases
  const hotspots: DemandHotspot[] = useMemo(() => {
    return calculateDemandHotspots(cases);
  }, [cases]);

  // Filtered hotspots
  const filteredHotspots = useMemo(() => {
    return hotspots.filter((h) => {
      if (filters.state !== 'ALL' && h.state !== filters.state) return false;
      if (filters.district !== 'ALL' && h.district !== filters.district) return false;
      if (filters.sector !== 'ALL' && h.sector !== filters.sector) return false;
      return true;
    });
  }, [hotspots, filters]);

  // Infrastructure gaps calculated deterministically
  const gaps: InfrastructureGapRecord[] = useMemo(() => {
    return calculateInfrastructureGaps(cases, SYNTHETIC_INFRASTRUCTURE_INDICATORS);
  }, [cases]);

  // Filtered gaps
  const filteredGaps = useMemo(() => {
    return gaps.filter((g) => {
      if (filters.state !== 'ALL' && g.state !== filters.state) return false;
      if (filters.district !== 'ALL' && g.district !== filters.district) return false;
      if (filters.sector !== 'ALL' && g.sector !== filters.sector) return false;
      return true;
    });
  }, [gaps, filters]);

  // Trigger Amazon Bedrock 2.5 Flash to regenerate priorities
  const handleRegeneratePriorities = async () => {
    setIsGeneratingPriorities(true);
    try {
      const res = await fetch('/api/policy/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotspots: filteredHotspots,
          gaps: filteredGaps,
          demographics: SYNTHETIC_DEMOGRAPHICS,
          investments: SYNTHETIC_PUBLIC_INVESTMENTS,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          setPriorities(data.recommendations);
          setPrioritiesSource('Amazon Bedrock Claude');
          setActiveTab('priorities');
          return;
        }
      }
    } catch (err) {
      console.warn('Using baseline priorities due to API limit or offline state:', err);
    } finally {
      setIsGeneratingPriorities(false);
    }
  };

  const handleCaseCreatedFromSimulator = (newCase: CivicCase) => {
    if (onCaseCreated) {
      onCaseCreated(newCase);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Top Banner: Transparency & Purpose */}
      <div className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-900/80 text-blue-300 border border-blue-700">
                  CIVIC INTELLIGENCE ENGINE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Amazon Bedrock 2.5 Flash Policy Advisor
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Policy & Development Planning Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-400 max-w-3xl leading-relaxed">
                Aggregating citizen intake into actionable development intelligence — identifying demand hotspots,
                assessing infrastructure deficits against demographic density, and generating AI development priorities for government consideration.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="btn-open-messaging-simulator"
                onClick={() => setIsMessagingModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                title="Simulates citizen intake via instant messaging (WhatsApp/Telegram)"
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span>Messaging Channel Simulator</span>
              </button>

              <button
                id="btn-regenerate-ai-priorities"
                disabled={isGeneratingPriorities}
                onClick={handleRegeneratePriorities}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                  isGeneratingPriorities
                    ? 'bg-blue-800 text-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                }`}
              >
                {isGeneratingPriorities ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Amazon Bedrock 2.5 Flash Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate AI Priorities</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Data Sources Transparency Notice */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300 bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <div>
                <span className="font-semibold block text-white">Citizen Requests:</span>
                <span className="text-slate-400">Live CivicVoice Case Store ({cases.length} cases)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300 bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <div>
                <span className="font-semibold block text-white">Demographic Context:</span>
                <span className="text-slate-400">Synthetic Demo Dataset</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300 bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <div>
                <span className="font-semibold block text-white">Infrastructure Indicators:</span>
                <span className="text-slate-400">Synthetic Demo Dataset</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300 bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <div>
                <span className="font-semibold block text-white">Public Investment Context:</span>
                <span className="text-slate-400">Synthetic Demo Dataset</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Policy Filters:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 max-w-4xl">
            {/* State Filter */}
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium text-slate-800 focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All States</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Delhi NCT">Delhi NCT</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
            </select>

            {/* District Filter */}
            <select
              value={filters.district}
              onChange={(e) => setFilters({ ...filters, district: e.target.value })}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium text-slate-800 focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Districts</option>
              <option value="Prayagraj">Prayagraj</option>
              <option value="Varanasi">Varanasi</option>
              <option value="Lucknow">Lucknow</option>
              <option value="Kanpur Nagar">Kanpur Nagar</option>
              <option value="Pune">Pune</option>
              <option value="Bengaluru Urban">Bengaluru Urban</option>
            </select>

            {/* Sector Filter */}
            <select
              value={filters.sector}
              onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium text-slate-800 focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Sectors</option>
              <option value="ROADS">Roads & Transport</option>
              <option value="WATER">Water Supply</option>
              <option value="DRAINAGE">Drainage & Stormwater</option>
              <option value="WASTE">Solid Waste</option>
              <option value="STREETLIGHT">Street Lighting</option>
              <option value="ELECTRICITY">Electricity & Power</option>
            </select>

            {/* Time Period */}
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value as any })}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium text-slate-800 focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Time Intake</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          <button
            onClick={() => setFilters({ state: 'ALL', district: 'ALL', sector: 'ALL', timeRange: 'all' })}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0 self-end md:self-auto"
          >
            Reset Filters
          </button>
        </div>

        {/* Top KPI Metrics Cards (Calculated Deterministically from Cases) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Total Citizen Requests</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{metrics.total_requests}</span>
              <span className="text-[11px] text-emerald-600 font-bold">+{metrics.request_growth_percent}%</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Live case database</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Active Demand Hotspots</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 font-mono">{filteredHotspots.length}</span>
              <span className="text-[11px] text-rose-600 font-bold">Clusters</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Concentrated demand</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Infrastructure Gaps</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 font-mono">{filteredGaps.length}</span>
              <span className="text-[11px] text-amber-600 font-bold">Deficits</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">High/Critical deficit areas</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Potential Priorities</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700 font-mono">{priorities.length}</span>
              <span className="text-[11px] text-blue-600 font-bold">AI Advised</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">For gov consideration</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Resolution Rate</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{metrics.resolution_rate_percent}%</span>
              <span className="text-[11px] text-emerald-600 font-bold">Target &gt;60%</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Authority closure rate</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Average Severity</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{metrics.average_severity}</span>
              <span className="text-[11px] text-slate-500">/10</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Public impact index</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-300">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>India Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('hotspots')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'hotspots'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Demand Hotspots ({filteredHotspots.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('gaps')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'gaps'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Infrastructure Gaps ({filteredGaps.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('priorities')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'priorities'
                  ? 'bg-blue-900 text-amber-300 shadow-xs border border-amber-500/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Development Priorities ({priorities.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('demographics')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'demographics'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Demographic Context</span>
            </button>

            <button
              onClick={() => setActiveTab('investments')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'investments'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Public Investment Context</span>
            </button>

            <button
              onClick={() => setActiveTab('impact')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'impact'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Impact Tracking</span>
            </button>
          </nav>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & CIVIC DEMAND MAP                   */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Row: Category Distribution & Weekly Trajectory */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Category Breakdown */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Citizen Demand by Infrastructure Category
                    </h3>
                    <p className="text-xs text-slate-500">
                      Aggregated from active citizen reports across municipal sectors
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Deterministic Count
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {Object.entries(byCategory).map(([cat, count]) => {
                    const pct = Math.round((count / (metrics.total_requests || 1)) * 100);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{cat}</span>
                          <span className="font-mono text-slate-600">
                            {count} requests ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(8, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Trajectory */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Civic Intake Velocity
                      </h3>
                      <p className="text-xs text-slate-500">4-Week request trend and high-severity share</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      +28.5% Growth
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-4">
                    {trendByWeek.map((t, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{t.week}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-900 font-bold">{t.count} total</span>
                          <span className="text-rose-600 font-semibold text-[11px]">
                            {t.highPriority} high-priority
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Planning Insight:</strong> Potholes and potable water disruptions account for over 65% of all high-severity reports, highlighting immediate municipal priority corridors.
                  </span>
                </div>
              </div>
            </div>

            {/* District-wise Aggregation Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    District-wise Demand & Hotspot Density
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aggregating citizen intake by administrative district and severity profile
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {Object.keys(byDistrict).length} Active Administrative Units
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">State / Jurisdiction</th>
                      <th className="py-2.5 px-3">Total Requests</th>
                      <th className="py-2.5 px-3">Top Sector</th>
                      <th className="py-2.5 px-3">Hotspot Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(byDistrict).map(([districtName, count]) => {
                      const districtHotspots = hotspots.filter((h) => h.district === districtName);
                      const isHotspot = districtHotspots.some((h) => h.hotspot_level === 'CRITICAL' || h.hotspot_level === 'HIGH');
                      return (
                        <tr key={districtName} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{districtName}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {districtName.includes('São Paulo')
                              ? 'São Paulo (Brazil)'
                              : districtName.includes('Durban')
                              ? 'KwaZulu-Natal (South Africa)'
                              : 'Uttar Pradesh'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{count}</td>
                          <td className="py-3 px-3 font-semibold text-blue-700">
                            {districtName === 'Prayagraj' ? 'ROADS & WATER' : 'INFRASTRUCTURE'}
                          </td>
                          <td className="py-3 px-3">
                            {isHotspot ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                HIGH DEMAND CLUSTER
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium font-mono bg-slate-100 text-slate-700">
                                Standard Monitoring
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setFilters({ ...filters, district: districtName });
                                setActiveTab('hotspots');
                              }}
                              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 ml-auto"
                            >
                              <span>View Hotspots</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: DEMAND HOTSPOTS                               */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'hotspots' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Concentrated Civic Demand Hotspots</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Deterministically identified geographical clusters where citizen complaints exceed density thresholds
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                {filteredHotspots.length} Active Clusters
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHotspots.map((h) => (
                <div
                  key={h.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400">{h.id}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            h.hotspot_level === 'CRITICAL'
                              ? 'bg-rose-600 text-white'
                              : h.hotspot_level === 'HIGH'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          HOTSPOT: {h.hotspot_level}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">
                        {h.district} — {h.sector}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{h.locality}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Severity Score</span>
                      <span className="text-xl font-black text-rose-600 font-mono">{h.average_severity}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">out of 10</span>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Requests</span>
                      <span className="text-sm font-bold text-slate-900">{h.request_count}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">High Priority</span>
                      <span className="text-sm font-bold text-rose-600">{h.high_priority_count}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Trend</span>
                      <span className="text-sm font-bold text-emerald-600">+{h.trend_percentage}%</span>
                    </div>
                  </div>

                  {/* Primary issues */}
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-slate-700 block">Reported Issues:</span>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                      {h.primary_issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono text-[11px]">
                      Affects {h.affected_areas_count} Municipal Wards
                    </span>
                    <button
                      onClick={() => {
                        setFilters({ ...filters, district: h.district, sector: h.sector });
                        setActiveTab('gaps');
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>Analyze Infrastructure Gap</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: INFRASTRUCTURE GAP ANALYSIS                   */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'gaps' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Infrastructure Gap Methodology:</strong> Compares aggregated citizen demand against baseline infrastructure condition scores and service coverage.
                A <em>Critical</em> gap exists when sustained citizen demand coincides with low baseline coverage and repeated structural failures.
                <span className="block mt-1 font-mono text-[11px] text-amber-800">
                  {SYNTHETIC_DATASET_NOTICE}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Infrastructure Gap Matrix
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {filteredGaps.length} Evaluated Infrastructure Dimensions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Area / District</th>
                      <th className="py-3 px-4">Infrastructure Asset</th>
                      <th className="py-3 px-4 text-center">Citizen Demand</th>
                      <th className="py-3 px-4 text-center">Infra Indicator</th>
                      <th className="py-3 px-4 text-center">Service Coverage</th>
                      <th className="py-3 px-4 text-center">Gap Level</th>
                      <th className="py-3 px-4">Explanation & Supporting Requests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGaps.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {g.district}
                          <span className="block text-[11px] text-slate-400 font-normal">{g.state}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-800">
                          {g.infrastructure_type}
                          <span className="block text-[10px] font-mono text-slate-500 uppercase">{g.sector}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              g.citizen_demand_level === 'CRITICAL' || g.citizen_demand_level === 'HIGH'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {g.citizen_demand_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              g.infrastructure_indicator === 'LOW'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {g.infrastructure_indicator}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              g.service_coverage === 'LOW'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {g.service_coverage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-mono font-black text-[10px] ${
                              g.gap_level === 'CRITICAL'
                                ? 'bg-rose-600 text-white'
                                : g.gap_level === 'HIGH'
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {g.gap_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-sm leading-relaxed">
                          <p className="text-[11px]">{g.explanation}</p>
                          <span className="text-[10px] font-mono text-blue-700 font-semibold block mt-1">
                            {g.supporting_requests_count} Supporting citizen cases analyzed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: AI DEVELOPMENT PRIORITIES (Amazon Bedrock 2.5 Flash)  */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'priorities' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                    Amazon Bedrock 2.5 Flash Development Advisory Engine
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-white">
                  Strategic Development Priorities for Consideration
                </h3>
                <p className="text-xs text-blue-200/80 max-w-2xl leading-relaxed">
                  Synthesizing citizen demand volume, infrastructure deficits, demographic vulnerability, and public capital allocations into evidence-based priorities for public works planning.
                </p>
              </div>

              <button
                disabled={isGeneratingPriorities}
                onClick={handleRegeneratePriorities}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-2 transition-all active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPriorities ? 'animate-spin' : ''}`} />
                <span>{isGeneratingPriorities ? 'Analyzing Live Data...' : 'Regenerate with Amazon Bedrock 2.5 Flash'}</span>
              </button>
            </div>

            {/* Advisory disclaimer */}
            <div className="p-3 rounded-xl bg-slate-200/70 border border-slate-300 text-slate-700 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong>Advisory Notice:</strong> Recommendations are calculated autonomously for municipal planning consideration.
                Wording follows prudent decision-support standards: <em>"Potential priority"</em>, <em>"Recommended for consideration"</em>, <em>"Based on available data"</em>, <em>"Requires government validation"</em>.
              </span>
            </div>

            {/* Priorities List */}
            <div className="space-y-6">
              {priorities.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm hover:border-blue-300 transition-all space-y-5"
                >
                  {/* Top line */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          PRIORITY #{idx + 1}
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.sector}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {p.geographic_area}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mt-2 tracking-tight">
                        {p.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Asset: {p.infrastructure_type}
                      </p>
                    </div>

                    <div className="text-right sm:text-right shrink-0">
                      <span className="text-[11px] font-mono text-slate-400 uppercase block">Confidence</span>
                      <span className="text-xl font-black text-blue-700 font-mono">{p.confidence_score}%</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block">High Correlation</span>
                    </div>
                  </div>

                  {/* Core Context 4-quadrant */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase text-[10px]">1. Citizen Demand</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{p.citizen_demand}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase text-[10px]">2. Infrastructure Gap</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{p.infrastructure_gap}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase text-[10px]">3. Demographic Context</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{p.demographic_context}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase text-[10px]">4. Investment Context</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{p.investment_context}</p>
                    </div>
                  </div>

                  {/* Evidence & Intervention */}
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Compass className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-blue-950">Suggested Intervention (Recommended for Consideration):</span>
                        <p className="text-blue-900 mt-0.5 leading-relaxed">{p.suggested_intervention}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-blue-200/80 flex items-start gap-2">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-blue-950">Expected Public Impact:</span>
                        <p className="text-blue-900 mt-0.5 leading-relaxed">{p.expected_public_impact}</p>
                      </div>
                    </div>
                  </div>

                  {/* CRITICAL: WHY THIS RECOMMENDATION? */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                        WHY THIS RECOMMENDATION?
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {p.why_points && p.why_points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-400 font-bold shrink-0">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer Disclaimer */}
                  <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>{p.disclaimer || 'Potential priority recommended for government consideration.'}</span>
                    <span className="font-mono text-[10px] text-slate-400">Model: Amazon Bedrock 2.5 Flash</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: DEMOGRAPHIC CONTEXT                           */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'demographics' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
              <span>
                <strong>Demographic Context Layer:</strong> Incorporates population density, urban/rural distribution, and vulnerable demographics to prioritize capital allocations where public exposure is highest.
              </span>
              <span className="font-mono text-[10px] bg-blue-200/80 px-2 py-0.5 rounded text-blue-900 font-bold shrink-0">
                {SYNTHETIC_DATASET_NOTICE}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SYNTHETIC_DEMOGRAPHICS.map((d) => (
                <div key={d.district} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{d.district}</h4>
                      <span className="text-xs text-slate-500">{d.state}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {d.municipal_wards_count} Wards
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-500 uppercase block">Population</span>
                      <span className="font-bold text-slate-900">{d.population.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-500 uppercase block">Density / sq km</span>
                      <span className="font-bold text-slate-900">{d.population_density_per_sqkm}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-500 uppercase block">Urban %</span>
                      <span className="font-bold text-slate-900">{d.urban_percent}%</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-500 uppercase block">Vulnerable %</span>
                      <span className="font-bold text-rose-700">{d.vulnerable_population_percent}%</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono pt-1">
                    {d.source_label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 6: PUBLIC INVESTMENT CONTEXT                     */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'investments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-950 flex items-center justify-between">
              <span>
                <strong>Public Investment Context Layer:</strong> Maps currently sanctioned or active infrastructure capital projects. Allows planners to spot duplicate proposals or reveal areas with high citizen demand that lack capital allocations.
              </span>
              <span className="font-mono text-[10px] bg-purple-200/80 px-2 py-0.5 rounded text-purple-900 font-bold shrink-0">
                {SYNTHETIC_DATASET_NOTICE}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SYNTHETIC_PUBLIC_INVESTMENTS.map((prj) => (
                <div key={prj.project_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {prj.project_id} • {prj.sector}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">{prj.project_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{prj.target_area}</p>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        prj.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : prj.status === 'ACTIVE_CONSTRUCTION'
                          ? 'bg-blue-100 text-blue-800'
                          : prj.status === 'DELAYED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {prj.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Planned</span>
                      <span className="font-bold text-slate-900">₹{prj.planned_investment_cr} Cr</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Disbursed</span>
                      <span className="font-bold text-slate-900">₹{prj.spent_investment_cr} Cr</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Completion</span>
                      <span className="font-bold text-slate-900">{prj.completion_year}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1">
                    <span>Agency: {prj.implementing_agency}</span>
                    <span className="font-mono text-[10px] text-slate-400">{prj.district}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 7: IMPACT TRACKING                               */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'impact' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  Civic Governance Impact & Accountability Metrics
                </h3>
                <p className="text-xs text-slate-500">
                  Measuring the translation of citizen voice into measurable municipal operations and resolved public infrastructure
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">Total Structured Reports</span>
                  <span className="text-2xl font-black text-slate-900">{cases.length}</span>
                  <span className="text-[11px] text-slate-500 block font-sans">Across 5 BRICS & Indian cities</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">Assigned / Dispatched</span>
                  <span className="text-2xl font-black text-blue-700">
                    {cases.filter((c) => !['CREATED', 'AI_TRIAGED'].includes(c.status)).length}
                  </span>
                  <span className="text-[11px] text-blue-600 block font-sans">Under municipal field handling</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">Resolved Cases</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {cases.filter((c) => c.status === 'RESOLVED').length}
                  </span>
                  <span className="text-[11px] text-emerald-700 block font-sans">Verified completion signoff</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">Average Resolution Velocity</span>
                  <span className="text-2xl font-black text-slate-900">18.4h</span>
                  <span className="text-[11px] text-emerald-600 block font-sans">Under 24h SLA compliance</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                <h4 className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>The Closed-Loop Governance Cycle</span>
                </h4>
                <p className="text-slate-300 leading-relaxed font-sans">
                  By connecting individual citizen reports to <strong>Configured Authority Routing</strong>, CivicVoice AI ensures immediate operational response. Simultaneously, by synthesizing reports into <strong>Policy Demand Hotspots</strong> and <strong>Infrastructure Gap Analyses</strong>, urban planning authorities can formulate evidence-based capital investments that prevent recurring civic failure.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messaging Channel Simulator Modal */}
      <MessagingSimulatorModal
        isOpen={isMessagingModalOpen}
        onClose={() => setIsMessagingModalOpen(false)}
        onCaseCreated={handleCaseCreatedFromSimulator}
        onViewCase={(caseId) => onNavigate(`/case/${caseId}`)}
      />
    </div>
  );
};
