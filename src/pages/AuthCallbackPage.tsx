import React from 'react';
import { AlertTriangle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  DevModeBanner,
  PublicFooter,
  PublicHeader,
} from '../components/public/PublicChrome';

interface AuthCallbackPageProps {
  onNavigate: (path: string) => void;
}

/**
 * /auth/callback — the return target for the Cognito hosted UI. The AuthProvider
 * performs the code exchange in this screen; we simply reflect its status.
 */
export const AuthCallbackPage: React.FC<AuthCallbackPageProps> = ({ onNavigate }) => {
  const { processingCallback, callbackError, status, user, login } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-cv-canvas">
      <DevModeBanner />
      <PublicHeader onNavigate={onNavigate} />

      <main className="flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-md">
          <div className="panel p-7 text-center">
            {processingCallback ? (
              <>
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pine-100 text-pine-700" aria-hidden="true">
                  <Loader2 size={20} className="animate-spin" />
                </span>
                <h1 className="mt-4 text-[1.3rem] font-semibold tracking-[-0.015em] text-navy-950">
                  Completing sign-in…
                </h1>
                <p className="subtitle mt-2 leading-relaxed">
                  We're verifying your identity and preparing your dashboard.
                </p>
              </>
            ) : callbackError ? (
              <>
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700" aria-hidden="true">
                  <AlertTriangle size={20} />
                </span>
                <h1 className="mt-4 text-[1.3rem] font-semibold tracking-[-0.015em] text-navy-950">
                  We couldn't sign you in. Please try again.
                </h1>
                <p className="subtitle mt-2 leading-relaxed">
                  The sign-in expired or was interrupted. Nothing was lost — just try once more.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={() => login()} className="btn btn-primary w-full">
                    Sign in again
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                  <button onClick={() => onNavigate('/')} className="btn btn-ghost w-full">
                    Back to home
                  </button>
                </div>
              </>
            ) : status === 'authenticated' && user ? (
              <>
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pine-100 text-pine-700" aria-hidden="true">
                  <ShieldCheck size={20} />
                </span>
                <h1 className="mt-4 text-[1.3rem] font-semibold tracking-[-0.015em] text-navy-950">
                  You're signed in
                </h1>
                <p className="subtitle mt-2">Continue as {user.email || user.name || user.username}.</p>
                <button onClick={() => onNavigate('/app')} className="btn btn-primary mt-6 w-full">
                  Open the dashboard
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-navy-500" aria-hidden="true">
                  <ShieldCheck size={20} />
                </span>
                <h1 className="mt-4 text-[1.3rem] font-semibold tracking-[-0.015em] text-navy-950">
                  No sign-in in progress
                </h1>
                <p className="subtitle mt-2 leading-relaxed">
                  You reached the authentication callback without an active request.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={() => login()} className="btn btn-primary w-full">
                    Start sign-in
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                  <button onClick={() => onNavigate('/')} className="btn btn-ghost w-full">
                    Back to home
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};