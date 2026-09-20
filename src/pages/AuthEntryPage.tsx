import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Loader2, LogIn, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  DevModeBanner,
  PublicFooter,
  PublicHeader,
} from '../components/public/PublicChrome';
import { SignInMode } from '../auth/types';
import { DEMO_ACCOUNTS, isSafeInternalPath } from '../auth/logic';
import { isCognitoConfigured } from '../auth/config';

interface AuthEntryPageProps {
  mode: SignInMode;
  onNavigate: (path: string) => void;
}

function readNextTarget(): string | undefined {
  const raw = new URLSearchParams(window.location.search).get('next');
  return isSafeInternalPath(raw) ? raw : undefined;
}

/**
 * /login and /signup entry screens.
 * - Real sign-in: hand off to the Amazon Cognito hosted UI.
 * - Local development demo: sign in against clearly-labeled sample accounts.
 * Both options are always reachable so developers can exercise the flow
 * without AWS, even when Cognito is configured.
 */
export const AuthEntryPage: React.FC<AuthEntryPageProps> = ({ mode, onNavigate }) => {
  const { status, user, login, signup, loginWithDemo } = useAuth();
  const [initError, setInitError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNTS[0].password);
  const [formError, setFormError] = useState<string | null>(null);
  const next = readNextTarget();

  const authenticated = status === 'authenticated' && Boolean(user);
  const cognitoConfigured = isCognitoConfigured();
  const [demoOpen, setDemoOpen] = useState<boolean>(!cognitoConfigured);

  useEffect(() => {
    if (authenticated) {
      onNavigate(next ?? '/app');
    }
  }, [authenticated, next, onNavigate]);

  const continueAction = () => {
    try {
      if (mode === 'signup') signup(next); else login(next);
    } catch {
      setInitError('Unable to connect to Cognito. Please try again.');
    }
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
              {cognitoConfigured
                ? 'Authentication is handled by Amazon Cognito. You can also use the local development demo below — CivicVoice never stores your password.'
                : 'Amazon Cognito isn\'t configured, so sign in with the local demo credentials. CivicVoice never stores your password.'}
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
                <div className="flex flex-col gap-3.5">
                  {cognitoConfigured && (
                    <>
                      <button onClick={continueAction} className="btn btn-primary w-full">
                        {icon}
                        Continue with Amazon Cognito
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>

                      {initError && (
                        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800">
                          {initError}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-navy-400">
                        <span className="h-px flex-1 bg-navy-200" aria-hidden="true" />
                        or
                        <span className="h-px flex-1 bg-navy-200" aria-hidden="true" />
                      </div>
                    </>
                  )}

                  <div className="rounded-md border border-navy-200">
                    <button
                      type="button"
                      onClick={() => setDemoOpen((open) => !open)}
                      aria-expanded={demoOpen}
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] font-medium text-navy-800 hover:bg-navy-50"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles size={15} className="text-pine-600" aria-hidden="true" />
                        Local development demo — sample accounts
                      </span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={`text-navy-400 transition-transform ${demoOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {demoOpen && (
                      <div className="border-t border-navy-200 p-3.5">
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

                          <button type="submit" className="btn btn-primary w-full">
                            {icon}
                            {mode === 'signup' ? 'Continue with demo account' : 'Sign in with demo account'}
                            <ArrowRight size={14} aria-hidden="true" />
                          </button>
                        </form>

                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
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
                      </div>
                    )}
                  </div>

                  <button onClick={() => onNavigate('/')} className="btn btn-ghost w-full">
                    Back to home
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};