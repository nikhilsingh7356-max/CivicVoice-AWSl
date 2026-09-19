import { CivicCategory } from './types';

export interface AuthorityRegistryItem {
  id: string;
  authority: string;
  department: string;
  jurisdiction: string;
  supported_categories: CivicCategory[];
  routing_endpoint: string;
  status: 'ACTIVE' | 'STANDBY';
  contact_channel: string;
  dispatch_sla_hours: number;
  description: string;
}

export const AUTHORITY_REGISTRY: AuthorityRegistryItem[] = [
  {
    id: 'AUTH-ROADS-01',
    authority: 'Municipal Public Works & Highway Authority',
    department: 'Road Maintenance & Infrastructure Division',
    jurisdiction: 'Greater Municipal Urban & Transit Network',
    supported_categories: ['ROADS', 'TRAFFIC'],
    routing_endpoint: 'internal://dispatch/roads-infrastructure',
    status: 'ACTIVE',
    contact_channel: 'Internal Municipal Roadworks Gateway',
    dispatch_sla_hours: 24,
    description: 'Statutory responsibility for roadway asphalt integrity, potholes, pavements, and vehicular transit corridor safety.',
  },
  {
    id: 'AUTH-WASTE-02',
    authority: 'Municipal Sanitation & Public Health Authority',
    department: 'Solid Waste & Environmental Sanitation Department',
    jurisdiction: 'Metropolitan Commercial & Residential Zones',
    supported_categories: ['WASTE', 'SANITATION', 'ENVIRONMENT'],
    routing_endpoint: 'internal://dispatch/sanitation-waste',
    status: 'ACTIVE',
    contact_channel: 'Internal Sanitation Telemetry & Dispatch Desk',
    dispatch_sla_hours: 48,
    description: 'Statutory responsibility for municipal solid waste, garbage dumping clearance, bio-sanitary hygiene, and pest vector deterrence.',
  },
  {
    id: 'AUTH-WATER-03',
    authority: 'Municipal Water Supply & Sewerage Board',
    department: 'Potable Water Pipeline & Sewerage Division',
    jurisdiction: 'Urban Water Distribution & Pipe Grid',
    supported_categories: ['WATER', 'DRAINAGE'],
    routing_endpoint: 'internal://dispatch/water-sewerage',
    status: 'ACTIVE',
    contact_channel: 'Internal Hydraulic Emergency Response Channel',
    dispatch_sla_hours: 12,
    description: 'Statutory authority over pressurized drinking water mains, distribution valves, sewer lines, and municipal culverts.',
  },
  {
    id: 'AUTH-ELEC-04',
    authority: 'Municipal Electrical & Public Lighting Authority',
    department: 'Street Lighting & Power Distribution Division',
    jurisdiction: 'Municipal Street Lighting & Electrical Substation Grid',
    supported_categories: ['STREETLIGHT', 'ELECTRICITY'],
    routing_endpoint: 'internal://dispatch/electrical-lighting',
    status: 'ACTIVE',
    contact_channel: 'Automated Smart Lighting Dispatch Gateway',
    dispatch_sla_hours: 48,
    description: 'Statutory responsibility for street luminaires, municipal power poles, circuit breakers, and nocturnal illumination.',
  },
  {
    id: 'AUTH-SAFETY-05',
    authority: 'Urban Civic Protection & Public Works Bureau',
    department: 'Public Safety & Civic Asset Enforcement',
    jurisdiction: 'Public Civic Grounds & Municipal Parks',
    supported_categories: ['PUBLIC_SAFETY', 'PUBLIC_PROPERTY', 'OTHER'],
    routing_endpoint: 'internal://dispatch/civic-safety',
    status: 'ACTIVE',
    contact_channel: 'Municipal Civic Inspector Coordination Desk',
    dispatch_sla_hours: 24,
    description: 'Statutory oversight for municipal public property, encroachment hazards, structural fences, and general civic welfare.',
  },
];

export function resolveAuthorityByTaxonomy(
  category: CivicCategory,
  locationText?: string
): AuthorityRegistryItem {
  const match = AUTHORITY_REGISTRY.find(
    (item) => item.supported_categories.includes(category) && item.status === 'ACTIVE'
  );
  if (match) return match;
  return AUTHORITY_REGISTRY[AUTHORITY_REGISTRY.length - 1];
}
