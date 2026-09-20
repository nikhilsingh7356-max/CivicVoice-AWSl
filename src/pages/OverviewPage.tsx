import React, { useMemo } from 'react';
import { Plus, RefreshCw, ArrowRight } from 'lucide-react';
import { CivicCase, CivicPriority, CaseStatus } from '../types';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { BarRows } from '../components/ui/Charts';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/StatusBadge';
import { ApiStatus } from '../components/ui/Sidebar';
import {
  CATEGORY_LABELS,
  CATEGORY_TONES,
  PRIORITY_ORDER,
  STATUS_TONES,
  isOpenStatus,
  statusCounts,
  timeAgo,
} from '../lib/format';

interface OverviewPageProps {
  cases: CivicCase[];
  apiStatus: ApiStatus;
  onSelectCase: (caseId: string) => void;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

const LIFECYCLE = [
  { key: 'CREATED' as const, note: 'Citizen submitted' },
  { key: 'AI_TRIAGED' as const, note: 'Structured by AI' },
  { key: 'ASSIGNED' as const, note: 'Officer assigned' },
  { key: 'FIELD_VERIFICATION' as const, note: 'Field check' },
  { key: 'IN_PROGRESS' as const, note: 'Work underway' },
  { key: 'RESOLVED' as const, note: 'Resolved' },
  { key: 'CLOSED' as const, note: 'Closed' },
];

const STATUS_HEX: Record<CaseStatus, string> = {
  CREATED: '#a8a29e',
  AI_TRIAGED: '#2a5b55',
  ASSIGNED: '#0284c7',
  FIELD_VERIFICATION: '#4f46e5',
  IN_PROGRESS: '#d97706',
  RESOLVED: '#059669',
  CLOSED: '#78716c',
};

export const OverviewPage: React.FC<OverviewPageProps> = ({
  cases,
  apiStatus,
  onSelectCase,
  onNavigate,
  onRefresh,
}) => {
  const { authMode } = useAuth();
  const stats = useMemo(() => {
    const open = cases.filter((c) => isOpenStatus(c.status));
    const urgent = open.filter((c) => c.priority === 'HIGH' || c.priority === 'CRITICAL');
    const awaiting = open.filter((c) => c.status === 'CREATED' || c.status === 'AI_TRIAGED');
    const resolving = cases.filter((c) => c.status === 'RESOLVED' || c.status === 'IN_PROGRESS');
    return { open: open.length, urgent: urgent.length, awaiting: awaiting.length, resolving: resolving.length };
  }, [cases]);

  const statusBreakdown = useMemo(() => statusCounts(cases), [cases]);
  const maxStatus = Math.max(1, ...statusBreakdown.map((s) => s.count));

  const byPriority = useMemo(
    () =>
      PRIORITY_ORDER.map((p) => ({
        priority: p,
        count: cases.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED' && c.priority === p).length,
      })),
    [cases]
  );
  const maxPriority = Math.max(1, ...byPriority.map((p) => p.count));

  const byCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cases) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return [...counts.entries()]
      .map(([cat, count]) => ({ category: cat as CivicCase['category'], count }))
      .sort((a, b) => b.count - a.count);
  }, [cases]);

  const priorityFocus = useMemo(() => {
    const open = cases.filter((c) => isOpenStatus(c.status) && (c.priority === 'HIGH' || c.priority === 'CRITICAL'));
    return [...open].sort((a, b) => {
      const rank: Record<CivicPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [cases]);

  return (
    <div>
      <PageHeader
        eyebrow="Operations overview"
        title="Overview"
        description="Current state of citizen reports and their processing across the city."
        actions={
          <>
            <button onClick={onRefresh} className="btn btn-secondary btn-sm" title="Refresh data">
              <RefreshCw size={13} aria-hidden="true" />
              Refresh
            </button>
            <button onClick={() => onNavigate('/report')} className="btn btn-primary btn-sm">
              <Plus size={14} aria-hidden="true" />
              New report
            </button>
          </>
        }
      />

      {apiStatus === 'offline-demo' && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="dot bg-amber-500" aria-hidden="true" />
          {authMode === 'demo' ? (
            <p className="text-[13px] text-amber-900">
              Development demo — this dashboard shows deterministic sample (<span className="font-semibold">demo</span>)
              records from the local session. Sign out to use the live backend.
            </p>
          ) : (
            <p className="text-[13px] text-amber-900">
              Backend is unreachable — the console is showing sample (<span className="font-semibold">demo</span>) records
              to keep the interface usable. Refresh once the API is available.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="metric">
          <p className="metric-label">Open cases</p>
          <p className="metric-value">{stats.open}</p>
        </div>
        <div className="metric">
          <p className="metric-label">High / critical priority</p>
          <p className="metric-value">{stats.urgent}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Awaiting assignment</p>
          <p className="metric-value">{stats.awaiting}</p>
        </div>
        <div className="metric">
          <p className="metric-label">In progress / resolved</p>
          <p className="metric-value">{stats.resolving}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Caseload by status" subtitle="All records in the current dataset">
          <div className="space-y-3">
            {statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <div className="flex w-[170px] shrink-0 items-center gap-2">
                  <span className={`dot ${STATUS_TONES[s.status].dot}`} aria-hidden="true" />
                  <span className="truncate text-[12.5px] text-navy-700">{STATUS_TONES[s.status].label}</span>
                </div>
<div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(s.count / maxStatus) * 100}%`, backgroundColor: STATUS_HEX[s.status] }}
                    />
                  </div>
                <span className="w-6 shrink-0 text-right text-[12px] font-semibold tabular-nums text-navy-600">{s.count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Open work by priority" subtitle="Statuses other than resolved / closed">
          <BarRows
            items={byPriority.map((p) => ({
              label: p.priority,
              value: p.count,
              tone: { LOW: '#78716c', MEDIUM: '#0284c7', HIGH: '#d97706', CRITICAL: '#dc2626' }[p.priority],
            }))}
            max={maxPriority}
          />
          <div className="mt-6 border-t border-cv-line pt-4">
            <h4 className="label-xs mb-3">How reports are processed</h4>
            <ol className="space-y-1.5">
              {LIFECYCLE.map((step, i) => (
                <li key={step.key} className="flex items-center gap-2 text-[12.5px] text-navy-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cv-line-strong bg-cv-subtle text-[10px] font-semibold text-navy-400">
                    {i + 1}
                  </span>
                  <span className="font-medium">{STATUS_TONES[step.key].label}</span>
                  <span className="text-navy-300">{step.note}</span>
                </li>
              ))}
            </ol>
          </div>
        </Panel>

        <Panel title="Reports by category" subtitle="Counts across the current dataset">
          <BarRows
            items={byCategory.slice(0, 8).map((c) => ({
              label: CATEGORY_LABELS[c.category],
              value: c.count,
              tone: CATEGORY_TONES[c.category],
            }))}
          />
        </Panel>
      </div>

      <div className="mt-5">
        <Panel
          title="Priority attention"
          subtitle="Open reports marked high or critical priority"
          flush
          actions={
            <button onClick={() => onNavigate('/cases')} className="link flex items-center gap-1 text-[12.5px]">
              View all cases <ArrowRight size={13} aria-hidden="true" />
            </button>
          }
        >
          {priorityFocus.length === 0 ? (
            <p className="subtitle px-5 py-8 text-center">No high-priority open cases right now.</p>
          ) : (
            <div className="table-outer" style={{ boxShadow: 'none', border: 'none', borderRadius: 0 }}>
              <table className="table-cv">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th className="hidden md:table-cell">Issue</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th className="hidden sm:table-cell">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityFocus.slice(0, 6).map((c) => (
                    <tr key={c.case_id} className="clickable" onClick={() => onSelectCase(c.case_id)}>
                      <td className="font-mono text-[12px] font-medium text-navy-700">{c.case_id}</td>
                      <td className="hidden max-w-[280px] truncate text-[13px] text-navy-800 md:table-cell">
                        {c.title}
                      </td>
                      <td><StatusBadge status={c.status} size="sm" /></td>
                      <td><PriorityBadge priority={c.priority} size="sm" /></td>
                      <td className="hidden whitespace-nowrap text-[12.5px] text-navy-500 sm:table-cell">{timeAgo(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};