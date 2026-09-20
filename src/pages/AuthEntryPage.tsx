import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  DevModeBanner,
  PublicFooter,
  PublicHeader,
} from '../components/public/PublicChrome';
import { SignInMode } from '../auth/types';

interface AuthEntryPageProps {
  mode: SignInMode;
  onNavigate: (path: string) => void;
}

function readNextTarget(): string | undefined {
  const raw = new URLSearchParams(window.location.search).get('next');
  if (!raw) return undefined;
  return raw.startsWith('/') ? raw : undefined;
}

/**
 * /login and /signup entry screens. They immediately hand off to the hosted UI
 * (or, in development mode, establish a clearly-labeled local session).
 */
export const AuthEntryPage: React.FC<AuthEntryPageProps> = ({ mode, onNavigate }) => {
  const { status, user, developmentMode, login, signup } = useAuth();
  const [initError, setInitError] = useState<string | null>(null);
  const next = readNextTarget();

  const authenticated = status === 'authenticated' && Boolean(user);

  useEffect(() => {
    if (authenticated) {
      onNavigate(next ?? '/app');
      return;
    }
    if (status === 'unauthenticated') {
      try {
        if (mode === 'signup') signup(next); else login(next);
      } catch {
        setInitError('Unable to connect to CivicVoice. Please try again.');
      }
    }
  }, [status, authenticated, mode, next, login, signup, onNavigate]);

  const continueAction = () => {
    if (mode === 'signup') signup(next); else login(next);
  };

  const title = mode === 'signup' ? 'Create your account' : 'Sign in to CivicVoice';
  const icon = mode === 'signup' ? <UserPlus size={17} aria-hidden="true" /> : <LogIn size={17} aria-hidden="true" />;

  return (
    <div className="flex min-h-screen flex-col bg-cv-canvas">
      <DevModeBanner />
      <PublicHeader onNavigate={onNavigate} />

      <main className="flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-md">
          <div className="panel p-7">
            <p className="eyebrow">CivicVoice authentication</p>
            <h1 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.015em] text-navy-950">{title}</h1>
            <p className="subtitle mt-2 leading-relaxed">
              Authentication is handled by Amazon Cognito. CivicVoice never stores your password.
            </p>

            <div className="mt-6">
              {status === 'loading' ? (
                <div className="flex items-center gap-2.5 text-[13px] text-navy-600">
                  <Loader2 size={15} className="animate-spin text-pine-600" aria-hidden="true" />
                  Checking your session…
                </div>
              ) : authenticated ? (
                <div className="flex items-center gap-2.5 text-[13px] text-navy-600">
                  <Loader2 size={15} className="animate-spin text-pine-600" aria-hidden="true" />
                  Opening the dashboard…
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-[13px] text-navy-600">
                  <Loader2 size={15} className="animate-spin text-pine-600" aria-hidden="true" />
                  Redirecting to sign in…
                </div>
              )}

              {initError && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800">
                  {initError}
                </div>
              )}

              {developmentMode && (
                <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
                  Development session — Amazon Cognito isn't configured, so sign-in is simulated locally
                  and you'll be signed straight in.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button onClick={continueAction} className="btn btn-primary w-full">
                {icon}
                Continue to {mode === 'signup' ? 'create account' : 'sign in'}
                <ArrowRight size={14} aria-hidden="true" />
              </button>
              <button onClick={() => onNavigate('/')} className="btn btn-ghost w-full">
                Back to home
              </button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};