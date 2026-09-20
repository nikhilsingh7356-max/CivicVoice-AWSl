import React, { useState, useEffect, useCallback } from 'react';
import { CivicCase, CaseStatus } from './types';
import { INITIAL_DEMO_CASES } from './demoData';
import { AppShell, ApiStatus } from './components/ui/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MapPage } from './pages/MapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PolicyPlanningPage } from './pages/PolicyPlanningPage';
import { useToast } from './components/ui/Toast';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [cases, setCases] = useState<CivicCase[]>(INITIAL_DEMO_CASES);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('connecting');
  const { notify } = useToast();

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
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
      navigate(`/cases/${caseId}`);
    },
    [navigate]
  );

  const isCaseDetailRoute = currentPath.startsWith('/cases/');
  const currentCase = isCaseDetailRoute
    ? cases.find((c) => c.case_id === currentPath.replace('/cases/', ''))
    : undefined;

  let pageContent: React.ReactNode = null;

  if (isCaseDetailRoute) {
    if (currentCase) {
      pageContent = (
        <CaseDetailPage
          civicCase={currentCase}
          onBack={() => navigate('/cases')}
          onUpdateStatus={handleUpdateStatus}
          onCaseModified={handleCaseModified}
          onNavigate={navigate}
        />
      );
    } else {
      pageContent = (
        <div className="max-w-3xl">
          <h1 className="page-title">Case not found</h1>
          <p className="subtitle mt-2">
            We could not find a case matching this identifier in the current dataset.
          </p>
          <button onClick={() => navigate('/cases')} className="btn btn-secondary mt-5">
            Back to cases
          </button>
        </div>
      );
    }
  } else if (currentPath === '/report' || currentPath === '/citizen') {
    pageContent = (
      <ReportIssuePage onCaseCreated={handleCaseCreated} onNavigate={navigate} />
    );
  } else if (currentPath.startsWith('/analytics')) {
    pageContent = (
      <AnalyticsPage cases={cases} onSelectCase={handleSelectCase} onNavigate={navigate} />
    );
  } else if (currentPath.startsWith('/notifications')) {
    pageContent = (
      <NotificationsPage cases={cases} onSelectCase={handleSelectCase} onNavigate={navigate} />
    );
  } else if (currentPath.startsWith('/map')) {
    pageContent = <MapPage cases={cases} onSelectCase={handleSelectCase} />;
  } else if (currentPath.startsWith('/cases')) {
    pageContent = (
      <CasesPage
        cases={cases}
        onSelectCase={handleSelectCase}
        apiStatus={apiStatus}
        onRefresh={() => fetchCases()}
      />
    );
  } else if (currentPath.startsWith('/policy') || currentPath.startsWith('/planning')) {
    pageContent = (
      <PolicyPlanningPage cases={cases} onNavigate={navigate} onCaseCreated={handleCaseCreated} />
    );
  } else {
    pageContent = (
      <OverviewPage
        cases={cases}
        apiStatus={apiStatus}
        onSelectCase={handleSelectCase}
        onNavigate={navigate}
        onRefresh={() => fetchCases()}
      />
    );
  }

  return (
    <AppShell path={currentPath} onNavigate={navigate} apiStatus={apiStatus}>
      {pageContent}
    </AppShell>
  );
}

export default App;