'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Applicazione, Servizio, StatoMigrazioneCodice, STATO_MIGRAZIONE_CODICE_LABELS } from '@/types/migration';
import { toast } from 'sonner';
import { useAuth } from './auth-provider';

interface ApplicazioneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicazione?: Applicazione | null;
  servizi: Servizio[];
  selectedServizioId?: string | null;
  onSuccess: () => void;
}

export function ApplicazioneDialog({
  open,
  onOpenChange,
  applicazione,
  servizi,
  selectedServizioId,
  onSuccess,
}: ApplicazioneDialogProps) {
  const { authFetch } = useAuth();
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [statoMigrazioneCodice, setStatoMigrazioneCodice] = useState<StatoMigrazioneCodice>('DA_RIPROGETTARE');
  const [servizioId, setServizioId] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!applicazione;

  // Populate form when applicazione changes or dialog opens
  useEffect(() => {
    if (open) {
      if (applicazione) {
        setNome(applicazione.nome);
        setDescrizione(applicazione.descrizione || '');
        setStatoMigrazioneCodice(applicazione.statoMigrazioneCodice || 'DA_RIPROGETTARE');
        setServizioId(applicazione.servizioId);
      } else {
        setNome('');
        setDescrizione('');
        setStatoMigrazioneCodice('DA_RIPROGETTARE');
        setServizioId(selectedServizioId || '');
      }
    }
  }, [open, applicazione, selectedServizioId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('Il nome è obbligatorio');
      return;
    }

    if (!servizioId) {
      toast.error('Seleziona un servizio');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/applicazioni/${applicazione!.id}` : '/api/applicazioni';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        body: JSON.stringify({
          nome: nome.trim(),
          descrizione: descrizione.trim() || null,
          statoMigrazioneCodice,
          servizioId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante il salvataggio');
      }

      toast.success(isEditing ? 'Applicazione aggiornata' : 'Applicazione creata');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Errore:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifica Applicazione' : 'Nuova Applicazione'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica i dettagli dell\'applicazione.'
              : 'Crea una nuova applicazione all\'interno di un servizio.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="servizio">Servizio *</Label>
              <Select value={servizioId} onValueChange={setServizioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un servizio" />
                </SelectTrigger>
                <SelectContent>
                  {servizi.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Es. Frontend, Backend, API..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Input
                id="descrizione"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Descrizione opzionale dell'applicazione"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="statoMigrazione">Stato Migrazione Codice *</Label>
              <Select 
                value={statoMigrazioneCodice} 
                onValueChange={(v) => setStatoMigrazioneCodice(v as StatoMigrazioneCodice)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATO_MIGRAZIONE_CODICE_LABELS) as [StatoMigrazioneCodice, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : isEditing ? 'Aggiorna' : 'Crea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
