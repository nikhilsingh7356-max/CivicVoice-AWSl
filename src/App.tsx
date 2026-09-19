import React, { useState, useEffect, useCallback } from 'react';
import { CivicCase, CaseStatus } from './types';
import { INITIAL_DEMO_CASES } from './demoData';
import { DEMO_POTHOLE_IMAGE } from './demoImages';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { CitizenReportPage } from './pages/CitizenReportPage';
import { AuthorityDashboardPage } from './pages/AuthorityDashboardPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { PolicyPlanningPage } from './pages/PolicyPlanningPage';
import { CivicAnalyticsPage } from './pages/CivicAnalyticsPage';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [cases, setCases] = useState<CivicCase[]>(INITIAL_DEMO_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Preloaded Demo inputs for citizen reporting
  const [presetComplaint, setPresetComplaint] = useState<string>('');
  const [presetLocation, setPresetLocation] = useState<string>('');
  const [presetImage, setPresetImage] = useState<string>('');

  // Synchronize browser history and path navigation
  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Fetch live cases from server on startup
  const fetchCases = async () => {
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.cases)) {
          setCases(data.cases);
        }
      }
    } catch (e) {
      console.warn('Using local seeded cases as fallback:', e);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Quick Demo complaint loader
  const handleLoadDemo = () => {
    setPresetComplaint(
      'There is a large pothole near the main road. It becomes dangerous for bikes and cars, especially at night.'
    );
    setPresetLocation('Prayagraj, Uttar Pradesh');
    setPresetImage(DEMO_POTHOLE_IMAGE);
    navigate('/citizen');
  };

  // Case creation callback
  const handleCaseCreated = (newCase: CivicCase) => {
    setCases((prev) => [newCase, ...prev.filter((c) => c.case_id !== newCase.case_id)]);
  };

  // Case status update callback
  const handleUpdateStatus = async (
    caseId: string,
    newStatus: CaseStatus,
    assignedOfficer?: string | null
  ) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assigned_officer: assignedOfficer,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.case) {
          setCases((prev) =>
            prev.map((c) => (c.case_id === caseId ? data.case : c))
          );
          return;
        }
      }

      // Fallback local update if API is unreachable
      setCases((prev) =>
        prev.map((c) =>
          c.case_id === caseId
            ? {
                ...c,
                status: newStatus,
                assigned_officer: assignedOfficer !== undefined ? assignedOfficer : c.assigned_officer,
              }
            : c
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
      // Local optimistic update
      setCases((prev) =>
        prev.map((c) =>
          c.case_id === caseId
            ? {
                ...c,
                status: newStatus,
                assigned_officer: assignedOfficer !== undefined ? assignedOfficer : c.assigned_officer,
              }
            : c
        )
      );
    }
  };

  // Case modified callback (human overrides, etc.)
  const handleCaseModified = (updatedCase: CivicCase) => {
    setCases((prev) =>
      prev.map((c) => (c.case_id === updatedCase.case_id ? updatedCase : c))
    );
  };

  // Extract case ID if route is /case/:id
  const isCaseDetailRoute = currentPath.startsWith('/case/');
  const currentCaseIdFromUrl = isCaseDetailRoute ? currentPath.replace('/case/', '') : selectedCaseId;
  const currentCase = cases.find((c) => c.case_id === currentCaseIdFromUrl);

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    navigate(`/case/${caseId}`);
  };

  // Render Page Content based on Route
  let pageContent: React.ReactNode = null;

  if (isCaseDetailRoute && currentCase) {
    pageContent = (
      <CaseDetailPage
        civicCase={currentCase}
        onBack={() => navigate('/authority')}
        onUpdateStatus={handleUpdateStatus}
        onCaseModified={handleCaseModified}
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/citizen') {
    pageContent = (
      <CitizenReportPage
        onCaseCreated={handleCaseCreated}
        onNavigate={navigate}
        initialComplaint={presetComplaint}
        initialLocation={presetLocation}
        initialImage={presetImage}
      />
    );
  } else if (currentPath.startsWith('/analytics')) {
    pageContent = (
      <CivicAnalyticsPage
        cases={cases}
        onSelectCase={handleSelectCase}
      />
    );
  } else if (currentPath.startsWith('/authority')) {
    pageContent = (
      <AuthorityDashboardPage
        cases={cases}
        onSelectCase={handleSelectCase}
        onNavigate={navigate}
      />
    );
  } else if (currentPath.startsWith('/policy') || currentPath.startsWith('/planning')) {
    pageContent = (
      <PolicyPlanningPage
        cases={cases}
        onNavigate={navigate}
        onCaseCreated={handleCaseCreated}
      />
    );
  } else {
    // Default to Landing Page
    pageContent = (
      <LandingPage
        onNavigate={navigate}
        onLoadDemo={handleLoadDemo}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        onLoadDemoComplaint={handleLoadDemo}
      />

      <main className="flex-1 w-full">{pageContent}</main>

      <Footer />
    </div>
  );
}

export default App;
