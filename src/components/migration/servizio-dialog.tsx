'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/migration/auth-provider';
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
import { Servizio } from '@/types/migration';
import { toast } from 'sonner';

interface ServizioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servizio?: Servizio | null;
  onSuccess: () => void;
}

export function ServizioDialog({ open, onOpenChange, servizio, onSuccess }: ServizioDialogProps) {
  const { authFetch } = useAuth();
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!servizio;

  // Populate form when servizio changes or dialog opens
  useEffect(() => {
    if (open) {
      if (servizio) {
        setNome(servizio.nome);
        setDescrizione(servizio.descrizione || '');
      } else {
        setNome('');
        setDescrizione('');
      }
    }
  }, [open, servizio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('Il nome è obbligatorio');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/servizi/${servizio!.id}` : '/api/servizi';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        body: JSON.stringify({
          nome: nome.trim(),
          descrizione: descrizione.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante il salvataggio');
      }

      toast.success(isEditing ? 'Servizio aggiornato' : 'Servizio creato');
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
          <DialogTitle>{isEditing ? 'Modifica Servizio' : 'Nuovo Servizio'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica i dettagli del servizio.'
              : 'Crea un nuovo servizio per organizzare le applicazioni.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Es. CRM, ERP, Web Portal..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Input
                id="descrizione"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Descrizione opzionale del servizio"
              />
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
