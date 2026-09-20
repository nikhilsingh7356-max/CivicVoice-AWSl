import {
  CaseStatus,
  CivicCategory,
  CivicCoordinates,
  CivicPriority,
} from '../types';

export const STATUS_ORDER: CaseStatus[] = [
  'CREATED',
  'AI_TRIAGED',
  'ASSIGNED',
  'FIELD_VERIFICATION',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

export const PRIORITY_ORDER: CivicPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface Tone {
  label: string;
  dot: string;
  badge: string;
  bar: string;
}

/* Per-status tone: calm, muted but unambiguous. */
export const STATUS_TONES: Record<CaseStatus, Tone> = {
  CREATED: {
    label: 'Created',
    dot: 'bg-stone-400',
    badge: 'bg-stone-100 text-stone-600 border-stone-300',
    bar: 'bg-stone-400',
  },
  AI_TRIAGED: {
    label: 'AI triaged',
    dot: 'bg-pine-500',
    badge: 'bg-pine-50 text-pine-700 border-pine-200',
    bar: 'bg-pine-500',
  },
  ASSIGNED: {
    label: 'Assigned',
    dot: 'bg-sky-600',
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    bar: 'bg-sky-600',
  },
  FIELD_VERIFICATION: {
    label: 'Field verification',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    bar: 'bg-indigo-500',
  },
  IN_PROGRESS: {
    label: 'In progress',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    bar: 'bg-amber-500',
  },
  RESOLVED: {
    label: 'Resolved',
    dot: 'bg-emerald-600',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-600',
  },
  CLOSED: {
    label: 'Closed',
    dot: 'bg-stone-500',
    badge: 'bg-stone-100 text-stone-600 border-stone-300',
    bar: 'bg-stone-500',
  },
};

export const PRIORITY_TONES: Record<CivicPriority, Tone> = {
  LOW: { label: 'Low', dot: 'bg-stone-400', badge: 'bg-stone-100 text-stone-600 border-stone-300', bar: 'bg-stone-400' },
  MEDIUM: { label: 'Medium', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-800 border-sky-200', bar: 'bg-sky-500' },
  HIGH: { label: 'High', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-200', bar: 'bg-amber-500' },
  CRITICAL: { label: 'Critical', dot: 'bg-red-600', badge: 'bg-red-50 text-red-800 border-red-200', bar: 'bg-red-600' },
};

export const CATEGORY_LABELS: Record<CivicCategory, string> = {
  ROADS: 'Roads & Potholes',
  WASTE: 'Waste & Garbage',
  WATER: 'Water Supply',
  ELECTRICITY: 'Electricity',
  SANITATION: 'Public Sanitation',
  STREETLIGHT: 'Street Lighting',
  PUBLIC_SAFETY: 'Public Safety',
  TRAFFIC: 'Traffic & Transport',
  DRAINAGE: 'Drainage & Flooding',
  PUBLIC_PROPERTY: 'Public Property',
  ENVIRONMENT: 'Environment',
  OTHER: 'Other',
};

export const CATEGORY_TONES: Record<CivicCategory, string> = {
  ROADS: 'bg-[#274252]',
  WASTE: 'bg-[#7c5c2e]',
  WATER: 'bg-[#1d5c85]',
  ELECTRICITY: 'bg-[#8a5a17]',
  SANITATION: 'bg-[#4f6b36]',
  STREETLIGHT: 'bg-[#5c5485]',
  PUBLIC_SAFETY: 'bg-[#8f2f2f]',
  TRAFFIC: 'bg-[#36625e]',
  DRAINAGE: 'bg-[#2e5f6b]',
  PUBLIC_PROPERTY: 'bg-[#6b5440]',
  ENVIRONMENT: 'bg-[#3d6b3d]',
  OTHER: 'bg-[#616161]',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function clampSeverity(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value)));
}

export function severityLabel(score: number): string {
  const s = clampSeverity(score);
  if (s >= 8) return 'Severe';
  if (s >= 6) return 'Notable';
  if (s >= 4) return 'Moderate';
  return 'Minor';
}

export function severityTone(score: number): string {
  const s = clampSeverity(score);
  if (s >= 8) return 'bg-red-600';
  if (s >= 6) return 'bg-amber-500';
  if (s >= 4) return 'bg-sky-500';
  return 'bg-stone-400';
}

export function initials(name?: string | null): string {
  if (!name) return 'CV';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function shortCaseId(id: string): string {
  const parts = id.split('-');
  return parts.length >= 3 ? parts.slice(-3).join('-') : id;
}

/** Extract usable coordinates from a case (supports {lat,lng} and {latitude,longitude}). */
export function getCaseCoordinates(c: {
  coordinates?: CivicCoordinates | null;
  latitude?: number;
  longitude?: number;
}): { lat: number; lng: number } | null {
  const coords = c.coordinates;
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    return { lat: coords.lat, lng: coords.lng };
  }
  const lat = (coords as { latitude?: number } | undefined)?.latitude;
  const lng = (coords as { longitude?: number } | undefined)?.longitude;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
}

export function isOpenStatus(status: CaseStatus): boolean {
  return status !== 'RESOLVED' && status !== 'CLOSED';
}

export function statusCounts(cases: { status: CaseStatus }[]) {
  return STATUS_ORDER.map((status) => ({
    status,
    count: cases.filter((c) => c.status === status).length,
  }));
}