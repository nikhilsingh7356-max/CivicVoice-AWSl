import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  DevModeBanner,
  PublicFooter,
  PublicHeader,
} from '../components/public/PublicChrome';
import { SignInMode } from '../auth/types';
import { DEMO_ACCOUNTS } from '../auth/logic';

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
 * /login and /signup entry screens.
 * - With Cognito configured: immediately hand off to the hosted UI.
 * - Otherwise (development mode): show a demo sign-in form using the clearly-labeled
 *   local demo credentials below, so the flow can be exercised without AWS.
 */
export const AuthEntryPage: React.FC<AuthEntryPageProps> = ({ mode, onNavigate }) => {
  const { status, user, developmentMode, login, signup, loginWithDemo } = useAuth();
  const [initError, setInitError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNTS[0].password);
  const [formError, setFormError] = useState<string | null>(null);
  const next = readNextTarget();

  const authenticated = status === 'authenticated' && Boolean(user);

  useEffect(() => {
    if (authenticated) {
      onNavigate(next ?? '/app');
      return;
    }
    if (status === 'unauthenticated' && !developmentMode) {
      try {
        if (mode === 'signup') signup(next); else login(next);
      } catch {
        setInitError('Unable to connect to CivicVoice. Please try again.');
      }
    }
  }, [status, authenticated, mode, next, login, signup, onNavigate, developmentMode]);

  const continueAction = () => {
    if (mode === 'signup') signup(next); else login(next);
  };

  const handleDemoSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const checked = loginWithDemo(email, password);
    if (!checked.ok) {
      setFormError(checked.message);
    }
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
              {developmentMode
                ? 'Amazon Cognito isn\'t configured, so this screen signs you in against local demo credentials. CivicVoice never stores your password.'
                : 'Authentication is handled by Amazon Cognito. CivicVoice never stores your password.'}
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
              ) : developmentMode ? (
                <form onSubmit={handleDemoSubmit} className="flex flex-col gap-3.5" noValidate>
                  <div>
                    <label htmlFor="demo-email" className="mb-1 block text-[12.5px] font-medium text-navy-800">
                      Email
                    </label>
                    <input
                      id="demo-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="username"
                      className="input"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="demo-password" className="mb-1 block text-[12.5px] font-medium text-navy-800">
                      Password
                    </label>
                    <input
                      id="demo-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="input"
                      placeholder="Your password"
                    />
                  </div>

                  {formError && (
                    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800">
                      {formError}
                    </div>
                  )}
                  {initError && (
                    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800">
                      {initError}
                    </div>
                  )}

                  <div className="mt-1 flex flex-col gap-2">
                    <button type="submit" className="btn btn-primary w-full">
                      {icon}
                      {mode === 'signup' ? 'Continue with demo account' : 'Sign in with demo account'}
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => onNavigate('/')} className="btn btn-ghost w-full">
                      Back to home
                    </button>
                  </div>

                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
                      <ShieldCheck size={14} aria-hidden="true" />
                      Demo credentials — local simulation only
                    </p>
                    <ul className="mt-1.5 space-y-1 text-[12px] text-amber-800">
                      {DEMO_ACCOUNTS.map((account) => (
                        <li key={account.id} className="leading-relaxed">
                          {account.name}: <code className="font-mono">{account.email}</code> /{' '}
                          <code className="font-mono">{account.password}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 text-[13px] text-navy-600">
                    <Loader2 size={15} className="animate-spin text-pine-600" aria-hidden="true" />
                    Redirecting to sign in…
                  </div>

                  {initError && (
                    <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800">
                      {initError}
                    </div>
                  )}

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
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};