import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'mida-secret-key-change-in-production';

export type UserRole = 'ADMIN' | 'EDITOR';

export interface CurrentUser {
  id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
}

/**
 * Estrae il token dall'header Authorization
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Verifica il token JWT e restituisce l'utente
 */
export async function getCurrentUser(request: NextRequest): Promise<CurrentUser | null> {
  try {
    const token = extractToken(request);

    console.log('[Auth] Token presente:', !!token);

    if (!token) {
      console.log('[Auth] Nessun token trovato nell\'header Authorization');
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(SECRET_KEY)
    );
    
    console.log('[Auth] Token verificato, payload:', { id: payload.id, username: payload.username, role: payload.role });

    // Verifica che l'utente esista ancora e sia attivo
    const user = await db.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      console.log('[Auth] Utente non trovato o non attivo:', user ? { id: user.id, active: user.active } : 'non trovato');
      return null;
    }

    console.log('[Auth] Utente autenticato:', { id: user.id, username: user.username, role: user.role });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
    };
  } catch (error) {
    console.error('[Auth] Errore verifica token:', error);
    return null;
  }
}

/**
 * Alias for getCurrentUser for compatibility
 */
export const getSession = getCurrentUser;

/**
 * Verifica se l'utente è autenticato
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const user = await getCurrentUser(request);
  return !!user;
}

/**
 * Verifica se l'utente ha almeno il ruolo specificato
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    ADMIN: 2,
    EDITOR: 1,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Verifica se l'utente può modificare (ADMIN o EDITOR)
 */
export function canEdit(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}

/**
 * Alias for canEdit
 */
export const canEditRole = canEdit;

/**
 * Verifica se l'utente può gestire utenti (solo ADMIN)
 */
export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Verifica se l'utente può eliminare (solo ADMIN)
 */
export function canDelete(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Verifica se l'utente può importare dati (ADMIN o EDITOR)
 */
export function canImport(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}

/**
 * Richiede autenticazione - restituisce l'utente o null
 */
export async function requireAuth(request: NextRequest): Promise<CurrentUser | null> {
  return getCurrentUser(request);
}

/**
 * Richiede un ruolo minimo - restituisce l'utente o null se non autorizzato
 */
export async function requireRole(request: NextRequest, minRole: UserRole): Promise<{ user: CurrentUser | null; authorized: boolean }> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return { user: null, authorized: false };
  }
  
  return {
    user,
    authorized: hasRole(user.role, minRole),
  };
}
