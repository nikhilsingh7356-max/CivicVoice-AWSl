import React from 'react';
import { Menu, Plus, Search } from 'lucide-react';
import { ApiStatus } from './Sidebar';

interface TopBarProps {
  apiStatus: ApiStatus;
  onMenu: () => void;
  onNavigate: (path: string) => void;
}

const STATUS_TEXT: Record<ApiStatus, { label: string; cls: string }> = {
  connecting: { label: 'Connecting…', cls: 'text-amber-600' },
  connected: { label: 'Live', cls: 'text-emerald-700' },
  'offline-demo': { label: 'Demo data', cls: 'text-amber-600' },
};

export const TopBar: React.FC<TopBarProps> = ({ apiStatus, onMenu, onNavigate }) => {
  const today = new Date().toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-cv-line bg-cv-surface px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-md p-1.5 text-navy-500 hover:bg-navy-50 lg:hidden" aria-label="Open navigation">
          <Menu size={19} aria-hidden="true" />
        </button>
        <button
          onClick={() => onNavigate('/cases')}
          className="rounded-md p-1.5 text-navy-400 hover:bg-navy-50"
          aria-label="Search cases"
        >
          <Search size={17} aria-hidden="true" />
        </button>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="meta">{today}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`hidden items-center gap-1.5 rounded-md border border-cv-line bg-cv-subtle px-2.5 py-1 text-[11.5px] sm:inline-flex ${STATUS_TEXT[apiStatus].cls}`}>
          <span className="dot bg-current" aria-hidden="true" />
          {STATUS_TEXT[apiStatus].label}
        </span>
        <button onClick={() => onNavigate('/report')} className="btn btn-primary btn-sm">
          <Plus size={14} aria-hidden="true" />
          <span className="hidden sm:inline">New report</span>
          <span className="sm:hidden">Report</span>
        </button>
      </div>
    </header>
  );
};