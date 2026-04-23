'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type UserRole = 'ADMIN' | 'EDITOR';

export interface AuthUser {
  id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canImport: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'mida_auth_token';

// Helpers per localStorage (safe per SSR)
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(t: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage non disponibile
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Ref per avere sempre il token più recente nei callback senza ricrearli
  const tokenRef = useRef<string | null>(null);

  // Sincronizza ref con state/token
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Funzione per fare fetch con il token di autenticazione
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    
    // Only set Content-Type to JSON if body is not FormData
    if (!(options.body instanceof FormData)) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
    
    // Usa il token dal ref (sempre aggiornato) o dallo state
    const currentToken = tokenRef.current || token;
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  }, [token]);

  const fetchSession = useCallback(async () => {
    try {
      // Prima prova a leggere il token da localStorage
      const storedToken = getStoredToken();
      
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
        setToken(storedToken);
        tokenRef.current = storedToken;
      } else {
        // Token non valido, rimuovi
        setUser(null);
        setToken(null);
        tokenRef.current = null;
        setStoredToken(null);
      }
    } catch (error) {
      console.error('[Auth] Error fetching session:', error);
      setUser(null);
      setToken(null);
      tokenRef.current = null;
      setStoredToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        setToken(data.token);
        tokenRef.current = data.token;
        setStoredToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: data.error || 'Errore durante il login' };
    } catch (error) {
      return { success: false, error: 'Errore di connessione' };
    }
  };

  const logout = async () => {
    try {
      const currentToken = tokenRef.current;
      if (currentToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` },
        });
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      tokenRef.current = null;
      setStoredToken(null);
    }
  };

  const refreshSession = async () => {
    await fetchSession();
  };

  const isAuthenticated = !!user;
  const canEdit = user?.role === 'ADMIN' || user?.role === 'EDITOR';
  const canDelete = user?.role === 'ADMIN';
  const canManageUsers = user?.role === 'ADMIN';
  const canImport = user?.role === 'ADMIN' || user?.role === 'EDITOR';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        canEdit,
        canDelete,
        canManageUsers,
        canImport,
        token,
        login,
        logout,
        refreshSession,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
