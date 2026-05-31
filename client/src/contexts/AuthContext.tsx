import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, Employee } from '../lib/api';

interface AuthContextType {
  user: Employee | null;
  role: string | null;
  loading: boolean;
  signIn: (loginId: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, role: null, loading: true,
  signIn: async () => ({}),
  signOut: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('hrms_token');
    if (!token) { setLoading(false); return; }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      localStorage.removeItem('hrms_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshUser(); }, []);

  const signIn = async (loginId: string, password: string): Promise<{ error?: string }> => {
    try {
      const { token, user: userData } = await api.signIn(loginId, password);
      localStorage.setItem('hrms_token', token);
      setUser(userData);
      return {};
    } catch (err: unknown) {
      return { error: (err as Error).message || 'Invalid credentials' };
    }
  };

  const signOut = () => {
    localStorage.removeItem('hrms_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
