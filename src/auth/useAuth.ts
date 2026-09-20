import { createContext, useContext } from 'react';
import { AuthStatus, AuthUser } from './types';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  developmentMode: boolean;
  initializing: boolean;
  processingCallback: boolean;
  callbackError: string | null;
  login: (next?: string) => void;
  signup: (next?: string) => void;
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