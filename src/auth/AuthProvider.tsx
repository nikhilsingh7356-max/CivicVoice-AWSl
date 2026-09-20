import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AuthSession } from './types';
import { authConfig } from './config';
import {
  completeSignIn,
  initiateSignIn,
  readStoredSession,
  restoreSession,
  signOut,
} from './auth';
import { AuthContext, AuthContextValue } from './useAuth';
import { useToast } from '../components/ui/Toast';

function isCallbackRoute(pathname: string): boolean {
  return pathname === '/auth/callback';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useToast();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [processingCallback, setProcessingCallback] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

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
          const target = outcome.next.startsWith('/') ? outcome.next : `/${outcome.next}`;
          window.history.replaceState({}, '', target);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          window.history.replaceState({}, '', pathname);
          setStatus('unauthenticated');
          setCallbackError(outcome.message);
        }
        return;
      }

      try {
        const restored = await restoreSession(authConfig, {
          storage: window.sessionStorage,
          nowMs: Date.now(),
        });
        setSession(restored);
        setStatus(restored ? 'authenticated' : 'unauthenticated');
      } catch {
        setSession(null);
        setStatus('unauthenticated');
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;

    const login = (next?: string) => {
      void initiateSignIn(authConfig, 'login', {
        storage: window.sessionStorage,
        win: window,
        next,
      }).then((res) => {
        if (res.error) {
          setCallbackError('Unable to connect to CivicVoice.');
          notify('error', 'Unable to connect to CivicVoice.');
        }
      });
    };

    const signup = (next?: string) => {
      void initiateSignIn(authConfig, 'signup', {
        storage: window.sessionStorage,
        win: window,
        next,
      }).then((res) => {
        if (res.error) {
          setCallbackError('Unable to connect to CivicVoice.');
          notify('error', 'Unable to connect to CivicVoice.');
        }
      });
    };

    const logout = () => {
      const result = signOut(authConfig, {
        storage: window.sessionStorage,
        origin: window.location.origin,
      });
      setSession(null);
      setStatus('unauthenticated');
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
      initializing: status === 'loading',
      processingCallback,
      callbackError,
      login,
      signup,
      logout,
    };
  }, [status, session, processingCallback, callbackError, notify]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};