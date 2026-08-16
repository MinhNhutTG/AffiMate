import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { getToken, setToken, clearToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    authApi
      .fetchMe({ signal: controller.signal })
      .then(setUser)
      .catch((err) => {
        if (err.name !== 'AbortError') clearToken();
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    // Huỷ request khi effect chạy lại (StrictMode dev mode) hoặc unmount, tránh
    // gọi /auth/me lặp lại không cần thiết.
    return () => controller.abort();
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}
