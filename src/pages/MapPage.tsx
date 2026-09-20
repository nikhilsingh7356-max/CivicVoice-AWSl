import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, MapPin, MoveRight, X } from 'lucide-react';
import { CivicCase } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import {
  getCaseCoordinates,
  timeAgo,
  shortCaseId,
  CATEGORY_LABELS,
  PRIORITY_TONES,
  STATUS_TONES,
} from '../lib/format';

interface MapPageProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
}

/** Priority -> marker fill colour. Matches the existing CivicVoice priority palette. */
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#d97706',
  MEDIUM: '#0284c7',
  LOW: '#78716c',
};

/** Priority -> marker radius (screen-space px at the fitted zoom). */
const PRIORITY_RADIUS: Record<string, number> = {
  CRITICAL: 9,
  HIGH: 8,
  MEDIUM: 6,
  LOW: 5,
};

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Neutral default view used only when no case has usable coordinates. */
const DEFAULT_CENTER: L.LatLngExpression = [25.4358, 81.8463];
const DEFAULT_ZOOM = 13;

/** Cap fitted zoom so a single marker does not zoom to street level uncontrolled. */
const MAX_FIT_ZOOM = 16;

/** True only for finite, in-range geographic coordinates (lat/lng not reversed/NaN). */
function isUsableCoordinate(c: { lat: number; lng: number } | null): c is { lat: number; lng: number } {
  return Boolean(
    c &&
      Number.isFinite(c.lat) &&
      Number.isFinite(c.lng) &&
      c.lat >= -90 &&
      c.lat <= 90 &&
      c.lng >= -180 &&
      c.lng <= 180
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface Plotted {
  c: CivicCase;
  lat: number;
  lng: number;
}

export const MapPage: React.FC<MapPageProps> = ({ cases, onSelectCase }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tileWarning, setTileWarning] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onSelectCaseRef = useRef(onSelectCase);
  onSelectCaseRef.current = onSelectCase;

  /** Real backend coordinates only — never invented. Invalid cases are excluded. */
  const plotted = useMemo<Plotted[]>(() => {
    const out: Plotted[] = [];
    for (const c of cases) {
      const coords = getCaseCoordinates(c);
      if (isUsableCoordinate(coords)) out.push({ c, lat: coords.lat, lng: coords.lng });
    }
    return out;
  }, [cases]);

  const unplotted = cases.length - plotted.length;

  // Created once per mount; destroyed on unmount. No duplicate maps/instances.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: true,
    });
    mapRef.current = map;

    const tiles = L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 });
    let tileErrors = 0;
    const onTileError = () => {
      tileErrors += 1;
      setTileWarning(
        `Map tiles are having trouble loading (${tileErrors} request${tileErrors === 1 ? '' : 's'} failed). ` +
          'They should retry automatically — the case list is not affected.'
      );
    };
    const onTilesLoaded = () => {
      if (tileErrors) setTileWarning(null);
    };
    tiles.on('tileerror', onTileError);
    tiles.on('load', onTilesLoaded);
    tiles.addTo(map);

    markersRef.current = L.layerGroup().addTo(map);

    const wirePopupOpenCase = () => {
      const btn = el.querySelector<HTMLButtonElement>('.cv-map-open-case');
      if (btn && btn.dataset.caseId) {
        const id = btn.dataset.caseId;
        btn.onclick = () => onSelectCaseRef.current(id);
      }
    };
    map.on('popupopen', wirePopupOpenCase);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    const raf = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(raf);
      map.off('popupopen', wirePopupOpenCase);
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Rebuild markers when coordinates change; refit to keep cases in view.
  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    for (const p of plotted) {
      const { c, lat, lng } = p;
      const color = PRIORITY_COLOR[c.priority] ?? '#78716c';
      const marker = L.circleMarker([lat, lng], {
        radius: PRIORITY_RADIUS[c.priority] ?? 6,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.95,
      });

      const categoryLabel = CATEGORY_LABELS[c.category] ?? c.category;
      const priorityLabel = PRIORITY_TONES[c.priority]?.label ?? c.priority;
      const statusLabel = STATUS_TONES[c.status]?.label ?? c.status;
      const location = String(c.location || 'Location not shared');

      marker.bindPopup(
        `<div>
           <div class="cv-map-popup-title">${escapeHtml(c.title || c.case_id)}</div>
           <p class="cv-map-popup-meta">${escapeHtml(shortCaseId(c.case_id))} &middot; ${escapeHtml(categoryLabel)}</p>
           <p class="cv-map-popup-line"><span class="cv-map-dot" style="background:${color}"></span>${escapeHtml(priorityLabel)} &middot; ${escapeHtml(statusLabel)}</p>
           <p class="cv-map-popup-meta">${escapeHtml(location)}</p>
           <p class="cv-map-popup-meta">Reported ${escapeHtml(timeAgo(c.created_at))}</p>
           <button type="button" class="btn btn-secondary btn-sm mt-2 w-full cv-map-open-case" data-case-id="${c.case_id}">Open case</button>
         </div>`
      );
      marker.on('click', () =>
        setSelectedId((prev) => (prev === c.case_id ? null : c.case_id))
      );
      marker.addTo(group);
    }

    if (plotted.length > 0) {
      map.fitBounds(
        L.latLngBounds(plotted.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [48, 48], maxZoom: MAX_FIT_ZOOM }
      );
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    // Recompute layout now the container is sized (guard against unmount).
    window.setTimeout(() => {
      if (mapRef.current === map) map.invalidateSize();
    }, 0);
  }, [plotted]);

  const selected = plotted.find((p) => p.c.case_id === selectedId)?.c;

  return (
    <div>
      <PageHeader
        eyebrow="Geographic view"
        title="Map of reports"
        description="Reported locations plotted against real OpenStreetMap tiles using the coordinates captured when each case was filed."
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
            <div className="cv-map relative z-0 h-[420px] w-full overflow-hidden rounded-lg border border-cv-line sm:h-[480px]">
              <div
                ref={containerRef}
                className="h-full w-full"
                role="application"
                aria-label="Map of reported civic cases"
              />
              {plotted.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
                  <div className="max-w-sm rounded-lg border border-cv-line bg-cv-surface/95 p-4 text-center shadow-cv-2">
                    <MapPin size={20} className="mx-auto text-navy-300" aria-hidden="true" />
                    <p className="subtitle mt-2">
                      No report includes usable coordinates yet. Cases submitted with a device
                      location will appear here.
                    </p>
                  </div>
                </div>
              )}
              {tileWarning && (
                <div className="absolute bottom-8 left-1/2 z-[500] w-[min(90%,360px)] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] leading-snug text-amber-900 shadow-cv-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{tileWarning}</span>
                    <button
                      onClick={() => setTileWarning(null)}
                      className="ml-auto shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-100"
                      aria-label="Dismiss tile warning"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-navy-600">
                <span className="flex items-center gap-1.5"><span className="dot bg-red-600" aria-hidden="true" /> Critical</span>
                <span className="flex items-center gap-1.5"><span className="dot bg-amber-500" aria-hidden="true" /> High</span>
                <span className="flex items-center gap-1.5"><span className="dot bg-sky-500" aria-hidden="true" /> Medium</span>
                <span className="flex items-center gap-1.5"><span className="dot bg-stone-400" aria-hidden="true" /> Low</span>
              </div>
              <p className="meta">Marker colour reflects priority. Select a marker for details.</p>
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
                <li>• Points sit at the geographic coordinates captured when each report was filed.</li>
                <li>• Marker colour reflects priority; size reflects urgency.</li>
                <li>• Select a marker to preview the report, then open it from the panel.</li>
                <li>• Map tiles are provided by OpenStreetMap contributors.</li>
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};