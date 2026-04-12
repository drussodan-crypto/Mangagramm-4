import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";

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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data, isLoading: queryLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  useEffect(() => {
    if (!queryLoading) {
      if (data && !error) {
        setUser(data as unknown as User);
      }
      setIsLoading(false);
    }
  }, [data, queryLoading, error]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
