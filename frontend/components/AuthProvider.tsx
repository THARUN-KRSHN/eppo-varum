'use client';
import { createContext, useContext, useEffect, useState } from 'react';
type User = { id: string; username: string; email: string };
type AuthContext = { user: User | null; token: string | null; ready: boolean; setSession: (token: string, user: User) => void; signOut: () => void };
const Context = createContext<AuthContext>({ user: null, token: null, ready: false, setSession: () => undefined, signOut: () => undefined });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [token, setToken] = useState<string | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { const savedToken = localStorage.getItem('eppo-varum-token') || localStorage.getItem('transitlens-token'); const savedUser = localStorage.getItem('eppo-varum-user') || localStorage.getItem('transitlens-user'); if (savedToken && savedUser) { setToken(savedToken); setUser(JSON.parse(savedUser)); } setReady(true); }, []);
  const setSession = (nextToken: string, nextUser: User) => { setToken(nextToken); setUser(nextUser); localStorage.setItem('eppo-varum-token', nextToken); localStorage.setItem('eppo-varum-user', JSON.stringify(nextUser)); };
  const signOut = () => { setToken(null); setUser(null); localStorage.removeItem('eppo-varum-token'); localStorage.removeItem('eppo-varum-user'); localStorage.removeItem('transitlens-token'); localStorage.removeItem('transitlens-user'); };
  return <Context.Provider value={{ user, token, ready, setSession, signOut }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
