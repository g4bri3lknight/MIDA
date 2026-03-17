'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

// In-memory token storage (survives within session but not page refresh in sandboxed env)
let memoryToken: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Funzione per fare fetch con il token di autenticazione
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    
    // Use memory token or state token
    const currentToken = memoryToken || token;
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
      const currentToken = memoryToken;
      
      if (!currentToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
      });
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
        setToken(currentToken);
      } else {
        setUser(null);
        setToken(null);
        memoryToken = null;
      }
    } catch (error) {
      console.error('[Auth] Error fetching session:', error);
      setUser(null);
      setToken(null);
      memoryToken = null;
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
        memoryToken = data.token;
        setToken(data.token);
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
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      memoryToken = null;
      setToken(null);
      setUser(null);
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
