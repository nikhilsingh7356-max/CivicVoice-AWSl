import React, { useMemo, useState } from 'react';
import { MapPin, MoveRight } from 'lucide-react';
import { CivicCase } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { getCaseCoordinates, timeAgo } from '../lib/format';

interface MapPageProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#d97706',
  MEDIUM: '#0284c7',
  LOW: '#78716c',
};

const W = 820;
const H = 520;
const PAD = 36;

export const MapPage: React.FC<MapPageProps> = ({ cases, onSelectCase }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const plotted = useMemo(() => {
    return cases
      .map((c) => ({ c, coords: getCaseCoordinates(c) }))
      .filter((x): x is { c: CivicCase; coords: { lat: number; lng: number } } => Boolean(x.coords));
  }, [cases]);

  const unplotted = cases.length - plotted.length;

  const projection = useMemo(() => {
    if (plotted.length === 0) return null;
    const lats = plotted.map((p) => p.coords.lat);
    const lngs = plotted.map((p) => p.coords.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = Math.max(0.004, maxLat - minLat);
    const spanLng = Math.max(0.004, maxLng - minLng);
    const scale = Math.min((W - 2 * PAD) / spanLng, (H - 2 * PAD) / spanLat);
    const offsetX = (W - spanLng * scale) / 2;
    const offsetY = (H - spanLat * scale) / 2;
    return {
      minLat,
      maxLat,
      spanLat,
      scale,
      toX: (lng: number) => offsetX + (lng - minLng) * scale,
      toY: (lat: number) => offsetY + (maxLat - lat) * scale,
    };
  }, [plotted]);

  const selected = plotted.find((p) => p.c.case_id === selectedId)?.c;

  const handleClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Geographic view"
        title="Map of reports"
        description="Reported locations plotted against live coordinates. Marks are schematic — they show where each report originated."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" flush>
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-navy-400" aria-hidden="true" />
              <h3 className="section-title">Reported locations</h3>
            </div>
            <span className="meta">{plotted.length} plotted · {unplotted} without coordinates</span>
          </div>
          <div className="p-4">
            {projection ? (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-cv-line bg-cv-subtle" role="img" aria-label="Map of reported cases">
                <rect x="0" y="0" width={W} height={H} fill="none" />
                <g>
                  {[0.25, 0.5, 0.75].map((t) => (
                    <line key={`v${t}`} x1={PAD + t * (W - 2 * PAD)} y1={PAD} x2={PAD + t * (W - 2 * PAD)} y2={H - PAD} stroke="var(--color-cv-line)" strokeDasharray="3 5" />
                  ))}
                  {[0.25, 0.5, 0.75].map((t) => (
                    <line key={`h${t}`} x1={PAD} y1={PAD + t * (H - 2 * PAD)} x2={W - PAD} y2={PAD + t * (H - 2 * PAD)} stroke="var(--color-cv-line)" strokeDasharray="3 5" />
                  ))}
                </g>
                {plotted.map(({ c, coords }) => {
                  const isSel = selectedId === c.case_id;
                  const r = c.priority === 'CRITICAL' ? 9 : c.priority === 'HIGH' ? 7 : c.priority === 'MEDIUM' ? 5.5 : 4.5;
                  return (
                    <g key={c.case_id} onClick={() => handleClick(c.case_id)} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(c.case_id); }}
                      className="cursor-pointer" aria-label={`${c.case_id}: ${c.title}`}>
                      <title>{`${c.case_id} — ${c.title}`}</title>
                      {isSel && <circle cx={projection.toX(coords.lng)} cy={projection.toY(coords.lat)} r={r + 7} fill="none" stroke="var(--color-navy-700)" strokeWidth="2" />}
                      <circle cx={projection.toX(coords.lng)} cy={projection.toY(coords.lat)} r={r} fill={PRIORITY_COLOR[c.priority] ?? '#78716c'} stroke="#fff" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex flex-col items-center px-4 py-16 text-center">
                <MapPin size={22} className="text-navy-300" aria-hidden="true" />
                <p className="subtitle mt-2 max-w-sm">
                  No report includes usable coordinates yet. Cases submitted with a device location will appear here.
                </p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-navy-600">
                <span className="flex items-center gap-1.5"><span className="dot bg-red-600" aria-hidden="true" /> Critical</span>
                <span className="flex items-center gap-1.5"><span className="dot bg-amber-500" aria-hidden="true" /> High</span>
                <span className="flex items-center gap-1.5"><span className="dot bg-sky-500" aria-hidden="true" /> Medium</span>
                <span className="flex items-center gap-1.5"><span className="dot bg-stone-400" aria-hidden="true" /> Low</span>
              </div>
              <p className="meta">Marker size reflects priority. Colour reflects priority.</p>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          {selected ? (
            <Panel title="Selected report" subtitle={selected.case_id}>
              <div className="flex flex-wrap gap-2">
                <CategoryBadge category={selected.category} size="sm" />
                <PriorityBadge priority={selected.priority} size="sm" />
                <StatusBadge status={selected.status} size="sm" />
              </div>
              <h3 className="mt-3 text-[14px] font-semibold leading-snug text-navy-900">{selected.title}</h3>
              <p className="subtitle mt-1">{selected.location}</p>
              <p className="meta mt-2">Reported {timeAgo(selected.created_at)}</p>
              <button onClick={() => onSelectCase(selected.case_id)} className="btn btn-primary btn-sm mt-4 w-full">
                Open case <MoveRight size={14} aria-hidden="true" />
              </button>
            </Panel>
          ) : (
            <Panel title="How to read this" subtitle="About this view">
              <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-navy-600">
                <li>• Points show where reports were submitted from.</li>
                <li>• Marker size and colour reflect priority.</li>
                <li>• This is a schematic projection of real coordinates — not a street map.</li>
                <li>• Select a marker to preview the report, then open it from the panel.</li>
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};