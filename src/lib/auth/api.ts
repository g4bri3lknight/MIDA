import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, canEdit, canDelete, canImport, canManageUsers, type UserRole } from '@/lib/auth';

/**
 * Risposta di errore per non autorizzato
 */
export function unauthorizedResponse(message = 'Non autorizzato') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Risposta di errore per forbidden
 */
export function forbiddenResponse(message = 'Permessi insufficienti') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Verifica che l'utente sia autenticato
 */
export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return { authorized: false, response: unauthorizedResponse() };
  }
  return { authorized: true, user };
}

/**
 * Verifica che l'utente abbia permessi di modifica
 */
export async function requireEdit(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return { authorized: false, response: unauthorizedResponse() };
  }
  if (!canEdit(user.role)) {
    return { authorized: false, response: forbiddenResponse('Permessi di modifica richiesti') };
  }
  return { authorized: true, user };
}

/**
 * Verifica che l'utente abbia permessi di eliminazione
 */
export async function requireDelete(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return { authorized: false, response: unauthorizedResponse() };
  }
  if (!canDelete(user.role)) {
    return { authorized: false, response: forbiddenResponse('Permessi di eliminazione richiesti') };
  }
  return { authorized: true, user };
}

/**
 * Verifica che l'utente abbia permessi di importazione
 */
export async function requireImport(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return { authorized: false, response: unauthorizedResponse() };
  }
  if (!canImport(user.role)) {
    return { authorized: false, response: forbiddenResponse('Permessi di importazione richiesti') };
  }
  return { authorized: true, user };
}

/**
 * Verifica che l'utente possa gestire utenti
 */
export async function requireManageUsers(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return { authorized: false, response: unauthorizedResponse() };
  }
  if (!canManageUsers(user.role)) {
    return { authorized: false, response: forbiddenResponse('Permessi di amministrazione richiesti') };
  }
  return { authorized: true, user };
}
