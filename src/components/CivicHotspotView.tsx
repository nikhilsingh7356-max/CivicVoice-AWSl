import React, { useState } from 'react';
import { CivicCase } from '../types';
import { PriorityBadge, CategoryBadge, StatusBadge } from './StatusBadge';
import { MapPin, AlertTriangle, Layers, ArrowRight, ShieldCheck, Sparkles, Building2, CheckCircle2, RefreshCw } from 'lucide-react';

interface CivicHotspotViewProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
}

interface ClusterGroup {
  id: string;
  name: string;
  location: string;
  cases: CivicCase[];
  primaryRisk: string;
  recommendedCoordination: string;
  severityMax: number;
}

export const CivicHotspotView: React.FC<CivicHotspotViewProps> = ({
  cases,
  onSelectCase,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState<string>('CLUSTER-PRAYAGRAJ-CIVIL-LINES');

  // Group cases by cluster_id or location sector
  const clusters: ClusterGroup[] = [
    {
      id: 'CLUSTER-PRAYAGRAJ-CIVIL-LINES',
      name: 'Prayagraj Civil Lines & Stanley Corridor',
      location: 'Prayagraj, Uttar Pradesh, India',
      cases: cases.filter((c) => c.case_id === 'CV-2026-001' || c.case_id === 'CV-2026-005'),
      primaryRisk: 'Compound Drainage Overflow & Sub-Base Asphalt Failure (420m proximity)',
      recommendedCoordination: 'Joint Dispatch: Public Works (Roads) + Drainage Authority for synchronized culvert desilting before resurfacing.',
      severityMax: 8.4,
    },
    {
      id: 'CLUSTER-SAO-PAULO-CENTRAL',
      name: 'São Paulo Central Commercial Corridor',
      location: 'Rua Augusta / Alameda Santos, São Paulo, Brazil',
      cases: cases.filter((c) => c.case_id === 'CV-2026-002'),
      primaryRisk: 'Pedestrian Egress Obstruction & Bio-Sanitary Rodent Vector Proliferation',
      recommendedCoordination: 'Municipal Sanitation Compactor routing + Commercial shopkeeper disposal advisory notice.',
      severityMax: 6.8,
    },
    {
      id: 'CLUSTER-DURBAN-FLORIDA-ROAD',
      name: 'Durban Florida Road School Precinct',
      location: 'Florida Road School Zone, Durban, South Africa',
      cases: cases.filter((c) => c.case_id === 'CV-2026-004'),
      primaryRisk: 'Sub-surface Soil Cavitation & High Volume Clean Drinking Water Depletion',
      recommendedCoordination: 'Immediate Hydraulic Zone Valve Isolation (< 6h) followed by trench repair.',
      severityMax: 9.1,
    },
    {
      id: 'CLUSTER-DELHI-CP-TRANSIT',
      name: 'New Delhi Connaught Place Pedestrian Zone',
      location: 'Outer Circle Block C, Connaught Place, New Delhi, India',
      cases: cases.filter((c) => c.case_id === 'CV-2026-003'),
      primaryRisk: 'Prolonged Night-time Illumination Blackout & Pedestrian Vulnerability',
      recommendedCoordination: 'Feeder pillar circuit continuity test and automated photocell inspection.',
      severityMax: 6.2,
    },
  ];

  // Active cluster
  const activeCluster = clusters.find((c) => c.id === selectedClusterId) || clusters[0];

  return (
    <div id="civic-hotspot-cluster-view" className="space-y-5">
      {/* Overview Banner */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Civic Hotspot & Spatial Cluster Intelligence
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
                {clusters.length} Active Corridors
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Amazon Bedrock continuously analyzes geospatial proximity and semantic correlations to detect compound infrastructure failures across municipal departments.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-900 flex items-center gap-1.5 shrink-0 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
          Spatial Correlator Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Cluster List */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Identified Civic Clusters
          </h4>

          <div className="space-y-2.5">
            {clusters.map((cluster) => {
              const isSelected = cluster.id === activeCluster.id;
              return (
                <div
                  key={cluster.id}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-blue-600 shadow-md ring-1 ring-blue-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <h5 className="text-xs font-bold text-slate-900">
                          {cluster.name}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 ml-5">
                        {cluster.location}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {cluster.cases.length} {cluster.cases.length === 1 ? 'Report' : 'Reports'}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Max Sev: {cluster.severityMax.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 truncate max-w-[280px]">
                      {cluster.primaryRisk}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Cluster Dossier & Correlated Reports */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  Cluster Dossier
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-1">
                  {activeCluster.name}
                </h4>
                <p className="text-xs text-slate-500">
                  {activeCluster.location}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 text-slate-700">
                  {activeCluster.cases.length} Linked Civic Cases
                </span>
              </div>
            </div>

            {/* Spatial Schematic Visualizer Canvas */}
            <div className="my-4 p-4 rounded-lg bg-slate-950 text-white relative overflow-hidden border border-slate-800">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="relative z-10 flex flex-col justify-between h-40">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>MUNICIPAL SECTOR RADAR</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Proximity Scope: 500m
                  </span>
                </div>

                {/* Simulated Pins in Cluster */}
                <div className="flex items-center justify-center gap-8 py-2">
                  {activeCluster.cases.map((c, i) => (
                    <div 
                      key={c.case_id}
                      onClick={() => onSelectCase(c.case_id)}
                      className="group flex flex-col items-center cursor-pointer"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-600/90 border-2 border-cyan-300 flex items-center justify-center text-white text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                          {c.case_id.split('-')[2] || c.case_id}
                        </div>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                          {c.severity_score.toFixed(0)}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-200 mt-1.5 group-hover:underline">
                        {c.case_id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c.category}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>GIS Coordinate Anchor Verified</span>
                  <span>Cross-Departmental Correlation</span>
                </div>
              </div>
            </div>

            {/* Cross-Impact Rationale & Recommended Joint Response */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-950">
                <span className="font-bold flex items-center gap-1.5 text-amber-900 mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Primary Risk Assessment:
                </span>
                {activeCluster.primaryRisk}
              </div>

              <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200 text-xs text-blue-950">
                <span className="font-bold flex items-center gap-1.5 text-blue-900 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Recommended Multi-Agency Coordination:
                </span>
                {activeCluster.recommendedCoordination}
              </div>
            </div>

            {/* Linked Cases List */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Cases in this Cluster
              </h5>

              <div className="space-y-2">
                {activeCluster.cases.map((c) => (
                  <div
                    key={c.case_id}
                    onClick={() => onSelectCase(c.case_id)}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {c.case_id}
                        </span>
                        <CategoryBadge category={c.category} />
                        <PriorityBadge priority={c.priority} size="sm" />
                      </div>
                      <p className="text-xs font-medium text-slate-800 truncate mt-1">
                        {c.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {c.department}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
