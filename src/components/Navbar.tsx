import React from 'react';
import { Shield, Sparkles, PlusCircle, LayoutDashboard, Home, ExternalLink, TrendingUp } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLoadDemoComplaint?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  onLoadDemoComplaint,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            id="nav-brand"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-700 to-amber-600 p-0.5 shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400 group-hover:text-amber-400 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-sans">
                  BRICS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-400">CIVICVOICE</span> AI
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/60">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Amazon Bedrock Powered
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 leading-tight">
                From Citizen Voice to Actionable Civic Intelligence
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              id="nav-link-home"
              onClick={() => onNavigate('/')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentPath === '/'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </button>

            <button
              id="nav-link-citizen"
              onClick={() => onNavigate('/citizen')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentPath === '/citizen'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Citizen Intake</span>
            </button>

            <button
              id="nav-link-authority"
              onClick={() => onNavigate('/authority')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentPath.startsWith('/authority') || currentPath.startsWith('/case')
                  ? 'bg-slate-800 text-amber-300 border border-amber-600/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Authority</span>
            </button>

            <button
              id="nav-link-analytics"
              onClick={() => onNavigate('/analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentPath.startsWith('/analytics')
                  ? 'bg-indigo-700 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>

            <button
              id="nav-link-policy"
              onClick={() => onNavigate('/policy')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentPath.startsWith('/policy') || currentPath.startsWith('/planning')
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Policy & Planning</span>
            </button>

            {/* Quick Demo Mode button */}
            {onLoadDemoComplaint && (
              <button
                id="nav-btn-demo-quick"
                onClick={() => {
                  onNavigate('/citizen');
                  onLoadDemoComplaint();
                }}
                className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors ml-2"
                title="Populates a standard civic report for instant 2-minute judging demonstration"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Load Demo Case</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
