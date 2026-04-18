import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: () => {},
  login: () => {},
  logout: () => {},
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUser(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(() => {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `${BASE}/api/login?returnTo=${returnTo}`;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
    window.location.href = `${BASE}/api/logout`;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
