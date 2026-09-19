import React, { useMemo, useState, useEffect } from 'react';
import { CivicCase } from '../types';
import { computeAnalyticsSummary, computeHotspots, AnalyticsSummary, HotspotResult } from '../server/analytics';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import {
  TrendingUp,
  Layers,
  MapPin,
  Database,
  BarChart3,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  Inbox,
  FileCheck2,
  Flame,
  AlertTriangle,
} from 'lucide-react';

interface CivicAnalyticsPageProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  ROADS: 'bg-blue-600',
  WASTE: 'bg-emerald-600',
  WATER: 'bg-cyan-600',
  ELECTRICITY: 'bg-amber-500',
  SANITATION: 'bg-teal-600',
  STREETLIGHT: 'bg-yellow-500',
  PUBLIC_SAFETY: 'bg-rose-600',
  TRAFFIC: 'bg-orange-600',
  DRAINAGE: 'bg-indigo-600',
  PUBLIC_PROPERTY: 'bg-purple-600',
  ENVIRONMENT: 'bg-lime-600',
  OTHER: 'bg-slate-500',
};

export const CivicAnalyticsPage: React.FC<CivicAnalyticsPageProps> = ({ cases, onSelectCase }) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hotspotResult, setHotspotResult] = useState<HotspotResult | null>(null);
  const [radiusKm, setRadiusKm] = useState(2);
  const [apiSource, setApiSource] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fallbackSummary = useMemo(() => computeAnalyticsSummary(cases), [cases]);
  const effectiveSummary = summary || fallbackSummary;

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, hotspotsRes] = await Promise.all([
        fetch(`/api/analytics/summary`),
        fetch(`/api/analytics/hotspots?radius_km=${radiusKm}`),
      ]);
      if (summaryRes.ok && hotspotsRes.ok) {
        const summaryData = await summaryRes.json();
        const hotspotsData = await hotspotsRes.json();
        if (summaryData.success && hotspotsData.success) {
          setSummary(summaryData.summary);
          setHotspotResult(hotspotsData.hotspots ? hotspotsData : null);
          setApiSource(true);
          return;
        }
      }
      throw new Error('analytics endpoints unavailable');
    } catch (e) {
      console.warn('Civic Analytics API unavailable, using local fallback:', e);
      setApiSource(false);
      setSummary(null);
      setHotspotResult(computeHotspots(cases, { radiusKm }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [radiusKm]);

  const byCategoryEntries = useMemo(
    () => Object.entries(effectiveSummary.by_category).sort((a, b) => b[1] - a[1]),
    [effectiveSummary]
  );
  const byDepartmentEntries = useMemo(
    () => Object.entries(effectiveSummary.by_department).sort((a, b) => b[1] - a[1]),
    [effectiveSummary]
  );
  const maxCategoryCount = useMemo(
    () => Math.max(1, ...byCategoryEntries.map(([, n]) => n)),
    [byCategoryEntries]
  );

  const hotspots = useMemo(() => {
    if (hotspotResult) return hotspotResult.hotspots.slice(0, 10);
    const local = computeHotspots(cases, { radiusKm });
    return local.hotspots.slice(0, 10);
  }, [hotspotResult, cases, radiusKm]);

  const kebabLabel = (label: string) => label.replace(/_/g, ' ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md mb-2 w-fit">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Civic Intelligence Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Reported Case Analytics & Hotspots
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Aggregated, categorized reporting intelligence derived strictly from submitted civic cases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            {apiSource === true ? 'Live DynamoDB analytics' : apiSource === false ? 'Local demo fallback' : 'Loading…'}
          </span>
          <button
            id="btn-refresh-analytics"
            onClick={loadAnalytics}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-indigo-700 text-white hover:bg-indigo-800 transition-colors text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Inbox className="w-3 h-3 text-slate-400" /> Total Reports
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{effectiveSummary.total_cases}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-500" /> Open Cases
          </span>
          <p className="text-2xl font-black text-blue-800 mt-1 font-mono">{effectiveSummary.open_cases}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
            <FileCheck2 className="w-3 h-3 text-emerald-500" /> Resolved / Closed
          </span>
          <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">{effectiveSummary.resolved_cases}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> High Priority
          </span>
          <p className="text-2xl font-black text-amber-950 mt-1 font-mono">{effectiveSummary.high_priority}</p>
        </div>
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-600" /> Critical Priority
          </span>
          <p className="text-2xl font-black text-rose-950 mt-1 font-mono">{effectiveSummary.critical_priority}</p>
        </div>
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-indigo-500" /> Statuses Tracked
          </span>
          <p className="text-2xl font-black text-indigo-950 mt-1 font-mono">
            {Object.keys(effectiveSummary.by_status).length || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category breakdown */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Reports by Category
          </h3>
          {byCategoryEntries.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No categorized reports yet.</p>
          ) : (
            <div className="space-y-2.5">
              {byCategoryEntries.map(([category, count]) => (
                <div key={category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{kebabLabel(category)}</span>
                    <span className="font-mono font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_COLORS[category] || 'bg-slate-500'}`}
                      style={{ width: `${Math.round((count / maxCategoryCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Status Distribution
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(effectiveSummary.by_status).map(([status, count]) => (
                <span
                  key={status}
                  className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {kebabLabel(status)}: <b>{count}</b>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Department Load
            </h4>
            {byDepartmentEntries.slice(0, 6).map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between text-xs">
                <span className="text-slate-700 truncate">{dept}</span>
                <span className="font-mono font-bold text-slate-900 ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hotspots */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">Reported Case Hotspots</h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-600">Radius (km):</label>
              <select
                id="select-hotspot-radius"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs bg-white focus:border-blue-600 outline-none"
              >
                {[1, 2, 5, 10].map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hotspots.length === 0 ? (
            <div className="text-center py-8 space-y-1">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                No geocoded case concentrations found. Concentrations appear once multiple reports share nearby coordinates.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
              {hotspots.map((hotspot, idx) => (
                <div
                  key={`${hotspot.latitude}-${hotspot.longitude}`}
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    idx === 0
                      ? 'bg-rose-50/60 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-black shrink-0 ${
                        idx === 0 ? 'bg-rose-600 text-white' : 'bg-indigo-700 text-white'
                      }`}
                    >
                      {hotspot.case_count}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {hotspot.case_count} report{hotspot.case_count > 1 ? 's' : ''} concentrated
                        </span>
                        <span className="font-mono text-slate-400">
                          {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate">
                        Dominant category: <b className="text-slate-700">{kebabLabel(hotspot.dominant_category)}</b>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    ~{radiusKm} km radius
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
            <span>
              {hotspotResult?.note ||
                'Reported case concentration based on citizen-reported coordinates. It reflects where reports have been filed, not a prediction of future incidents.'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent cases */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Recent Reports ({effectiveSummary.recent_cases.length})
          </h3>
          <span className="text-xs text-slate-500">Click a row to open the case dossier</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              <tr>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {effectiveSummary.recent_cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No reports recorded yet.
                  </td>
                </tr>
              ) : (
                effectiveSummary.recent_cases.map((c) => (
                  <tr
                    key={c.case_id}
                    onClick={() => onSelectCase(c.case_id)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">{c.case_id}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors">
                        {c.title}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {kebabLabel(c.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{c.department}</td>
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="w-3.5 h-3.5 inline text-blue-600" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CivicAnalyticsPage;