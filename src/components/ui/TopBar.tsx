import React, { useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, Plus, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ApiStatus } from './Sidebar';
import { useAuth } from '../../auth/useAuth';
import { ConfirmDialog } from './ConfirmDialog';

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

function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = name?.trim() || email || 'OP';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? 'O').toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? parts[0]?.[1]?.toUpperCase() ?? 'P');
}

const SessionDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, developmentMode } = useAuth();
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Your session">
      <button className="absolute inset-0 bg-navy-950/40" onClick={onClose} aria-label="Close dialog" />
      <div className="relative w-[min(92vw,420px)] rounded-xl border border-cv-line bg-cv-surface p-5 shadow-cv-3">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-600"
          aria-label="Close"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <h3 className="text-[15px] font-semibold text-navy-900">Your session</h3>
        <dl className="mt-4 space-y-3 text-[13px]">
          <div className="flex items-start justify-between gap-4">
            <dt className="label-xs mt-0.5">Name</dt>
            <dd className="text-right text-navy-800">{user?.name || '—'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="label-xs mt-0.5">Email</dt>
            <dd className="text-right text-navy-800">{user?.email || '—'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="label-xs mt-0.5">Method</dt>
            <dd className="text-right text-navy-800">
              {developmentMode ? 'Development (simulated)' : 'Amazon Cognito'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="label-xs mt-0.5">Identifier</dt>
            <dd className="max-w-[60%] truncate text-right text-navy-800">{user?.id}</dd>
          </div>
          {user?.groups && user.groups.length > 0 && (
            <div className="flex items-start justify-between gap-4">
              <dt className="label-xs mt-0.5">Groups</dt>
              <dd className="text-right text-navy-800">{user.groups.join(', ')}</dd>
            </div>
          )}
        </dl>
        <div className="mt-5 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2.5 text-[12px] text-navy-600">
          <ShieldCheck size={14} className="shrink-0 text-pine-600" aria-hidden="true" />
          Roles are advisory in this console — authorization is enforced by the backend.
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const TopBar: React.FC<TopBarProps> = ({ apiStatus, onMenu, onNavigate }) => {
  const { user, developmentMode, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const displayName = user?.name || (developmentMode ? 'Development session' : 'Signed-in user');

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-cv-line bg-cv-surface px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-md p-1.5 text-navy-500 hover:bg-navy-50 lg:hidden" aria-label="Open navigation">
          <Menu size={19} aria-hidden="true" />
        </button>
        <button
          onClick={() => onNavigate('/app/cases')}
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
        <button onClick={() => onNavigate('/app/report')} className="btn btn-primary btn-sm">
          <Plus size={14} aria-hidden="true" />
          <span className="hidden sm:inline">New report</span>
          <span className="sm:hidden">Report</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-cv-line bg-cv-subtle py-1 pl-1 pr-2 hover:bg-cv-canvas"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-[10px] font-semibold text-white">
              {initialsOf(user?.name, user?.email)}
            </span>
            <ChevronDown size={13} className="text-navy-400" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-lg border border-cv-line bg-cv-surface shadow-cv-3"
            >
              <div className="border-b border-cv-line bg-cv-subtle px-3.5 py-3">
                <p className="truncate text-[13px] font-semibold text-navy-900">{displayName}</p>
                <p className="truncate text-[11.5px] text-navy-500">
                  {developmentMode ? 'Development session (simulated)' : (user?.email || 'Signed in via Cognito')}
                </p>
              </div>
              <div className="p-1.5">
                <button
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    setProfileOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-navy-700 hover:bg-navy-50"
                >
                  <UserRound size={15} className="text-navy-400" aria-hidden="true" />
                  Profile &amp; session
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    setConfirmOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-navy-700 hover:bg-navy-50"
                >
                  <LogOut size={15} className="text-navy-400" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {menuOpen && (
        <button
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={closeMenu}
          aria-label="Close menu"
          tabIndex={-1}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out of CivicVoice?"
        description="You'll need to sign in again to open the operations dashboard."
        confirmLabel="Sign out"
        danger
        onConfirm={() => {
          setConfirmOpen(false);
          logout();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {profileOpen && <SessionDialog onClose={() => setProfileOpen(false)} />}
    </header>
  );
};