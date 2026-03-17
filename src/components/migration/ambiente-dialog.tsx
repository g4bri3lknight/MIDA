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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ambiente, Servizio, TipologiaAmbiente, TipoNodo, StatoAvanzamento, TIPOLOGIA_AMBIENTE_LABELS, STATO_AVANZAMENTO_LABELS } from '@/types/migration';
import { toast } from 'sonner';

interface AmbienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambiente?: Ambiente | null;
  servizi: Servizio[];
  selectedApplicazioneId?: string | null;
  onSuccess: () => void;
}

// Find selected application's service
function getServizioForApplicazione(servizi: Servizio[], appId: string): Servizio | undefined {
  for (const servizio of servizi) {
    const app = servizio.applicazioni?.find((a) => a.id === appId);
    if (app) return servizio;
  }
  return undefined;
}

export function AmbienteDialog({
  open,
  onOpenChange,
  ambiente,
  servizi,
  selectedApplicazioneId,
  onSuccess,
}: AmbienteDialogProps) {
  const [tipologia, setTipologia] = useState<TipologiaAmbiente>('TEST_INTERNO');
  const [tipoNodo, setTipoNodo] = useState<TipoNodo>('SINGOLO');
  const [statoAvanzamento, setStatoAvanzamento] = useState<StatoAvanzamento>('NON_INIZIATO');
  // Date
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  // Nodo 1
  const [nomeMacchina1, setNomeMacchina1] = useState('');
  const [macchineWS1, setMacchineWS1] = useState('');
  const [macchineJBoss1, setMacchineJBoss1] = useState('');
  // Nodo 2
  const [nomeMacchina2, setNomeMacchina2] = useState('');
  const [macchineWS2, setMacchineWS2] = useState('');
  const [macchineJBoss2, setMacchineJBoss2] = useState('');
  // Altri campi
  const [dns, setDns] = useState('');
  const [netscaler, setNetscaler] = useState('');
  const [richiestaCHG, setRichiestaCHG] = useState('');
  const [note, setNote] = useState('');
  const [riscontri, setRiscontri] = useState('');
  const [configurazioni, setConfigurazioni] = useState('');
  const [applicazioneId, setApplicazioneId] = useState('');
  const [selectedServizioId, setSelectedServizioId] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!ambiente;
  const isDoppio = tipoNodo === 'DOPPIO';

  // Populate form when ambiente changes or dialog opens
  useEffect(() => {
    if (open) {
      if (ambiente) {
        // Editing existing ambiente - populate all fields
        setTipologia(ambiente.tipologia);
        setTipoNodo(ambiente.tipoNodo);
        setStatoAvanzamento(ambiente.statoAvanzamento || 'NON_INIZIATO');
        // Date - converti da ISO a formato input date (YYYY-MM-DD)
        setDataInizio(ambiente.dataInizio ? ambiente.dataInizio.split('T')[0] : '');
        setDataFine(ambiente.dataFine ? ambiente.dataFine.split('T')[0] : '');
        setNomeMacchina1(ambiente.nomeMacchina1 || '');
        setMacchineWS1(ambiente.macchineWS1 || '');
        setMacchineJBoss1(ambiente.macchineJBoss1 || '');
        setNomeMacchina2(ambiente.nomeMacchina2 || '');
        setMacchineWS2(ambiente.macchineWS2 || '');
        setMacchineJBoss2(ambiente.macchineJBoss2 || '');
        setDns(ambiente.dns || '');
        setNetscaler(ambiente.netscaler || '');
        setRichiestaCHG(ambiente.richiestaCHG || '');
        setNote(ambiente.note || '');
        setRiscontri(ambiente.riscontri || '');
        setConfigurazioni(ambiente.configurazioni || '');
        setApplicazioneId(ambiente.applicazioneId);
        const servizio = getServizioForApplicazione(servizi, ambiente.applicazioneId);
        setSelectedServizioId(servizio?.id || '');
      } else {
        // New ambiente - reset or use selectedApplicazioneId
        setTipologia('TEST_INTERNO');
        setTipoNodo('SINGOLO');
        setStatoAvanzamento('NON_INIZIATO');
        setDataInizio('');
        setDataFine('');
        setNomeMacchina1('');
        setMacchineWS1('');
        setMacchineJBoss1('');
        setNomeMacchina2('');
        setMacchineWS2('');
        setMacchineJBoss2('');
        setDns('');
        setNetscaler('');
        setRichiestaCHG('');
        setNote('');
        setRiscontri('');
        setConfigurazioni('');
        
        if (selectedApplicazioneId) {
          setApplicazioneId(selectedApplicazioneId);
          const servizio = getServizioForApplicazione(servizi, selectedApplicazioneId);
          setSelectedServizioId(servizio?.id || '');
        } else {
          setApplicazioneId('');
          setSelectedServizioId('');
        }
      }
    }
  }, [open, ambiente, selectedApplicazioneId, servizi]);

  const handleServizioChange = (servId: string) => {
    setSelectedServizioId(servId);
    setApplicazioneId('');
  };

  const availableApplicazioni = servizi.find((s) => s.id === selectedServizioId)?.applicazioni || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicazioneId) {
      toast.error('Seleziona un\'applicazione');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/ambienti/${ambiente!.id}` : '/api/ambienti';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipologia,
          tipoNodo,
          statoAvanzamento,
          dataInizio: dataInizio || null,
          dataFine: dataFine || null,
          nomeMacchina1: nomeMacchina1.trim() || null,
          macchineWS1: macchineWS1.trim() || null,
          macchineJBoss1: macchineJBoss1.trim() || null,
          nomeMacchina2: nomeMacchina2.trim() || null,
          macchineWS2: macchineWS2.trim() || null,
          macchineJBoss2: macchineJBoss2.trim() || null,
          dns: dns.trim() || null,
          netscaler: netscaler.trim() || null,
          richiestaCHG: richiestaCHG.trim() || null,
          note: note.trim() || null,
          riscontri: riscontri.trim() || null,
          configurazioni: configurazioni.trim() || null,
          applicazioneId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante il salvataggio');
      }

      toast.success(isEditing ? 'Ambiente aggiornato' : 'Ambiente creato');
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
      <DialogContent className="sm:max-w-[650px] md:max-w-[800px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifica Ambiente' : 'Nuovo Ambiente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica i dettagli dell\'ambiente.'
              : 'Crea un nuovo ambiente all\'interno di un\'applicazione.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Selezione Servizio e Applicazione */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Servizio *</Label>
                <Select value={selectedServizioId} onValueChange={handleServizioChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona servizio" />
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
                <Label>Applicazione *</Label>
                <Select 
                  value={applicazioneId} 
                  onValueChange={setApplicazioneId}
                  disabled={!selectedServizioId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona applicazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApplicazioni.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipologia, Richiesta CHG, Stato Avanzamento e Tipo Nodo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Tipologia Ambiente *</Label>
                <Select value={tipologia} onValueChange={(v) => setTipologia(v as TipologiaAmbiente)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPOLOGIA_AMBIENTE_LABELS) as [TipologiaAmbiente, string][]).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Richiesta CHG</Label>
                <Input
                  value={richiestaCHG}
                  onChange={(e) => setRichiestaCHG(e.target.value)}
                  placeholder="Es. CHG123456"
                />
              </div>
              <div className="grid gap-2">
                <Label>Stato Avanzamento *</Label>
                <Select value={statoAvanzamento} onValueChange={(v) => setStatoAvanzamento(v as StatoAvanzamento)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATO_AVANZAMENTO_LABELS) as [StatoAvanzamento, string][]).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tipo Nodo *</Label>
                <Select value={tipoNodo} onValueChange={(v) => setTipoNodo(v as TipoNodo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGOLO">Singolo</SelectItem>
                    <SelectItem value="DOPPIO">Doppio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data inizio e Data fine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data Inizio</Label>
                <Input
                  type="date"
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Data Fine</Label>
                <Input
                  type="date"
                  value={dataFine}
                  onChange={(e) => setDataFine(e.target.value)}
                />
              </div>
            </div>

            {/* Nodo 1 - Sempre visibile */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium mb-3 text-sm">
                {isDoppio ? 'Nodo 1' : 'Configurazione Macchina'}
              </h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Macchina / IP esistente da migrare {isDoppio ? '(Nodo 1)' : ''}</Label>
                  <Input
                    value={nomeMacchina1}
                    onChange={(e) => setNomeMacchina1(e.target.value)}
                    placeholder="Es. server01.local o 192.168.1.100"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Macchina WS {isDoppio ? '(Nodo 1)' : ''}</Label>
                    <Input
                      value={macchineWS1}
                      onChange={(e) => setMacchineWS1(e.target.value)}
                      placeholder="Es. ws01, ws02"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Macchina JBoss {isDoppio ? '(Nodo 1)' : ''}</Label>
                    <Input
                      value={macchineJBoss1}
                      onChange={(e) => setMacchineJBoss1(e.target.value)}
                      placeholder="Es. jboss01, jboss02"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Nodo 2 - Solo se DOPPIO */}
            {isDoppio && (
              <div className="border rounded-lg p-4 bg-muted/30 border-primary/30">
                <h4 className="font-medium mb-3 text-sm text-primary">Nodo 2</h4>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Macchina / IP esistente da migrare (Nodo 2)</Label>
                    <Input
                      value={nomeMacchina2}
                      onChange={(e) => setNomeMacchina2(e.target.value)}
                      placeholder="Es. server02.local o 192.168.1.101"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Macchina WS (Nodo 2)</Label>
                      <Input
                        value={macchineWS2}
                        onChange={(e) => setMacchineWS2(e.target.value)}
                        placeholder="Es. ws03, ws04"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Macchina JBoss (Nodo 2)</Label>
                      <Input
                        value={macchineJBoss2}
                        onChange={(e) => setMacchineJBoss2(e.target.value)}
                        placeholder="Es. jboss03, jboss04"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DNS e Netscaler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>DNS</Label>
                <Input
                  value={dns}
                  onChange={(e) => setDns(e.target.value)}
                  placeholder="Es. app.example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Netscaler</Label>
                <Input
                  value={netscaler}
                  onChange={(e) => setNetscaler(e.target.value)}
                  placeholder="Es. ns-prod.local"
                />
              </div>
            </div>

            {/* Configurazioni */}
            <div className="grid gap-2">
              <Label>Configurazioni</Label>
              <Input
                value={configurazioni}
                onChange={(e) => setConfigurazioni(e.target.value)}
                placeholder="Dettagli configurazione"
              />
            </div>

            {/* Note */}
            <div className="grid gap-2">
              <Label>Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note aggiuntive sull'ambiente..."
                rows={3}
              />
            </div>

            {/* Riscontri */}
            <div className="grid gap-2">
              <Label>Riscontri</Label>
              <Textarea
                value={riscontri}
                onChange={(e) => setRiscontri(e.target.value)}
                placeholder="Riscontri..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Annulla
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Salvataggio...' : isEditing ? 'Aggiorna' : 'Crea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
