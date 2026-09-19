import { CivicCase } from '../types';

export interface RecentCaseRef {
  case_id: string;
  title: string;
  category: CivicCase['category'];
  priority: CivicCase['priority'];
  status: CivicCase['status'];
  department: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_cases: number;
  open_cases: number;
  resolved_cases: number;
  high_priority: number;
  critical_priority: number;
  by_category: Record<string, number>;
  by_department: Record<string, number>;
  by_status: Record<string, number>;
  recent_cases: RecentCaseRef[];
}

export interface CaseHotspot {
  latitude: number;
  longitude: number;
  case_count: number;
  dominant_category: string;
}

export interface HotspotResult {
  hotspots: CaseHotspot[];
  generated_at: string;
  radius_km: number;
  total_cases: number;
  geocoded_cases: number;
  excluded_cases: number;
  note: string;
}

const EARTH_KM_PER_DEGREE = 111;

export function isUsableCoordinates(caseData: CivicCase | Partial<CivicCase>): boolean {
  const coords = caseData.coordinates;
  return (
    !!coords &&
    typeof coords.lat === 'number' &&
    Number.isFinite(coords.lat) &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    typeof coords.lng === 'number' &&
    Number.isFinite(coords.lng) &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

export function computeAnalyticsSummary(cases: CivicCase[] | Partial<CivicCase>[]): AnalyticsSummary {
  const byCategory: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  let resolvedCases = 0;
  let highPriority = 0;
  let criticalPriority = 0;

  for (const caseData of cases) {
    const category = caseData.category;
    const department = caseData.department;
    const status = caseData.status;
    const priority = caseData.priority;

    if (category) byCategory[category] = (byCategory[category] || 0) + 1;
    if (department) byDepartment[department] = (byDepartment[department] || 0) + 1;
    if (status) {
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (status === 'RESOLVED' || status === 'CLOSED') resolvedCases += 1;
    }
    if (priority === 'HIGH') highPriority += 1;
    if (priority === 'CRITICAL') criticalPriority += 1;
  }

  const recent = [...cases]
    .filter((c) => !!c.case_id)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 10)
    .map((c) => ({
      case_id: c.case_id as string,
      title: c.title || 'Untitled case',
      category: c.category || 'OTHER',
      priority: c.priority || 'MEDIUM',
      status: c.status || 'CREATED',
      department: c.department || 'Unassigned',
      created_at: c.created_at || '',
    }));

  return {
    total_cases: cases.length,
    open_cases: cases.length - resolvedCases,
    resolved_cases: resolvedCases,
    high_priority: highPriority,
    critical_priority: criticalPriority,
    by_category: byCategory,
    by_department: byDepartment,
    by_status: byStatus,
    recent_cases: recent,
  };
}

/**
 * Groups citizen-reported cases into local-area concentration cells.
 *
 * Cells are a simple latitude/longitude grid sized from the requested radius
 * (default 2 km). Centroids are the average of the ACTUAL citizen-reported
 * coordinates inside each cell — no location is ever invented. The result is
 * labelled as "reported case concentration" and never as a prediction.
 */
export function computeHotspots(
  cases: CivicCase[] | Partial<CivicCase>[],
  options: { radiusKm?: number; maxCells?: number } = {},
): HotspotResult {
  const radiusKm = Math.min(Math.max(options.radiusKm ?? 2, 0.5), 25);
  const maxCells = options.maxCells ?? 20;
  const generatedAt = new Date().toISOString();

  const usable = cases.filter(isUsableCoordinates) as CivicCase[] &
    { coordinates: { lat: number; lng: number } }[];

  let referenceLat = 0;
  for (const caseData of usable) {
    referenceLat += caseData.coordinates.lat;
  }
  referenceLat = usable.length ? referenceLat / usable.length : 20;

  const latStep = radiusKm / EARTH_KM_PER_DEGREE;
  const lngStep = radiusKm / (EARTH_KM_PER_DEGREE * ((Math.PI / 180) * Math.max(Math.abs(referenceLat), 1)));

  const cells = new Map<string, { latSum: number; lngSum: number; counts: CivicCase[] }>();

  for (const caseData of usable) {
    const key = `${Math.round(caseData.coordinates.lat / latStep)}:${Math.round(caseData.coordinates.lng / lngStep)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.latSum += caseData.coordinates.lat;
      existing.lngSum += caseData.coordinates.lng;
      existing.counts.push(caseData as CivicCase);
    } else {
      cells.set(key, {
        latSum: caseData.coordinates.lat,
        lngSum: caseData.coordinates.lng,
        counts: [caseData as CivicCase],
      });
    }
  }

  const categoryCounts = (list: CivicCase[]): string => {
    const freq: Record<string, number> = {};
    for (const item of list) {
      if (item.category) freq[item.category] = (freq[item.category] || 0) + 1;
    }
    return Object.keys(freq).sort((a, b) => (freq[b] - freq[a]) || a.localeCompare(b))[0] || 'OTHER';
  };

  const hotspots: CaseHotspot[] = Array.from(cells.entries()).map(([key, cell]) => ({
    latitude: Number((cell.latSum / cell.counts.length).toFixed(6)),
    longitude: Number((cell.lngSum / cell.counts.length).toFixed(6)),
    case_count: cell.counts.length,
    dominant_category: categoryCounts(cell.counts),
  }));

  hotspots.sort((a, b) => b.case_count - a.case_count);

  return {
    hotspots: hotspots.slice(0, maxCells),
    generated_at: generatedAt,
    radius_km: radiusKm,
    total_cases: cases.length,
    geocoded_cases: usable.length,
    excluded_cases: cases.length - usable.length,
    note: 'Reported case concentration based on citizen-reported coordinates. It reflects where reports have been filed, not a prediction of future incidents.',
  };
}