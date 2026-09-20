import React, { useState, useEffect, useCallback } from 'react';
import { CivicCase, CaseStatus } from './types';
import { INITIAL_DEMO_CASES } from './demoData';
import { AppShell, ApiStatus } from './components/ui/AppShell';
import { ProtectedRoute } from './auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import { AuthEntryPage } from './pages/AuthEntryPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { OverviewPage } from './pages/OverviewPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MapPage } from './pages/MapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PolicyPlanningPage } from './pages/PolicyPlanningPage';
import { useToast } from './components/ui/Toast';

/** Root prefixes that belong to the authenticated operations area. */
const APP_PREFIXES = ['/app', '/cases', '/report', '/map', '/analytics', '/notifications', '/policy', '/planning', '/citizen'];

function isAppArea(path: string): boolean {
  return APP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Map a legacy top-level path (e.g. /cases/AB-1) onto /app/*. */
function toAppPath(path: string): string {
  return path.startsWith('/app') ? path : `/app${path}`;
}

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [cases, setCases] = useState<CivicCase[]>(INITIAL_DEMO_CASES);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('connecting');
  const { notify } = useToast();

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.replace(/#.*$/, ''));
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const fetchCases = useCallback(async (silent = false) => {
    if (!silent) setApiStatus('connecting');
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.cases)) {
          setCases(data.cases);
          setApiStatus('connected');
          return;
        }
        throw new Error('Unexpected response shape');
      }
      throw new Error(`API responded with ${res.status}`);
    } catch (err) {
      console.warn('Using local seeded cases as fallback:', err);
      setApiStatus('offline-demo');
      if (!silent) {
        notify('error', 'Could not reach the backend. Showing offline sample data.');
      }
    }
  }, [notify]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleCaseCreated = useCallback((newCase: CivicCase) => {
    setCases((prev) => [newCase, ...prev.filter((c) => c.case_id !== newCase.case_id)]);
  }, []);

  const handleUpdateStatus = useCallback(
    async (caseId: string, newStatus: CaseStatus, assignedOfficer?: string | null) => {
      try {
        const response = await fetch(`/api/cases/${caseId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, assigned_officer: assignedOfficer }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.case) {
            setCases((prev) => prev.map((c) => (c.case_id === caseId ? data.case : c)));
            return;
          }
        }
        throw new Error(`API responded with ${response.status}`);
      } catch (err) {
        console.error('Error updating status, applying locally:', err);
      }
      setCases((prev) =>
        prev.map((c) =>
          c.case_id === caseId
            ? {
                ...c,
                status: newStatus,
                assigned_officer:
                  assignedOfficer !== undefined ? assignedOfficer : c.assigned_officer,
              }
            : c
        )
      );
    },
    []
  );

  const handleCaseModified = useCallback((updatedCase: CivicCase) => {
    setCases((prev) => prev.map((c) => (c.case_id === updatedCase.case_id ? updatedCase : c)));
  }, []);

  const handleSelectCase = useCallback(
    (caseId: string) => {
      navigate(`/app/cases/${caseId}`);
    },
    [navigate]
  );

  const appActive = isAppArea(currentPath);

  let publicContent: React.ReactNode = null;
  if (currentPath === '/auth/callback') {
    publicContent = <AuthCallbackPage onNavigate={navigate} />;
  } else if (currentPath === '/login') {
    publicContent = <AuthEntryPage mode="login" onNavigate={navigate} />;
  } else if (currentPath === '/signup') {
    publicContent = <AuthEntryPage mode="signup" onNavigate={navigate} />;
  } else {
    publicContent = <HomePage onNavigate={navigate} />;
  }

  let appContent: React.ReactNode = null;
  if (appActive) {
    const appPath = toAppPath(currentPath);
    const isCaseDetailRoute = appPath.startsWith('/app/cases/');
    const currentCase = isCaseDetailRoute
      ? cases.find((c) => c.case_id === appPath.replace('/app/cases/', ''))
      : undefined;

    if (isCaseDetailRoute) {
      if (currentCase) {
        appContent = (
          <CaseDetailPage
            civicCase={currentCase}
            onBack={() => navigate('/app/cases')}
            onUpdateStatus={handleUpdateStatus}
            onCaseModified={handleCaseModified}
            onNavigate={navigate}
          />
        );
      } else {
        appContent = (
          <div className="max-w-3xl">
            <h1 className="page-title">Case not found</h1>
            <p className="subtitle mt-2">
              We could not find a case matching this identifier in the current dataset.
            </p>
            <button onClick={() => navigate('/app/cases')} className="btn btn-secondary mt-5">
              Back to cases
            </button>
          </div>
        );
      }
    } else if (appPath === '/app/report' || appPath === '/app/citizen') {
      appContent = <ReportIssuePage onCaseCreated={handleCaseCreated} onNavigate={navigate} />;
    } else if (appPath.startsWith('/app/analytics')) {
      appContent = (
        <AnalyticsPage cases={cases} onSelectCase={handleSelectCase} onNavigate={navigate} />
      );
    } else if (appPath.startsWith('/app/notifications')) {
      appContent = (
        <NotificationsPage cases={cases} onSelectCase={handleSelectCase} onNavigate={navigate} />
      );
    } else if (appPath.startsWith('/app/map')) {
      appContent = <MapPage cases={cases} onSelectCase={handleSelectCase} />;
    } else if (appPath.startsWith('/app/cases')) {
      appContent = (
        <CasesPage
          cases={cases}
          onSelectCase={handleSelectCase}
          apiStatus={apiStatus}
          onRefresh={() => fetchCases()}
        />
      );
    } else if (appPath.startsWith('/app/policy') || appPath.startsWith('/app/planning')) {
      appContent = (
        <PolicyPlanningPage cases={cases} onNavigate={navigate} onCaseCreated={handleCaseCreated} />
      );
    } else {
      appContent = (
        <OverviewPage
          cases={cases}
          apiStatus={apiStatus}
          onSelectCase={handleSelectCase}
          onNavigate={navigate}
          onRefresh={() => fetchCases()}
        />
      );
    }
  }

  if (!appActive) {
    return publicContent;
  }

  const appPath = toAppPath(currentPath);

  return (
    <ProtectedRoute>
      <AppShell path={appPath} onNavigate={navigate} apiStatus={apiStatus}>
        {appContent}
      </AppShell>
    </ProtectedRoute>
  );
}

export default App;