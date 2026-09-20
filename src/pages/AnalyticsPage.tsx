import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { CivicCase } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { BarRows, DonutLegend } from '../components/ui/Charts';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import { computeAnalyticsSummary, computeHotspots } from '../server/analytics';
import { CATEGORY_LABELS, CATEGORY_TONES, STATUS_TONES, STATUS_ORDER } from '../lib/format';

interface AnalyticsPageProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
  onNavigate: (path: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ cases, onSelectCase }) => {
  const [radiusKm, setRadiusKm] = useState(2);

  const summary = useMemo(() => computeAnalyticsSummary(cases), [cases]);
  const hotspot = useMemo(() => computeHotspots(cases, { radiusKm }), [cases, radiusKm]);

  const byCategory = useMemo(
    () =>
      Object.entries(summary.by_category)
        .map(([cat, count]) => ({ label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat, value: count, tone: CATEGORY_TONES[cat as keyof typeof CATEGORY_TONES] ?? '#616161' }))
        .sort((a, b) => b.value - a.value),
    [summary.by_category]
  );

  const byStatus = useMemo(() => {
    const total = summary.total_cases || 1;
    return STATUS_ORDER.map((s) => ({
      label: STATUS_TONES[s].label,
      value: summary.by_status[s] ?? 0,
      tone: s === 'AI_TRIAGED' ? '#2a5b55' : s === 'ASSIGNED' ? '#0284c7' : s === 'IN_PROGRESS' ? '#d97706' : s === 'FIELD_VERIFICATION' ? '#4f46e5' : s === 'RESOLVED' ? '#059669' : s === 'CLOSED' ? '#78716c' : '#a8a29e',
      pct: ((summary.by_status[s] ?? 0) / total),
    })).filter((s) => s.value > 0);
  }, [summary]);

  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Analytics"
        description="Aggregates computed from the current case dataset. Report locations describe where reports were filed — they are not predictions."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="metric">
          <p className="metric-label">Total cases</p>
          <p className="metric-value">{summary.total_cases}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Open</p>
          <p className="metric-value">{summary.open_cases}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Resolved / closed</p>
          <p className="metric-value">{summary.resolved_cases}</p>
        </div>
        <div className="metric">
          <p className="metric-label">High priority</p>
          <p className="metric-value">{summary.high_priority}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Critical</p>
          <p className="metric-value">{summary.critical_priority}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Reports by category" subtitle="Distribution across the dataset">
          <BarRows items={byCategory.slice(0, 10)} />
        </Panel>

        <Panel title="Cases by status" subtitle="Where each report currently sits">
          <DonutLegend items={byStatus} />
        </Panel>
      </div>

      <div className="mt-5">
        <Panel
          title="Report concentration"
          subtitle="Local areas where reports cluster, by citizen-reported coordinates"
          actions={
            <label className="flex items-center gap-2 text-[12px] text-navy-600">
              <span>Radius</span>
              <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className="select w-auto !py-1 text-[12px]" aria-label="Hotspot radius">
                {[1, 2, 5, 10].map((r) => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </label>
          }
        >
          <div className="mb-3 flex items-start gap-2 rounded-md border border-cv-line bg-cv-subtle px-3 py-2.5 text-[12px] leading-relaxed text-navy-500">
            <Info size={13} className="mt-0.5 shrink-0 text-navy-300" aria-hidden="true" />
            {hotspot.note} · {hotspot.geocoded_cases} of {hotspot.total_cases} cases had usable coordinates ({hotspot.excluded_cases} excluded).
          </div>
          {hotspot.hotspots.length === 0 ? (
            <p className="subtitle py-4 text-center">
              Not enough cases with coordinates to form a concentrated area yet.
            </p>
          ) : (
            <ul className="divide-y divide-cv-line">
              {hotspot.hotspots.map((h, i) => {
                const catLabel = CATEGORY_LABELS[h.dominant_category as keyof typeof CATEGORY_LABELS] ?? h.dominant_category;
                return (
                  <li key={i} className="flex items-center gap-4 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cv-line-strong bg-cv-subtle text-[12px] font-semibold text-navy-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-navy-900">{h.case_count} report{h.case_count === 1 ? '' : 's'}</span>
                        <span className="text-[12px] text-navy-400">· centred near {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</span>
                      </div>
                      <p className="text-[12px] text-navy-500">Dominant category: {catLabel}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Most recent reports" subtitle="Latest submissions in the dataset" flush>
          <div className="table-outer" style={{ boxShadow: 'none', border: 'none', borderRadius: 0 }}>
            <table className="table-cv">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_cases.slice(0, 8).map((rc) => (
                  <tr key={rc.case_id} className="clickable" onClick={() => onSelectCase(rc.case_id)}>
                    <td className="whitespace-nowrap font-mono text-[12px] font-medium text-navy-700">{rc.case_id}</td>
                    <td className="max-w-[320px] truncate text-[13px] text-navy-800">{rc.title}</td>
                    <td><StatusBadge status={rc.status} size="sm" /></td>
                    <td><PriorityBadge priority={rc.priority} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
};