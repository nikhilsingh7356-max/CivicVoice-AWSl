import React, { useEffect } from 'react';
import { resolveProtectedAccess } from './logic';
import { useAuth } from './useAuth';

/** Centered, calm full-screen status used while auth state resolves. */
export const AuthGateScreen: React.FC<{ message: string; detail?: string }> = ({
  message,
  detail,
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cv-canvas px-6 text-center">
    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-pine-600 text-white" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M9 18v.01" />
      </svg>
    </span>
    <p className="skeleton h-4 w-56 rounded-sm" aria-hidden="true" />
    <p className="text-[15px] font-medium text-navy-800">{message}</p>
    {detail ? <p className="subtitle max-w-sm">{detail}</p> : null}
  </div>
);

/**
 * Guards /app/* routes. Shows a loading screen while the session is restored,
 * and routes unauthenticated visitors through the sign-in flow (remembering
 * where they were headed).
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, user, login } = useAuth();
  const decision = resolveProtectedAccess(status, Boolean(user));

  useEffect(() => {
    if (decision === 'redirect') {
      const current = window.location.pathname;
      login(current.startsWith('/app') ? current : `/app${current}`);
    }
  }, [decision, login]);

  if (decision === 'loading' || status === 'loading') {
    return (
      <AuthGateScreen
        message="Checking your session…"
        detail="Verifying your sign-in before opening the CivicVoice dashboard."
      />
    );
  }

  if (decision === 'redirect') {
    return (
      <AuthGateScreen
        message="Signing you in…"
        detail="You'll be asked to verify your identity before continuing to the dashboard."
      />
    );
  }

  return <>{children}</>;
};