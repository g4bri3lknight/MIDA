import { db } from './db';

export interface AuditLogEntry {
  entityType: 'SERVIZIO' | 'APPLICAZIONE' | 'AMBIENTE' | 'USER';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PASSWORD_RESET' | 'PASSWORD_CHANGE';
  entityName: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userAgent?: string;
  userId?: string;
}

/**
 * Registra un'azione nel log di audit
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        entityName: entry.entityName,
        fieldName: entry.fieldName || null,
        oldValue: entry.oldValue || null,
        newValue: entry.newValue || null,
        userAgent: entry.userAgent || null,
        userId: entry.userId || null,
      },
    });
  } catch (error) {
    console.error('Errore nel salvataggio audit log:', error);
  }
}

/**
 * Registra la creazione di un'entità
 */
export async function logCreate(
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  entityName: string,
  userAgent?: string,
  userId?: string
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'CREATE',
    entityName,
    userAgent,
    userId,
  });
}

/**
 * Registra l'aggiornamento di un'entità
 */
export async function logUpdate(
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  entityName: string,
  fieldName: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined,
  userAgent?: string,
  userId?: string
): Promise<void> {
  // Non loggare se i valori sono identici
  if (oldValue === newValue) return;
  
  await logAudit({
    entityType,
    entityId,
    action: 'UPDATE',
    entityName,
    fieldName,
    oldValue: oldValue?.toString() || null,
    newValue: newValue?.toString() || null,
    userAgent,
    userId,
  });
}

/**
 * Registra l'eliminazione di un'entità
 */
export async function logDelete(
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  entityName: string,
  userAgent?: string,
  userId?: string
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'DELETE',
    entityName,
    userAgent,
    userId,
  });
}

/**
 * Helper per registrare le modifiche di più campi
 */
export async function logChanges(
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  entityName: string,
  changes: { field: string; oldValue: unknown; newValue: unknown }[],
  userAgent?: string,
  userId?: string
): Promise<void> {
  for (const change of changes) {
    const oldVal = change.oldValue?.toString() || null;
    const newVal = change.newValue?.toString() || null;
    
    // Registra solo se i valori sono diverso
    if (oldVal !== newVal) {
      await logAudit({
        entityType,
        entityId,
        action: 'UPDATE',
        entityName,
        fieldName: change.field,
        oldValue: oldVal,
        newValue: newVal,
        userAgent,
        userId,
      });
    }
  }
}
