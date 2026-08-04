import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ user, profile, children }) {
  return <AuthContext.Provider value={{ user, profile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
