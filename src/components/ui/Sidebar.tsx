import React from 'react';
import {
  BarChart3,
  Bell,
  ClipboardList,
  Landmark,
  Layers,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';

export type ApiStatus = 'connecting' | 'connected' | 'offline-demo';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

const PRIMARY: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} aria-hidden="true" />, path: '/' },
  { id: 'cases', label: 'Cases', icon: <ClipboardList size={16} aria-hidden="true" />, path: '/cases' },
  { id: 'map', label: 'Map', icon: <MapPin size={16} aria-hidden="true" />, path: '/map' },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} aria-hidden="true" />, path: '/analytics' },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} aria-hidden="true" />, path: '/notifications' },
];

const SECONDARY: NavItem[] = [
  { id: 'policy', label: 'Policy & planning', icon: <Layers size={16} aria-hidden="true" />, path: '/policy', badge: 'synthetic' },
];

interface SidebarProps {
  path: string;
  onNavigate: (path: string) => void;
  open: boolean;
  onClose: () => void;
  apiStatus: ApiStatus;
}

const STATUS_LABELS: Record<ApiStatus, { label: string; dot: string }> = {
  connecting: { label: 'Connecting to API', dot: 'bg-amber-400' },
  connected: { label: 'API connected', dot: 'bg-emerald-400' },
  'offline-demo': { label: 'Offline — demo data', dot: 'bg-amber-400' },
};

export const Sidebar: React.FC<SidebarProps> = ({ path, onNavigate, open, onClose, apiStatus }) => {
  const active = (item: NavItem) =>
    item.path === '/' ? path === '/' : path === item.path || path.startsWith(`${item.path}/`);

  const renderItem = (item: NavItem) => (
    <button
      key={item.id}
      onClick={() => {
        onNavigate(item.path);
        onClose();
      }}
      aria-current={active(item) ? 'page' : undefined}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
        active(item)
          ? 'bg-navy-700 font-semibold text-white'
          : 'text-navy-300 hover:bg-navy-800 hover:text-navy-100'
      }`}
    >
      <span className="flex items-center gap-2.5">
        {item.icon}
        <span>{item.label}</span>
      </span>
      {item.badge && (
        <span className={`rounded-sm px-1.5 text-[9px] font-semibold uppercase tracking-wide ${active(item) ? 'bg-navy-600 text-navy-100' : 'bg-navy-800 text-navy-400'}`}>
          {item.badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col border-r border-navy-800 bg-navy-950 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-navy-800 px-4">
          <button
            onClick={() => {
              onNavigate('/');
              onClose();
            }}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-pine-600 text-white">
              <Landmark size={16} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              CivicVoice
            </span>
          </button>
          <button onClick={onClose} className="rounded p-1 text-navy-300 hover:text-white lg:hidden" aria-label="Close navigation">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          <p className="label-xs mb-1.5 px-2.5 text-navy-500">Operations</p>
          <div className="space-y-0.5">{PRIMARY.map(renderItem)}</div>

          <p className="label-xs mb-1.5 mt-6 px-2.5 text-navy-500">Planning</p>
          <div className="space-y-0.5">{SECONDARY.map(renderItem)}</div>

          {/* System status */}
          <div className="mt-6 rounded-lg border border-navy-800 bg-navy-900 px-2.5 py-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-pine-400" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-navy-300">System status</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`dot ${STATUS_LABELS[apiStatus].dot}`} aria-hidden="true" />
              <span className="text-[12px] text-navy-200">{STATUS_LABELS[apiStatus].label}</span>
            </div>
          </div>
        </nav>

        {/* Profile footer */}
        <div className="shrink-0 border-t border-navy-800 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-[11px] font-semibold text-white">
              OP
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-navy-100">Operations console</p>
              <p className="text-[10.5px] text-navy-400">Local session</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};