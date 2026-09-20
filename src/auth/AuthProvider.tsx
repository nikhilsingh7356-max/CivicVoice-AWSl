import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AuthError, AuthSession } from './types';
import { authConfig } from './config';
import {
  completeSignIn,
  initiateSignIn,
  readStoredSession,
  restoreSession,
  signOut,
  writeDemoSession,
} from './auth';
import { AuthContext, AuthContextValue } from './useAuth';
import { classifySignInFailure, deriveAuthMode, describeAuthorizeRequest, isSafeInternalPath, validateDemoCredentials } from './logic';
import { useToast } from '../components/ui/Toast';

function isCallbackRoute(pathname: string): boolean {
  return pathname === '/auth/callback';
}

function buildEntryUrl(mode: 'login' | 'signup', next?: string): string {
  const path = mode === 'signup' ? '/signup' : '/login';
  return isSafeInternalPath(next) ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/**
 * Development-only structural log of the Cognito authorize request.
 * Secret-safe by construction (describeAuthorizeRequest) — it shows parameter
 * names and non-secret values, and the lengths of `state`/`code_challenge`
 * instead of their values. Never logged in production builds.
 */
function logAuthorizeUrl(url: string): void {
  if (!import.meta.env.DEV) return;
  console.info('[civicvoice:auth] Cognito authorize request:', describeAuthorizeRequest(url));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useToast();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [processingCallback, setProcessingCallback] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Guard so the OAuth callback is processed exactly once, even under React
  // StrictMode's double-invoked effects in development. Refs persist across
  // StrictMode's simulated unmount/remount of the same instance.
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const pathname = window.location.pathname;

    const bootstrap = async () => {
      if (isCallbackRoute(pathname)) {
        setProcessingCallback(true);
        const outcome = await completeSignIn(authConfig, {
          search: window.location.search,
          origin: window.location.origin,
          storage: window.sessionStorage,
          nowMs: Date.now(),
        });
        setProcessingCallback(false);

        if (outcome.ok) {
          const restored = readStoredSession(window.sessionStorage, Date.now());
          setSession(restored);
          setStatus('authenticated');
          setAuthError(null);
          setCallbackError(null);
          const target = outcome.next.startsWith('/') ? outcome.next : `/${outcome.next}`;
          window.history.replaceState({}, '', target);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          window.history.replaceState({}, '', pathname);
          setStatus('unauthenticated');
          setSession(null);
          setCallbackError(outcome.message);
          setAuthError(classifySignInFailure(outcome.reason, outcome.technical));
        }
        return;
      }

      try {
        const restored = await restoreSession(authConfig, {
          storage: window.sessionStorage,
          nowMs: Date.now(),
          origin: window.location.origin,
        });
        if (restored.kind === 'session') {
          setSession(restored.session);
          setStatus('authenticated');
          setAuthError(null);
        } else {
          setSession(null);
          setStatus('unauthenticated');
          if (restored.kind === 'expired' || restored.kind === 'refresh-failed') {
            setAuthError({
              code: 'session-expired',
              message: 'Your session has expired. Please sign in again.',
            });
          } else {
            setAuthError(null);
          }
        }
      } catch {
        setSession(null);
        setStatus('unauthenticated');
        setAuthError({ code: 'network', message: 'Unable to verify your sign-in session.' });
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    const authMode = deriveAuthMode(status, user);

    const login = (next?: string) => {
      setAuthError(null);
      if (!authConfig.configured) {
        window.location.assign(buildEntryUrl('login', next));
        return;
      }
      void initiateSignIn(authConfig, 'login', {
        storage: window.sessionStorage,
        win: window,
        next,
        onAuthorizeUrl: logAuthorizeUrl,
      }).then((res) => {
        if (res.error) {
          setAuthError({ code: 'network', message: 'Unable to start sign-in. Please try again.' });
          notify('error', 'Unable to start sign-in. Please try again.');
        }
      });
    };

    const signup = (next?: string) => {
      setAuthError(null);
      if (!authConfig.configured) {
        window.location.assign(buildEntryUrl('signup', next));
        return;
      }
      void initiateSignIn(authConfig, 'signup', {
        storage: window.sessionStorage,
        win: window,
        next,
        onAuthorizeUrl: logAuthorizeUrl,
      }).then((res) => {
        if (res.error) {
          setAuthError({ code: 'network', message: 'Unable to start sign-up. Please try again.' });
          notify('error', 'Unable to start sign-up. Please try again.');
        }
      });
    };

    const loginWithDemo = (email: string, password: string) => {
      const checked = validateDemoCredentials(email, password);
      if (checked.ok) {
        const demoSession = writeDemoSession(window.sessionStorage, checked.account, Date.now());
        setSession(demoSession);
        setStatus('authenticated');
        setAuthError(null);
        setCallbackError(null);
      }
      return checked;
    };

    const logout = () => {
      const result = signOut(authConfig, {
        storage: window.sessionStorage,
        origin: window.location.origin,
      });
      setSession(null);
      setStatus('unauthenticated');
      setAuthError(null);
      setCallbackError(null);
      if (result.dev) {
        window.location.assign('/');
      } else if (result.url) {
        window.location.assign(result.url);
      }
    };

    return {
      status,
      user,
      developmentMode: user?.developmentMode ?? false,
      authMode,
      authError,
      initializing: status === 'loading',
      processingCallback,
      callbackError,
      login,
      signup,
      loginWithDemo,
      logout,
    };
  }, [status, session, authError, processingCallback, callbackError, notify]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};