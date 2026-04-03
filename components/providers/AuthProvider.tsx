'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string | null;
  role: 'patient' | 'reception' | 'doctor';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string, mode?: 'email' | 'phone') => Promise<{ error?: string }>;
  register: (data: RegisterData) => Promise<{ error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) return;

        const data = await res.json();
        if (!isMounted || !data?.user) return;

        setUser(data.user);
        // Keep a non-sensitive sentinel token for legacy fetch guards in UI.
        setToken('session');
      } catch {
        // No-op: unauthenticated session.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier: string, password: string, mode: 'email' | 'phone' = 'email') => {
    try {
      const body = mode === 'phone'
        ? { phone: identifier, password }
        : { email: identifier, password };
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Login failed' };

      setToken('session');
      setUser(data.user);

      const redirectMap: Record<string, string> = {
        reception: '/reception/dashboard',
        doctor: '/doctor/dashboard',
        patient: '/patient/dashboard',
      };
      router.push(redirectMap[data.user.role] || '/');
      return {};
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return { error: result.error || 'Registration failed' };

      setToken('session');
      setUser(result.user);
      router.push('/patient/dashboard');
      return {};
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
