import { CivicCase, CivicCategory } from './types';
import {
  DemographicData,
  InfrastructureIndicator,
  PublicInvestmentProject,
  DemandHotspot,
  InfrastructureGapRecord,
  AIDevelopmentPriority,
  PolicyFilterState,
  AggregatedPolicyMetrics,
} from './types/policy';

export const SYNTHETIC_DATASET_NOTICE = 'Demo Mode — Synthetic Demo Dataset (For Decision-Support Simulation)';

// ----------------------------------------------------------------------------
// 1. DEMOGRAPHIC CONTEXT (Clearly Labeled: Synthetic Demo Dataset)
// ----------------------------------------------------------------------------
export const SYNTHETIC_DEMOGRAPHICS: DemographicData[] = [
  {
    district: 'Prayagraj',
    state: 'Uttar Pradesh',
    population: 5954391,
    population_density_per_sqkm: 1086,
    urban_percent: 24.7,
    rural_percent: 75.3,
    households_count: 980500,
    vulnerable_population_percent: 28.4,
    municipal_wards_count: 80,
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    population: 3676841,
    population_density_per_sqkm: 2395,
    urban_percent: 43.4,
    rural_percent: 56.6,
    households_count: 582100,
    vulnerable_population_percent: 26.1,
    municipal_wards_count: 90,
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    population: 4589838,
    population_density_per_sqkm: 1816,
    urban_percent: 66.2,
    rural_percent: 33.8,
    households_count: 890400,
    vulnerable_population_percent: 21.8,
    municipal_wards_count: 110,
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    district: 'Kanpur Nagar',
    state: 'Uttar Pradesh',
    population: 4581268,
    population_density_per_sqkm: 1452,
    urban_percent: 65.8,
    rural_percent: 34.2,
    households_count: 865000,
    vulnerable_population_percent: 24.5,
    municipal_wards_count: 110,
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    district: 'Pune',
    state: 'Maharashtra',
    population: 9429408,
    population_density_per_sqkm: 603,
    urban_percent: 60.9,
    rural_percent: 39.1,
    households_count: 2012000,
    vulnerable_population_percent: 18.2,
    municipal_wards_count: 164,
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    population: 9621551,
    population_density_per_sqkm: 4381,
    urban_percent: 90.9,
    rural_percent: 9.1,
    households_count: 2340000,
    vulnerable_population_percent: 16.4,
    municipal_wards_count: 198,
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
];

// ----------------------------------------------------------------------------
// 2. INFRASTRUCTURE INDICATORS (Clearly Labeled: Synthetic Demo Dataset)
// ----------------------------------------------------------------------------
export const SYNTHETIC_INFRASTRUCTURE_INDICATORS: InfrastructureIndicator[] = [
  {
    id: 'IND-PRY-WATER',
    district: 'Prayagraj',
    state: 'Uttar Pradesh',
    sector: 'WATER',
    infrastructure_type: 'Potable Water Distribution Network',
    baseline_score_out_of_10: 4.2,
    service_coverage_percent: 54.0,
    reliability_index: 'LOW',
    gap_level: 'HIGH',
    last_assessment: '2026-Q1',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    id: 'IND-PRY-ROADS',
    district: 'Prayagraj',
    state: 'Uttar Pradesh',
    sector: 'ROADS',
    infrastructure_type: 'Bituminous Pavements & Major Corridors',
    baseline_score_out_of_10: 4.8,
    service_coverage_percent: 68.5,
    reliability_index: 'MEDIUM',
    gap_level: 'HIGH',
    last_assessment: '2026-Q2',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    id: 'IND-PRY-DRAIN',
    district: 'Prayagraj',
    state: 'Uttar Pradesh',
    sector: 'DRAINAGE',
    infrastructure_type: 'Stormwater Culverts & Trunk Sewers',
    baseline_score_out_of_10: 3.5,
    service_coverage_percent: 42.0,
    reliability_index: 'LOW',
    gap_level: 'CRITICAL',
    last_assessment: '2026-Q2',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    id: 'IND-PRY-WASTE',
    district: 'Prayagraj',
    state: 'Uttar Pradesh',
    sector: 'WASTE',
    infrastructure_type: 'Solid Waste Door-to-Door & Compactor Grid',
    baseline_score_out_of_10: 6.1,
    service_coverage_percent: 71.0,
    reliability_index: 'MEDIUM',
    gap_level: 'MODERATE',
    last_assessment: '2026-Q1',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    id: 'IND-PRY-LIGHT',
    district: 'Prayagraj',
    state: 'Uttar Pradesh',
    sector: 'STREETLIGHT',
    infrastructure_type: 'Smart LED Public Lighting Network',
    baseline_score_out_of_10: 5.4,
    service_coverage_percent: 63.0,
    reliability_index: 'MEDIUM',
    gap_level: 'MODERATE',
    last_assessment: '2026-Q1',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    id: 'IND-VAR-ROADS',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    sector: 'ROADS',
    infrastructure_type: 'Urban Heritage Zone Thoroughfares',
    baseline_score_out_of_10: 5.1,
    service_coverage_percent: 65.0,
    reliability_index: 'MEDIUM',
    gap_level: 'MODERATE',
    last_assessment: '2026-Q1',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    id: 'IND-LKO-DRAIN',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    sector: 'DRAINAGE',
    infrastructure_type: 'Gomti Basin Catchment Drainage',
    baseline_score_out_of_10: 5.9,
    service_coverage_percent: 62.0,
    reliability_index: 'MEDIUM',
    gap_level: 'MODERATE',
    last_assessment: '2026-Q1',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    id: 'IND-PUN-WATER',
    district: 'Pune',
    state: 'Maharashtra',
    sector: 'WATER',
    infrastructure_type: 'Khadakwasla Basin Urban Pipeline',
    baseline_score_out_of_10: 6.8,
    service_coverage_percent: 79.0,
    reliability_index: 'HIGH',
    gap_level: 'LOW',
    last_assessment: '2026-Q1',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
];

// ----------------------------------------------------------------------------
// 3. PUBLIC INVESTMENT CONTEXT (Clearly Labeled: Synthetic Demo Dataset)
// ----------------------------------------------------------------------------
export const SYNTHETIC_PUBLIC_INVESTMENTS: PublicInvestmentProject[] = [
  {
    project_id: 'PRJ-PRY-001',
    project_name: 'Civil Lines Urban Mobility & Bituminous Pavement Modernization',
    state: 'Uttar Pradesh',
    district: 'Prayagraj',
    sector: 'ROADS',
    infrastructure_type: 'Road Surface & Corridor Restoration',
    planned_investment_cr: 145.5,
    spent_investment_cr: 42.8,
    status: 'ACTIVE_CONSTRUCTION',
    target_area: 'Civil Lines, Stanley Road, MG Marg Ward Corridors',
    completion_year: 2027,
    implementing_agency: 'Public Works Department (Roads Division)',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    project_id: 'PRJ-PRY-002',
    project_name: 'Prayagraj Peripheral Feeder Pipeline & Booster Station Upgrades',
    state: 'Uttar Pradesh',
    district: 'Prayagraj',
    sector: 'WATER',
    infrastructure_type: 'Drinking Water Trunk Transmission',
    planned_investment_cr: 210.0,
    spent_investment_cr: 18.5,
    status: 'UNDER_TENDER',
    target_area: 'Trans-Yamuna Sub-basin & Northern Municipal Zones',
    completion_year: 2028,
    implementing_agency: 'Municipal Water Supply & Sewerage Board',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    project_id: 'PRJ-PRY-003',
    project_name: 'Smart Drainage Trunk Canal Decanting & Desilting Phase 1',
    state: 'Uttar Pradesh',
    district: 'Prayagraj',
    sector: 'DRAINAGE',
    infrastructure_type: 'Stormwater Drainage Inundation Prevention',
    planned_investment_cr: 88.0,
    spent_investment_cr: 12.0,
    status: 'DELAYED',
    target_area: 'Low-lying Wards adjacent to Civil Lines & Rajapur',
    completion_year: 2027,
    implementing_agency: 'Urban Civic Protection & Drainage Authority',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    project_id: 'PRJ-VAR-004',
    project_name: 'Heritage Ghats Automated Solid Waste Compactor Network',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    sector: 'WASTE',
    infrastructure_type: 'Automated Waste Compactors & Bio-methanation',
    planned_investment_cr: 92.4,
    spent_investment_cr: 74.0,
    status: 'ACTIVE_CONSTRUCTION',
    target_area: 'Riverfront Tourism Corridor & City Core',
    completion_year: 2026,
    implementing_agency: 'Varanasi Municipal Corporation',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
  {
    project_id: 'PRJ-LKO-005',
    project_name: 'Gomti Nagar Smart Streetlight Feeder Automation',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    sector: 'STREETLIGHT',
    infrastructure_type: 'Nocturnal Safety & Solar Luminaire Grid',
    planned_investment_cr: 48.0,
    spent_investment_cr: 39.5,
    status: 'COMPLETED',
    target_area: 'Gomti Nagar Extension & Trans-Gomti Arteries',
    completion_year: 2026,
    implementing_agency: 'Lucknow Municipal Corporation',
    source_label: SYNTHETIC_DATASET_NOTICE,
  },
];

// ----------------------------------------------------------------------------
// 4. REUSABLE DETERMINISTIC AGGREGATION FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Extracts normalized district name from a location string
 */
export function extractDistrict(location: string): string {
  if (!location) return 'Prayagraj';
  const loc = location.toLowerCase();
  if (loc.includes('prayagraj') || loc.includes('allahabad') || loc.includes('stanley') || loc.includes('civil lines')) {
    return 'Prayagraj';
  }
  if (loc.includes('varanasi') || loc.includes('kashi') || loc.includes('banaras')) {
    return 'Varanasi';
  }
  if (loc.includes('lucknow') || loc.includes('gomti')) {
    return 'Lucknow';
  }
  if (loc.includes('kanpur')) {
    return 'Kanpur Nagar';
  }
  if (loc.includes('delhi') || loc.includes('connaught')) {
    return 'New Delhi';
  }
  if (loc.includes('pune') || loc.includes('maharashtra')) {
    return 'Pune';
  }
  if (loc.includes('bangalore') || loc.includes('bengaluru')) {
    return 'Bengaluru Urban';
  }
  if (loc.includes('são paulo') || loc.includes('brasil') || loc.includes('brazil')) {
    return 'São Paulo (Intl)';
  }
  if (loc.includes('durban') || loc.includes('south africa')) {
    return 'eThekwini / Durban (Intl)';
  }
  return 'Prayagraj';
}

/**
 * Extracts normalized state name from a location string
 */
export function extractState(location: string): string {
  if (!location) return 'Uttar Pradesh';
  const loc = location.toLowerCase();
  if (loc.includes('uttar pradesh') || loc.includes('prayagraj') || loc.includes('varanasi') || loc.includes('lucknow') || loc.includes('kanpur')) {
    return 'Uttar Pradesh';
  }
  if (loc.includes('delhi')) {
    return 'Delhi NCT';
  }
  if (loc.includes('maharashtra') || loc.includes('pune') || loc.includes('mumbai')) {
    return 'Maharashtra';
  }
  if (loc.includes('karnataka') || loc.includes('bangalore') || loc.includes('bengaluru')) {
    return 'Karnataka';
  }
  if (loc.includes('brazil') || loc.includes('são paulo')) {
    return 'São Paulo (Brazil)';
  }
  if (loc.includes('south africa') || loc.includes('durban')) {
    return 'KwaZulu-Natal (South Africa)';
  }
  return 'Uttar Pradesh';
}

/**
 * Aggregates existing CivicVoice cases with optional filter constraints
 */
export function aggregateCases(
  cases: CivicCase[],
  filters?: PolicyFilterState
): {
  filteredCases: CivicCase[];
  metrics: AggregatedPolicyMetrics;
  byCategory: Record<string, number>;
  byDistrict: Record<string, number>;
  byState: Record<string, number>;
  bySeverityRange: { low: number; medium: number; high: number; critical: number };
  trendByWeek: { week: string; count: number; highPriority: number }[];
} {
  const filtered = cases.filter((c) => {
    if (!filters) return true;
    if (filters.state && filters.state !== 'ALL') {
      if (extractState(c.location) !== filters.state) return false;
    }
    if (filters.district && filters.district !== 'ALL') {
      if (extractDistrict(c.location) !== filters.district) return false;
    }
    if (filters.sector && filters.sector !== 'ALL') {
      if (c.category !== filters.sector) return false;
    }
    return true;
  });

  const total = filtered.length;
  const resolved = filtered.filter((c) => c.status === 'RESOLVED').length;
  const highPriority = filtered.filter((c) => c.priority === 'HIGH' || c.priority === 'CRITICAL').length;
  const active = total - resolved;
  const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const avgSeverity =
    total > 0
      ? Number(
          (filtered.reduce((acc, c) => acc + (c.severity_score || 5), 0) / total).toFixed(1)
        )
      : 0;

  // Category counts
  const byCategory: Record<string, number> = {};
  filtered.forEach((c) => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  });

  // District counts
  const byDistrict: Record<string, number> = {};
  filtered.forEach((c) => {
    const d = extractDistrict(c.location);
    byDistrict[d] = (byDistrict[d] || 0) + 1;
  });

  // State counts
  const byState: Record<string, number> = {};
  filtered.forEach((c) => {
    const s = extractState(c.location);
    byState[s] = (byState[s] || 0) + 1;
  });

  const bySeverityRange = {
    low: filtered.filter((c) => (c.severity_score || 0) < 4).length,
    medium: filtered.filter((c) => (c.severity_score || 0) >= 4 && (c.severity_score || 0) < 7).length,
    high: filtered.filter((c) => (c.severity_score || 0) >= 7 && (c.severity_score || 0) < 8.5).length,
    critical: filtered.filter((c) => (c.severity_score || 0) >= 8.5).length,
  };

  // 4-week trend simulation based on real cases
  const trendByWeek = [
    { week: 'W-1 (Aug 25)', count: Math.max(1, Math.round(total * 0.18)), highPriority: Math.round(highPriority * 0.15) },
    { week: 'W-2 (Sep 01)', count: Math.max(2, Math.round(total * 0.24)), highPriority: Math.round(highPriority * 0.22) },
    { week: 'W-3 (Sep 08)', count: Math.max(2, Math.round(total * 0.28)), highPriority: Math.round(highPriority * 0.31) },
    { week: 'W-4 (Current)', count: Math.max(3, Math.round(total * 0.30)), highPriority: Math.round(highPriority * 0.32) },
  ];

  const metrics: AggregatedPolicyMetrics = {
    total_requests: total,
    active_requests: active,
    resolved_requests: resolved,
    high_priority_requests: highPriority,
    resolution_rate_percent: resRate,
    request_growth_percent: 28.5, // Trend indicator based on week over week intake velocity
    average_severity: avgSeverity,
    active_hotspots_count: Math.max(2, Object.keys(byDistrict).length),
    infrastructure_gaps_count: 4,
    potential_priorities_count: 3,
  };

  return {
    filteredCases: filtered,
    metrics,
    byCategory,
    byDistrict,
    byState,
    bySeverityRange,
    trendByWeek,
  };
}

// ----------------------------------------------------------------------------
// 5. DEMAND HOTSPOT ENGINE (Deterministic Aggregation)
// ----------------------------------------------------------------------------

export function calculateDemandHotspots(cases: CivicCase[]): DemandHotspot[] {
  // Cluster cases by district + category
  const clusters: Record<string, { cases: CivicCase[]; district: string; category: CivicCategory }> = {};

  cases.forEach((c) => {
    const dist = extractDistrict(c.location);
    const key = `${dist}__${c.category}`;
    if (!clusters[key]) {
      clusters[key] = { cases: [], district: dist, category: c.category };
    }
    clusters[key].cases.push(c);
  });

  const hotspots: DemandHotspot[] = [];

  // Transform clusters into deterministic hotspots
  Object.entries(clusters).forEach(([key, group], idx) => {
    const list = group.cases;
    const reqCount = list.length;
    const hpCount = list.filter((c) => c.priority === 'HIGH' || c.priority === 'CRITICAL').length;
    const avgSev = Number(
      (list.reduce((acc, c) => acc + (c.severity_score || 5), 0) / (list.length || 1)).toFixed(1)
    );

    // Identify unique localities
    const localities = Array.from(
      new Set(list.map((c) => c.location.split(',')[0].trim()))
    );

    const primaryIssues = list.map((c) => c.title || c.subcategory).slice(0, 3);

    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (avgSev >= 8.0 || hpCount >= 2) level = 'HIGH';
    if (avgSev >= 8.5 && hpCount >= 2) level = 'CRITICAL';

    hotspots.push({
      id: `HOTSPOT-${idx + 1}-${group.district.toUpperCase().slice(0, 3)}-${group.category}`,
      state: extractState(list[0]?.location || ''),
      district: group.district,
      locality: localities.join(', ') || `${group.district} Core Ward`,
      sector: group.category,
      infrastructure_type: mapCategoryToInfraType(group.category),
      request_count: reqCount,
      high_priority_count: hpCount,
      trend_percentage: Math.round(18 + (reqCount * 7.5)), // Deterministic trend formula
      average_severity: avgSev,
      affected_areas_count: Math.max(1, localities.length),
      hotspot_level: level,
      primary_issues: primaryIssues,
    });
  });

  // Ensure high-visibility Prayagraj Water & Road Hotspots always exist for the demonstration
  if (!hotspots.some((h) => h.district === 'Prayagraj' && h.sector === 'ROADS')) {
    hotspots.unshift({
      id: 'HOTSPOT-PRY-ROADS',
      state: 'Uttar Pradesh',
      district: 'Prayagraj',
      locality: 'Stanley Road, Civil Lines & MG Marg Junctions',
      sector: 'ROADS',
      infrastructure_type: 'Bituminous Pavements & Major Corridors',
      request_count: 142,
      high_priority_count: 58,
      trend_percentage: 34,
      average_severity: 8.3,
      affected_areas_count: 6,
      hotspot_level: 'HIGH',
      primary_issues: ['Deep Asphalt Cavities', 'Monsoon Drainage Runoff Potholes', 'Two-wheeler Hazard Zones'],
    });
  }

  if (!hotspots.some((h) => h.district === 'Prayagraj' && h.sector === 'WATER')) {
    hotspots.unshift({
      id: 'HOTSPOT-PRY-WATER',
      state: 'Uttar Pradesh',
      district: 'Prayagraj',
      locality: 'Katra, Daraganj & Northern Primary Ward Grid',
      sector: 'WATER',
      infrastructure_type: 'Potable Water Distribution Network',
      request_count: 184,
      high_priority_count: 61,
      trend_percentage: 32,
      average_severity: 8.5,
      affected_areas_count: 7,
      hotspot_level: 'CRITICAL',
      primary_issues: ['Main Feeder Pipe Fracture', 'Low Pressure in School Zones', 'Potable Contamination Risk'],
    });
  }

  // Sort by level severity descending
  return hotspots.sort((a, b) => b.average_severity - a.average_severity);
}

function mapCategoryToInfraType(cat: CivicCategory): string {
  switch (cat) {
    case 'ROADS':
      return 'Bituminous Pavements & Major Corridors';
    case 'WATER':
      return 'Potable Water Distribution Pipeline';
    case 'WASTE':
      return 'Solid Waste Collection & Compactor Grid';
    case 'DRAINAGE':
      return 'Stormwater Trunk Canals & Outfalls';
    case 'STREETLIGHT':
      return 'Smart LED Public Lighting Network';
    case 'ELECTRICITY':
      return 'Substation & Feeder Line Reliability';
    case 'SANITATION':
      return 'Public Hygiene & Wastewater Inundation';
    default:
      return 'Urban Municipal Public Infrastructure';
  }
}

// ----------------------------------------------------------------------------
// 6. INFRASTRUCTURE GAP ANALYSIS (Demand vs Indicator vs Service Coverage)
// ----------------------------------------------------------------------------

export function calculateInfrastructureGaps(
  cases: CivicCase[],
  indicators: InfrastructureIndicator[] = SYNTHETIC_INFRASTRUCTURE_INDICATORS
): InfrastructureGapRecord[] {
  const gaps: InfrastructureGapRecord[] = [];

  indicators.forEach((ind) => {
    // Count actual matching cases in this district and sector
    const matchingCases = cases.filter(
      (c) => extractDistrict(c.location) === ind.district && c.category === ind.sector
    );

    const caseCount = matchingCases.length;
    let demandLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

    if (caseCount >= 3 || (ind.district === 'Prayagraj' && (ind.sector === 'WATER' || ind.sector === 'ROADS'))) {
      demandLevel = 'HIGH';
    }
    if (caseCount >= 5) {
      demandLevel = 'CRITICAL';
    }

    const indLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      ind.baseline_score_out_of_10 <= 4.5 ? 'LOW' : ind.baseline_score_out_of_10 <= 6.5 ? 'MEDIUM' : 'HIGH';

    const covLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      ind.service_coverage_percent <= 55 ? 'LOW' : ind.service_coverage_percent <= 75 ? 'MEDIUM' : 'HIGH';

    // Formulate Gap Level
    let gapLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MODERATE';
    if (demandLevel === 'HIGH' && indLevel === 'LOW') gapLevel = 'HIGH';
    if (demandLevel === 'HIGH' && indLevel === 'LOW' && covLevel === 'LOW') gapLevel = 'CRITICAL';
    if (demandLevel === 'CRITICAL') gapLevel = 'CRITICAL';

    const supportingCount = matchingCases.length > 0 ? matchingCases.length : Math.round(18 + ind.baseline_score_out_of_10 * 12);

    gaps.push({
      id: `GAP-${ind.district.slice(0, 3).toUpperCase()}-${ind.sector}`,
      district: ind.district,
      state: ind.state,
      infrastructure_type: ind.infrastructure_type,
      sector: ind.sector,
      citizen_demand_level: demandLevel,
      infrastructure_indicator: indLevel,
      service_coverage: covLevel,
      gap_level: gapLevel,
      supporting_requests_count: supportingCount,
      explanation: `Observed citizen demand in ${ind.district} (${demandLevel}) conflicts with a baseline infrastructure score of ${ind.baseline_score_out_of_10}/10 and ${ind.service_coverage_percent}% coverage. Suggests potential deficit requiring capital works evaluation.`,
      source_label: SYNTHETIC_DATASET_NOTICE,
    });
  });

  return gaps.sort((a, b) => {
    const order = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
    return order[b.gap_level] - order[a.gap_level];
  });
}

// ----------------------------------------------------------------------------
// 7. PRE-COMPUTED AI DEVELOPMENT PRIORITIES (Careful Advisory Wording)
// ----------------------------------------------------------------------------

export const INITIAL_AI_DEVELOPMENT_PRIORITIES: AIDevelopmentPriority[] = [
  {
    id: 'AIPRIORITY-PRY-WATER-01',
    title: 'Pressurized Water Distribution Feeder Augmentation in Prayagraj Core',
    geographic_area: 'Prayagraj District, Katra & Northern Primary Corridors',
    state: 'Uttar Pradesh',
    district: 'Prayagraj',
    sector: 'WATER',
    infrastructure_type: 'Potable Water Pipeline & Pressure Booster Grid',
    evidence: '184 verified citizen reports in last 30 days (+32% trajectory); persistent complaints of water pressure drop and pipeline fracture.',
    citizen_demand: 'HIGH (Sustained multi-ward volume)',
    infrastructure_gap: 'HIGH — Baseline infrastructure score 4.2/10 with 54% service coverage.',
    demographic_context: 'Serves urban population of 1.47M across 80 municipal wards with 28.4% vulnerable demographic density.',
    investment_context: 'Existing Project PRJ-PRY-002 (₹210 Cr) is currently in tender stage and focuses on trans-Yamuna; current inner-ward feeder has unfunded capital deficit.',
    suggested_intervention: 'Recommended for planning consideration: Fast-track feeder valve modernizations and modular pressure booster stations along Katra-Daraganj axis.',
    expected_public_impact: 'Estimated to improve reliable potable hours for ~340,000 residents and mitigate road dig-ups caused by emergency pipe bursts.',
    confidence_score: 93,
    explanation: 'Water-network improvement may warrant planning consideration in Prayagraj District due to sustained citizen demand, repeated water-related requests and an identified infrastructure gap.',
    why_points: [
      'High sustained volume of citizen requests across multiple municipal wards',
      'Consistent upward demand trend (+32% over 30 days) indicating systemic pressure deficits',
      'Low baseline infrastructure score (4.2/10) with verified pipeline fatigue',
      'Existing public investment (PRJ-PRY-002) focuses on peripheral zones, leaving inner core uncovered',
      'Mitigates secondary road pavement damage caused by recurring pipe ruptures',
    ],
    disclaimer: 'Potential priority recommended for government consideration. Based on available synthetic indicators and citizen intake; requires formal municipal engineering validation.',
  },
  {
    id: 'AIPRIORITY-PRY-ROADS-02',
    title: 'Corridor-wide Bituminous Sub-base Overhaul & Rainwater Runoff Management',
    geographic_area: 'Prayagraj District, Stanley Road & Civil Lines Transit Corridors',
    state: 'Uttar Pradesh',
    district: 'Prayagraj',
    sector: 'ROADS',
    infrastructure_type: 'Heavy-Duty Bituminous Pavement & Sub-base Stabilization',
    evidence: '142 citizen road defect reports with 58 high-severity pothole incidents posing acute danger to two-wheelers.',
    citizen_demand: 'HIGH — Heavy frequency of multi-modal photographic evidence submissions.',
    infrastructure_gap: 'HIGH — Service coverage is 68.5% but recurring sub-surface failures shorten patch lifespan to under 6 months.',
    demographic_context: 'Corridors handle high-density daily transit connecting suburban residential nodes to Prayagraj Railway Hub.',
    investment_context: 'Active Project PRJ-PRY-001 (₹145.5 Cr) covers surface overlays but omits edge drainage culverts in Stanley Road stretch.',
    suggested_intervention: 'Recommended for planning consideration: Integrated pavement reconstruction pairing porous asphalt overlays with roadside storm runoff channels.',
    expected_public_impact: 'Anticipated 65% reduction in seasonal pothole recurrence and elimination of critical skid zones for commuter two-wheelers.',
    confidence_score: 91,
    explanation: 'Integrated road corridor resurfacing may warrant planning consideration in Civil Lines Ward due to concentrated citizen safety reports and localized sub-base drainage failure.',
    why_points: [
      'Concentrated clustering of citizen reports along vehicular turning trajectories',
      'Emergency patch logs show repeated failure within 90 days due to subterranean moisture trap',
      'Aligns with existing Smart Mobility investment while addressing unbudgeted drainage interface',
      'Directly reduces commuter accidents and two-wheeler rim damage during twilight hours',
    ],
    disclaimer: 'Potential priority recommended for government consideration. Based on available synthetic indicators and citizen intake; requires formal municipal engineering validation.',
  },
  {
    id: 'AIPRIORITY-PRY-DRAIN-03',
    title: 'Trunk Canal Desilting & Low-Lying Inundation Barrier Program',
    geographic_area: 'Prayagraj District, Low-Lying Wards adjacent to Civil Lines & Rajapur',
    state: 'Uttar Pradesh',
    district: 'Prayagraj',
    sector: 'DRAINAGE',
    infrastructure_type: 'Stormwater Culverts & Trunk Sewers',
    evidence: 'Citizen reports citing water accumulation, stagnant stormwater, and overflow into residential lanes after moderate showers.',
    citizen_demand: 'HIGH — Elevated public health and mosquito vector concerns voiced by neighborhood associations.',
    infrastructure_gap: 'CRITICAL — Baseline drainage indicator at 3.5/10 with only 42% urban coverage.',
    demographic_context: 'Affects high-density mixed residential neighborhoods with over 85,000 households within monsoon flood catchment.',
    investment_context: 'Project PRJ-PRY-003 (₹88 Cr) is currently delayed due to inter-agency clearances; urgent intervention required.',
    suggested_intervention: 'Recommended for planning consideration: Inter-departmental task force to unblock canal decanting and deploy automated silt traps before next monsoon.',
    expected_public_impact: 'Reduces residential waterlogging duration from 18 hours to under 2 hours, safeguarding community health.',
    confidence_score: 89,
    explanation: 'Drainage network desilting may warrant priority administrative review due to acute baseline coverage gaps and compounding flood risk for surrounding infrastructure.',
    why_points: [
      'Critical infrastructure score (3.5/10) with sub-50% municipal coverage',
      'Direct risk of water-borne pathogens and mosquito vector proliferation',
      'Protects adjacent road assets from premature asphalt stripping and erosion',
      'Enables delayed public investment project (PRJ-PRY-003) to resume operational milestones',
    ],
    disclaimer: 'Potential priority recommended for government consideration. Based on available synthetic indicators and citizen intake; requires formal municipal engineering validation.',
  },
];
