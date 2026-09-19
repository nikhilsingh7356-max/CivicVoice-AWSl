import { CivicCase, CivicCategory, CivicPriority } from '../types';

export interface DemographicData {
  district: string;
  state: string;
  population: number;
  population_density_per_sqkm: number;
  urban_percent: number;
  rural_percent: number;
  households_count: number;
  vulnerable_population_percent: number;
  municipal_wards_count: number;
  source_label: string; // e.g. "Synthetic Demo Dataset"
}

export interface InfrastructureIndicator {
  id: string;
  district: string;
  state: string;
  sector: CivicCategory;
  infrastructure_type: string;
  baseline_score_out_of_10: number; // Low = poor infrastructure, High = good
  service_coverage_percent: number;
  reliability_index: 'LOW' | 'MEDIUM' | 'HIGH';
  gap_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  last_assessment: string;
  source_label: string;
}

export interface PublicInvestmentProject {
  project_id: string;
  project_name: string;
  state: string;
  district: string;
  sector: CivicCategory;
  infrastructure_type: string;
  planned_investment_cr: number; // in ₹ Crores
  spent_investment_cr: number;
  status: 'PROPOSED' | 'SANCTIONED' | 'UNDER_TENDER' | 'ACTIVE_CONSTRUCTION' | 'DELAYED' | 'COMPLETED';
  target_area: string;
  completion_year: number;
  implementing_agency: string;
  source_label: string;
}

export interface DemandHotspot {
  id: string;
  state: string;
  district: string;
  locality: string;
  sector: CivicCategory;
  infrastructure_type: string;
  request_count: number;
  high_priority_count: number;
  trend_percentage: number; // e.g. +32%
  average_severity: number; // 1-10
  affected_areas_count: number;
  hotspot_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primary_issues: string[];
}

export interface InfrastructureGapRecord {
  id: string;
  district: string;
  state: string;
  infrastructure_type: string;
  sector: CivicCategory;
  citizen_demand_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  infrastructure_indicator: 'LOW' | 'MEDIUM' | 'HIGH';
  service_coverage: 'LOW' | 'MEDIUM' | 'HIGH';
  gap_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  supporting_requests_count: number;
  explanation: string;
  source_label: string;
}

export interface AIDevelopmentPriority {
  id: string;
  title: string;
  geographic_area: string;
  state: string;
  district: string;
  sector: CivicCategory;
  infrastructure_type: string;
  evidence: string;
  citizen_demand: string;
  infrastructure_gap: string;
  demographic_context: string;
  investment_context: string;
  suggested_intervention: string;
  expected_public_impact: string;
  confidence_score: number; // e.g. 88
  explanation: string;
  why_points: string[];
  disclaimer: string;
}

export interface PolicyFilterState {
  state: string;
  district: string;
  sector: string;
  timeRange: 'all' | '30d' | '90d';
}

export interface AggregatedPolicyMetrics {
  total_requests: number;
  active_requests: number;
  resolved_requests: number;
  high_priority_requests: number;
  resolution_rate_percent: number;
  request_growth_percent: number;
  average_severity: number;
  active_hotspots_count: number;
  infrastructure_gaps_count: number;
  potential_priorities_count: number;
}
