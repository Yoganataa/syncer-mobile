import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, removeToken, setToken } from './api';
import log from './logger';

const authLog = log.extend('Auth');

interface AuthState {
  token: string | null;
  loading: boolean;
  requestOtp: () => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken()
      .then((t) => {
        setTokenState(t ?? null);
        authLog.debug(`token loaded: ${t ? 'exists' : 'none'}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const requestOtp = useCallback(async () => {
    authLog.debug('requesting OTP');
    await api.post('/auth/request-otp');
  }, []);

  const verifyOtp = useCallback(async (code: string) => {
    authLog.debug('verifying OTP');
    const res = await api.post<{ access_token: string; token_type: string }>(
      '/auth/verify-otp',
      { code },
    );
    await setToken(res.access_token);
    setTokenState(res.access_token);
    authLog.info('login success');
  }, []);

  const logout = useCallback(async () => {
    authLog.debug('logging out');
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    await removeToken();
    setTokenState(null);
    authLog.info('logged out');
  }, []);

  return (
    <AuthContext.Provider value={{ token, loading, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
