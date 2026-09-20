import React, { useMemo } from 'react';
import { Bell, ChevronRight, CircleAlert, Flag, Inbox, Wrench } from 'lucide-react';
import { CivicCase } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { EmptyState } from '../components/ui/StateViews';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import { isOpenStatus, timeAgo } from '../lib/format';

interface NotificationsPageProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
  onNavigate: (path: string) => void;
}

interface Notice {
  id: string;
  caseId: string;
  kind: 'critical' | 'high' | 'awaiting' | 'resolved';
  title: string;
  description: string;
  time: string;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ cases, onSelectCase, onNavigate }) => {
  const notices = useMemo<Notice[]>(() => {
    const list: Notice[] = [];
    const open = cases.filter((c) => isOpenStatus(c.status));

    for (const c of cases) {
      if (c.priority === 'CRITICAL' && isOpenStatus(c.status)) {
        list.push({
          id: `crit-${c.case_id}`,
          caseId: c.case_id,
          kind: 'critical',
          title: 'Critical priority report',
          description: `${c.title} — ${c.location}`,
          time: c.created_at,
        });
      } else if (c.priority === 'HIGH' && isOpenStatus(c.status)) {
        list.push({
          id: `high-${c.case_id}`,
          caseId: c.case_id,
          kind: 'high',
          title: 'High priority report',
          description: `${c.title} — ${c.location}`,
          time: c.created_at,
        });
      }
    }

    for (const c of open) {
      if (c.status === 'CREATED' || c.status === 'AI_TRIAGED') {
        list.push({
          id: `await-${c.case_id}`,
          caseId: c.case_id,
          kind: 'awaiting',
          title: 'Awaiting officer assignment',
          description: `${c.title} has not been picked up yet.`,
          time: c.created_at,
        });
      }
    }

    const resolved = cases
      .filter((c) => c.status === 'RESOLVED')
      .sort((a, b) => String(b.resolved_at ?? b.created_at).localeCompare(String(a.resolved_at ?? a.created_at)));
    for (const c of resolved.slice(0, 5)) {
      list.push({
        id: `resolved-${c.case_id}`,
        caseId: c.case_id,
        kind: 'resolved',
        title: 'Report resolved',
        description: c.resolution_note ?? `${c.title} has been marked resolved.`,
        time: c.resolved_at ?? c.created_at,
      });
    }

    return list.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  }, [cases]);

  const counts = {
    critical: notices.filter((n) => n.kind === 'critical').length,
    high: notices.filter((n) => n.kind === 'high').length,
    awaiting: notices.filter((n) => n.kind === 'awaiting').length,
    resolved: notices.filter((n) => n.kind === 'resolved').length,
  };

  const KIND_STYLE: Record<Notice['kind'], { icon: React.ReactNode; bar: string }> = {
    critical: { icon: <CircleAlert size={15} aria-hidden="true" />, bar: 'bg-red-600' },
    high: { icon: <Flag size={15} aria-hidden="true" />, bar: 'bg-amber-500' },
    awaiting: { icon: <Bell size={15} aria-hidden="true" />, bar: 'bg-navy-400' },
    resolved: { icon: <Wrench size={15} aria-hidden="true" />, bar: 'bg-emerald-600' },
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Derived live from the case dataset — priority alerts, cases awaiting assignment, and resolution updates."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="badge border-red-200 bg-red-50 text-red-800">{counts.critical} critical</span>
        <span className="badge border-amber-200 bg-amber-50 text-amber-800">{counts.high} high priority</span>
        <span className="badge border-navy-200 bg-navy-50 text-navy-800">{counts.awaiting} awaiting assignment</span>
        <span className="badge border-emerald-200 bg-emerald-50 text-emerald-800">{counts.resolved} recent resolutions</span>
      </div>

      <Panel flush>
        {notices.length === 0 ? (
          <EmptyState
            title="Nothing to flag"
            description="When reports arrive with critical or high priority, or a case awaits assignment, they will appear here."
            icon={<Bell size={20} aria-hidden="true" />}
          />
        ) : (
          <ul className="divide-y divide-cv-line">
            {notices.map((n) => {
              const c = cases.find((x) => x.case_id === n.caseId);
              const style = KIND_STYLE[n.kind];
              return (
                <li key={n.id}>
                  <button
                    onClick={() => onSelectCase(n.caseId)}
                    className="group flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-navy-50"
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${style.bar} bg-opacity-90 text-white`}>
                      {style.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-navy-900">{n.title}</span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-navy-500">{n.description}</span>
                      {c && (
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] text-navy-400">{c.case_id}</span>
                          {n.kind !== 'resolved' && <PriorityBadge priority={c.priority} size="sm" />}
                          <StatusBadge status={c.status} size="sm" />
                          <span className="meta">· {timeAgo(n.time)}</span>
                        </span>
                      )}
                    </span>
                    <ChevronRight size={14} className="mt-2 shrink-0 text-navy-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="mt-5">
        <Panel title="Looking for something else?" subtitle="Browse the full registry or view the geographic view.">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onNavigate('/cases')} className="btn btn-secondary btn-sm">All cases</button>
            <button onClick={() => onNavigate('/map')} className="btn btn-secondary btn-sm">Map of reports</button>
          </div>
        </Panel>
      </div>
    </div>
  );
};