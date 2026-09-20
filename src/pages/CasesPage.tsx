import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { CivicCase, CivicCategory, CivicPriority, CaseStatus } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/StatusBadge';
import { EmptyState, SkeletonRow } from '../components/ui/StateViews';
import { ApiStatus } from '../components/ui/Sidebar';
import { CATEGORY_LABELS, PRIORITY_ORDER, STATUS_TONES, timeAgo } from '../lib/format';

interface CasesPageProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
  apiStatus: ApiStatus;
  onRefresh: () => void;
}

const ALL = 'ALL';

export const CasesPage: React.FC<CasesPageProps> = ({ cases, onSelectCase, apiStatus, onRefresh }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CivicCategory | typeof ALL>(ALL);
  const [priority, setPriority] = useState<CivicPriority | typeof ALL>(ALL);
  const [status, setStatus] = useState<CaseStatus | typeof ALL>(ALL);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (category !== ALL && c.category !== category) return false;
      if (priority !== ALL && c.priority !== priority) return false;
      if (status !== ALL && c.status !== status) return false;
      if (q) {
        const haystack = [c.case_id, c.title, c.complaint, c.location, c.department]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cases, query, category, priority, status]);

  const hasFilters = query !== '' || category !== ALL || priority !== ALL || status !== ALL;
  const reset = () => {
    setQuery('');
    setCategory(ALL);
    setPriority(ALL);
    setStatus(ALL);
  };

  const loading = apiStatus === 'connecting';

  return (
    <div>
      <PageHeader
        eyebrow="Case registry"
        title="Cases"
        description="All citizen reports and their current processing status."
        actions={
          <button onClick={onRefresh} className="btn btn-secondary btn-sm" title="Refresh cases">
            <RefreshCw size={13} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search case ID, issue, location…"
            className="input pl-9"
            aria-label="Search cases"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-navy-400">
            <SlidersHorizontal size={13} aria-hidden="true" />
            Filters
          </span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CivicCategory | typeof ALL)} className="select w-auto" aria-label="Filter by category">
            <option value={ALL}>All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as CivicPriority | typeof ALL)} className="select w-auto" aria-label="Filter by priority">
            <option value={ALL}>All priorities</option>
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus | typeof ALL)} className="select w-auto" aria-label="Filter by status">
            <option value={ALL}>All statuses</option>
            {Object.entries(STATUS_TONES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={reset} className="btn btn-ghost btn-sm" aria-label="Clear filters">
              <X size={13} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-outer">
        {loading ? (
          <SkeletonRow rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No cases match your filters' : 'No cases yet'}
            description={hasFilters ? 'Try broadening the search or clearing filters.' : 'Reports submitted by citizens will appear here.'}
            action={hasFilters ? <button onClick={reset} className="btn btn-secondary btn-sm">Clear filters</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-cv">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Issue</th>
                  <th className="hidden lg:table-cell">Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th className="hidden sm:table-cell">Reported</th>
                  <th className="hidden md:table-cell">Location</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.case_id} className="clickable" onClick={() => onSelectCase(c.case_id)}>
                    <td className="whitespace-nowrap font-mono text-[12px] font-medium text-navy-700">{c.case_id}</td>
                    <td className="max-w-[300px]">
                      <p className="truncate text-[13px] font-medium text-navy-900">{c.title}</p>
                      <p className="truncate text-[11.5px] text-navy-400">{c.subcategory}</p>
                    </td>
                    <td className="hidden lg:table-cell"><CategoryBadge category={c.category} size="sm" /></td>
                    <td><StatusBadge status={c.status} size="sm" /></td>
                    <td><PriorityBadge priority={c.priority} size="sm" /></td>
                    <td className="hidden whitespace-nowrap text-[12.5px] text-navy-500 sm:table-cell">{timeAgo(c.created_at)}</td>
                    <td className="hidden max-w-[180px] truncate text-[12.5px] text-navy-500 md:table-cell">{c.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <p className="meta mt-2">
          Showing {filtered.length} of {cases.length} records
        </p>
      )}
    </div>
  );
};