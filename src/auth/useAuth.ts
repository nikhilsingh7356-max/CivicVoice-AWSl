import { createContext, useContext } from 'react';
import { AuthStatus, AuthUser } from './types';
import { DemoCredentialCheck } from './logic';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  developmentMode: boolean;
  initializing: boolean;
  processingCallback: boolean;
  callbackError: string | null;
  login: (next?: string) => void;
  signup: (next?: string) => void;
  /** Development mode only: validate demo credentials and open a simulated session. */
  loginWithDemo: (email: string, password: string) => DemoCredentialCheck;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}