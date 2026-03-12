'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ambiente, TIPOLOGIA_AMBIENTE_LABELS, TIPOLOGIA_AMBIENTE_COLORS, STATO_AVANZAMENTO_LABELS, STATO_AVANZAMENTO_COLORS, STATO_AVANZAMENTO_TEXT_COLORS } from '@/types/migration';
import { Server, Network, FileText, Pencil, Trash2, Calendar } from 'lucide-react';

// Helper per formattare le date
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateString;
  }
}

// Helper per mostrare valore o placeholder
function displayValue(value: string | null, placeholder: string = '-'): string {
  if (!value || value.trim() === '') return placeholder;
  return value;
}

interface AmbienteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambiente: Ambiente | null;
  onEdit: (ambiente: Ambiente) => void;
  onDelete: (ambiente: Ambiente) => void;
}

export function AmbienteDetailDialog({
  open,
  onOpenChange,
  ambiente,
  onEdit,
  onDelete,
}: AmbienteDetailDialogProps) {
  if (!ambiente) return null;

  const isDoppio = ambiente.tipoNodo === 'DOPPIO';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-semibold">Dettaglio Ambiente</span>
            <Badge className={`${TIPOLOGIA_AMBIENTE_COLORS[ambiente.tipologia]} text-white text-sm px-2.5 py-0.5`}>
              {TIPOLOGIA_AMBIENTE_LABELS[ambiente.tipologia]}
            </Badge>
            <Badge className={`${STATO_AVANZAMENTO_COLORS[ambiente.statoAvanzamento || 'NON_INIZIATO']} ${STATO_AVANZAMENTO_TEXT_COLORS[ambiente.statoAvanzamento || 'NON_INIZIATO']} text-sm px-2.5 py-0.5`}>
              {STATO_AVANZAMENTO_LABELS[ambiente.statoAvanzamento || 'NON_INIZIATO']}
            </Badge>
            <Badge variant="outline" className="font-mono text-sm px-2.5 py-0.5">
              {ambiente.richiestaCHG ? `CHG: ${ambiente.richiestaCHG}` : 'Nessuna CHG'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Data inizio:</span>{' '}
                <span className={`font-medium ${!ambiente.dataInizio ? 'text-muted-foreground italic' : ''}`}>
                  {formatDate(ambiente.dataInizio)}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Data fine:</span>{' '}
                <span className={`font-medium ${!ambiente.dataFine ? 'text-muted-foreground italic' : ''}`}>
                  {formatDate(ambiente.dataFine)}
                </span>
              </div>
            </div>
          </div>

          {/* Nodo 1 - Sempre visibile */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-3 text-sm">
              {isDoppio ? 'Nodo 1' : 'Configurazione Macchina'}
            </h4>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Server className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground">Macchina/IP da migrare:</span>{' '}
                  <span className={`font-mono ${!ambiente.nomeMacchina1 ? 'text-muted-foreground italic' : ''}`}>
                    {displayValue(ambiente.nomeMacchina1)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">WS:</span>{' '}
                    <span className={!ambiente.macchineWS1 ? 'text-muted-foreground italic' : ''}>
                      {displayValue(ambiente.macchineWS1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">JBoss:</span>{' '}
                    <span className={!ambiente.macchineJBoss1 ? 'text-muted-foreground italic' : ''}>
                      {displayValue(ambiente.macchineJBoss1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nodo 2 - Solo se DOPPIO */}
          {isDoppio && (
            <div className="border rounded-lg p-4 bg-muted/30 border-primary/30">
              <h4 className="font-medium mb-3 text-sm text-primary">Nodo 2</h4>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Server className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Macchina/IP da migrare:</span>{' '}
                    <span className={`font-mono ${!ambiente.nomeMacchina2 ? 'text-muted-foreground italic' : ''}`}>
                      {displayValue(ambiente.nomeMacchina2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="space-y-1">
                    <div>
                      <span className="text-muted-foreground">WS:</span>{' '}
                      <span className={!ambiente.macchineWS2 ? 'text-muted-foreground italic' : ''}>
                        {displayValue(ambiente.macchineWS2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">JBoss:</span>{' '}
                      <span className={!ambiente.macchineJBoss2 ? 'text-muted-foreground italic' : ''}>
                        {displayValue(ambiente.macchineJBoss2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DNS e Netscaler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-2 text-sm">
              <Network className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">DNS:</span>{' '}
                <span className={`font-mono ${!ambiente.dns ? 'text-muted-foreground italic' : ''}`}>
                  {displayValue(ambiente.dns)}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Network className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Netscaler:</span>{' '}
                <span className={`font-mono ${!ambiente.netscaler ? 'text-muted-foreground italic' : ''}`}>
                  {displayValue(ambiente.netscaler)}
                </span>
              </div>
            </div>
          </div>

          {/* Configurazioni */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm">
            <span className="text-muted-foreground">Configurazioni:</span>{' '}
            <span className={!ambiente.configurazioni ? 'text-muted-foreground italic' : ''}>
              {displayValue(ambiente.configurazioni)}
            </span>
          </div>

          {/* Note */}
          <div className="p-3 bg-muted/50 rounded text-sm">
            <span className="text-muted-foreground font-medium">Note:</span>
            <p className={`mt-1 whitespace-pre-wrap ${!ambiente.note ? 'text-muted-foreground italic' : ''}`}>
              {displayValue(ambiente.note)}
            </p>
          </div>

          {/* Riscontri */}
          <div className="p-3 bg-muted/50 rounded text-sm">
            <span className="text-muted-foreground font-medium">Riscontri:</span>
            <p className={`mt-1 whitespace-pre-wrap ${!ambiente.riscontri ? 'text-muted-foreground italic' : ''}`}>
              {displayValue(ambiente.riscontri)}
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onEdit(ambiente);
              }}
            >
              <Pencil className="h-4 w-4 mr-0.5" />
              Modifica
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onOpenChange(false);
                onDelete(ambiente);
              }}
            >
              <Trash2 className="h-4 w-4 mr-0.5" />
              Elimina
            </Button>
          </div>
          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
          >
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
