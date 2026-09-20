import React, { useState } from 'react';
import { ApiStatus, Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export type { ApiStatus } from './Sidebar';

interface AppShellProps {
  path: string;
  onNavigate: (path: string) => void;
  apiStatus: ApiStatus;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ path, onNavigate, apiStatus, children }) => {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cv-canvas">
        <Sidebar
          path={path}
          onNavigate={onNavigate}
          open={navOpen}
          onClose={() => setNavOpen(false)}
          apiStatus={apiStatus}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            apiStatus={apiStatus}
            onMenu={() => setNavOpen(true)}
            onNavigate={onNavigate}
          />
          <main className="flex-1 px-4 py-6 lg:px-8" id="main">
            {children}
          </main>
          <footer className="shrink-0 px-4 pb-4 text-[11.5px] text-navy-300 lg:px-8">
            CivicVoice — citizen reports and civic operations console. AI suggestions are advisory and reviewed by officers.
          </footer>
        </div>
      </div>
  );
};