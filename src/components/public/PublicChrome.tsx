import React, { useState } from 'react';
import { Landmark, Menu, X } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';

export interface PublicChromeProps {
  onNavigate: (path: string) => void;
}

const NAV_ITEMS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'about', label: 'About' },
];

/** Smooth-scroll to an in-page section, navigating home first when needed. */
export function scrollToSection(id: string, onNavigate: (path: string) => void): void {
  const go = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  if (window.location.pathname !== '/') {
    onNavigate('/');
    setTimeout(go, 50);
  } else {
    go();
  }
}

export function initHomeHashScroll(): void {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const el = document.getElementById(hash);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }
}

/** Clear amber banner shown whenever a simulated (non-Cognito) session is active. */
export const DevModeBanner: React.FC = () => {
  const { developmentMode } = useAuth();
  if (!developmentMode) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-[11.5px] font-medium text-amber-800">
      Development session — Amazon Cognito isn't configured. Sign-in is simulated locally.
    </div>
  );
};

export const BrandLockup: React.FC = () => (
  <span className="flex items-center gap-2.5">
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-pine-600 text-white" aria-hidden="true">
      <Landmark size={16} />
    </span>
    <span className="flex flex-col items-start leading-none">
      <span className="text-[15px] font-semibold tracking-tight text-navy-900">CivicVoice</span>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-navy-400">
        Citizen infrastructure reporting
      </span>
    </span>
  </span>
);

export const PublicHeader: React.FC<PublicChromeProps> = ({ onNavigate }) => {
  const { status, user, login } = useAuth();
  const authenticated = status === 'authenticated' && Boolean(user);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (id: string) => {
    scrollToSection(id, onNavigate);
    setMenuOpen(false);
  };

  const report = () => {
    setMenuOpen(false);
    if (authenticated) {
      onNavigate('/app/report');
    } else {
      login('/app/report');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-cv-line bg-cv-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <button onClick={() => onNavigate('/')} aria-label="CivicVoice home" className="shrink-0">
          <BrandLockup />
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {authenticated ? (
            <button onClick={() => onNavigate('/app')} className="btn btn-secondary btn-sm">
              Open Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => login()} className="btn btn-ghost btn-sm">
                Log in
              </button>
              <button onClick={() => login('/app')} className="btn btn-primary btn-sm">
                Create account
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-md p-1.5 text-navy-600 hover:bg-navy-50 md:hidden"
          aria-label={menuOpen ? 'Close public navigation' : 'Open public navigation'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-cv-line bg-cv-surface px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className="rounded-md px-2 py-2 text-left text-[14px] font-medium text-navy-700 hover:bg-navy-50"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2 border-t border-cv-line pt-3">
            {authenticated ? (
              <button onClick={() => onNavigate('/app')} className="btn btn-secondary btn-sm flex-1">
                Open Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => login()} className="btn btn-ghost btn-sm flex-1">
                  Log in
                </button>
                <button onClick={() => login('/app')} className="btn btn-primary btn-sm flex-1">
                  Create account
                </button>
              </>
            )}
          </div>
          <div className="mt-2">
            <button onClick={report} className="btn btn-primary btn-sm w-full">
              Report an issue
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export const PublicFooter: React.FC<PublicChromeProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-cv-line bg-cv-subtle">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <BrandLockup />
          <p className="meta mt-3 leading-relaxed">
            CivicVoice is citizen infrastructure reporting for teams that need to act — not just talk.
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-pine-700">
            AI assists. People decide.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:w-64 md:grid-cols-2">
          <div className="flex flex-col">
            <p className="label-xs mb-2">Explore</p>
            <div className="flex flex-col items-start gap-1.5">
              {[
                { id: 'how-it-works', label: 'How it works' },
                { id: 'features', label: 'Features' },
                { id: 'about', label: 'About' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id, onNavigate)}
                  className="text-[13px] text-navy-600 hover:text-navy-900 hover:underline"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <p className="label-xs mb-2">Account</p>
            <div className="flex flex-col items-start gap-1.5">
              <button onClick={() => onNavigate('/')} className="text-[13px] text-navy-600 hover:text-navy-900 hover:underline">
                Home
              </button>
              <button onClick={() => login()} className="text-[13px] text-navy-600 hover:text-navy-900 hover:underline">
                Log in
              </button>
              <button onClick={() => onNavigate('/app')} className="text-[13px] text-navy-600 hover:text-navy-900 hover:underline">
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-cv-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="meta">© {year} CivicVoice. Citizen infrastructure reporting.</p>
          <p className="meta">Managed AWS services · human review in control.</p>
        </div>
      </div>
    </footer>
  );
};