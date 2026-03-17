'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  Server,
  Box,
  Monitor,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Users,
  KeyRound,
} from 'lucide-react';
import { useAuth } from './auth-provider';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  entityName: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  PASSWORD_RESET: KeyRound,
  PASSWORD_CHANGE: KeyRound,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PASSWORD_RESET: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  PASSWORD_CHANGE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creato',
  UPDATE: 'Modificato',
  DELETE: 'Eliminato',
  PASSWORD_RESET: 'Password Resettata',
  PASSWORD_CHANGE: 'Password Cambiata',
};

const ENTITY_ICONS: Record<string, typeof Server> = {
  SERVIZIO: Server,
  APPLICAZIONE: Box,
  AMBIENTE: Monitor,
  USER: Users,
};

const ENTITY_LABELS: Record<string, string> = {
  SERVIZIO: 'Servizio',
  APPLICAZIONE: 'Applicazione',
  AMBIENTE: 'Ambiente',
  USER: 'Utente',
};

// Traduzione dei nomi dei campi in italiano
const FIELD_LABELS: Record<string, string> = {
  // Servizi e Applicazioni
  nome: 'Nome',
  descrizione: 'Descrizione',
  ordine: 'Ordine',
  statoMigrazioneCodice: 'Stato Migrazione Codice',
  servizioId: 'Servizio',
  
  // Ambienti
  tipologia: 'Tipologia',
  tipoNodo: 'Tipo Nodo',
  statoAvanzamento: 'Stato Avanzamento',
  dataInizio: 'Data Inizio',
  dataFine: 'Data Fine',
  nomeMacchina1: 'Nome Macchina 1',
  macchineWS1: 'Macchine WS 1',
  macchineJBoss1: 'Macchine JBoss 1',
  nomeMacchina2: 'Nome Macchina 2',
  macchineWS2: 'Macchine WS 2',
  macchineJBoss2: 'Macchine JBoss 2',
  dns: 'DNS',
  netscaler: 'Netscaler',
  richiestaCHG: 'Richiesta CHG',
  riscontri: 'Riscontri',
  note: 'Note',
  configurazioni: 'Configurazioni',
};

export function AuditLogPanel() {
  const { authFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/audit?limit=200');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else {
        console.error('Errore risposta audit log:', response.status, response.statusText);
        setLogs([]);
      }
    } catch (error) {
      console.error('Errore caricamento audit log:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Listen for custom event to open dialog
  useEffect(() => {
    const handleOpenDialog = () => setOpen(true);
    window.addEventListener('openAuditLog', handleOpenDialog);
    return () => window.removeEventListener('openAuditLog', handleOpenDialog);
  }, []);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, fetchLogs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateGroup = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Raggruppa i log per data
  const groupedLogs = logs.reduce((acc, log) => {
    const date = new Date(log.createdAt).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  const toggleGroup = (date: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Storico Modifiche
          </SheetTitle>
          <SheetDescription>
            Ultime modifiche apportate ai servizi, applicazioni e ambienti
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessuna modifica registrata
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                <div key={date} className="space-y-2">
                  <button
                    className="flex items-center gap-2 w-full text-left font-medium text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => toggleGroup(date)}
                  >
                    {expandedGroups.has(date) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {formatDateGroup(dateLogs[0].createdAt)}
                    <Badge variant="secondary" className="ml-auto">
                      {dateLogs.length}
                    </Badge>
                  </button>
                  
                  {expandedGroups.has(date) && (
                    <div className="space-y-2 pl-6">
                      {dateLogs.map((log) => {
                        const ActionIcon = ACTION_ICONS[log.action as keyof typeof ACTION_ICONS] || Pencil;
                        const EntityIcon = ENTITY_ICONS[log.entityType as keyof typeof ENTITY_ICONS] || Monitor;
                        
                        return (
                          <div
                            key={log.id}
                            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <div className={`p-2 rounded-md ${ACTION_COLORS[log.action as keyof typeof ACTION_COLORS]}`}>
                              <ActionIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <EntityIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium truncate">{log.entityName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {ENTITY_LABELS[log.entityType as keyof typeof ENTITY_LABELS] || log.entityType}
                                </Badge>
                              </div>
                              
                              {log.fieldName && (
                                <div className="mt-1 text-sm">
                                  <span className="text-muted-foreground">{FIELD_LABELS[log.fieldName] || log.fieldName}: </span>
                                  {log.oldValue && (
                                    <span className="line-through text-red-600 dark:text-red-400">
                                      {log.oldValue}
                                    </span>
                                  )}
                                  {log.oldValue && log.newValue && ' → '}
                                  {log.newValue && (
                                    <span className="text-green-600 dark:text-green-400">
                                      {log.newValue}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(log.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
