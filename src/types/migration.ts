export type TipologiaAmbiente =
  | 'TEST_INTERNO'
  | 'VALIDAZIONE'
  | 'TEST_CONCESSIONARI'
  | 'BENCHMARK'
  | 'PRODUZIONE';

export type TipoNodo = 'SINGOLO' | 'DOPPIO';

export type StatoAvanzamento =
  | 'NON_INIZIATO'
  | 'RICHIESTA_AMBIENTI'
  | 'CONFIGURAZIONE_AMBIENTI'
  | 'IN_TEST'
  | 'COMPLETATO';

export type StatoMigrazioneCodice =
  | 'DA_RIPROGETTARE'
  | 'DA_INIZIARE'
  | 'IN_PORTING'
  | 'DA_TESTARE'
  | 'IN_TEST'
  | 'OK';

export interface Ambiente {
  id: string;
  tipologia: TipologiaAmbiente;
  tipoNodo: TipoNodo;
  statoAvanzamento: StatoAvanzamento;
  // Date
  dataInizio: string | null;
  dataFine: string | null;
  // Nodo 1
  nomeMacchina1: string | null;
  macchineWS1: string | null;
  macchineJBoss1: string | null;
  // Nodo 2
  nomeMacchina2: string | null;
  macchineWS2: string | null;
  macchineJBoss2: string | null;
  // Altri campi
  dns: string | null;
  netscaler: string | null;
  richiestaCHG: string | null;
  riscontri: string | null;
  note: string | null;
  configurazioni: string | null;
  applicazioneId: string;
  createdAt: string;
  updatedAt: string;
  applicazione?: Applicazione;
}

export interface Applicazione {
  id: string;
  nome: string;
  descrizione: string | null;
  ordine: number;
  statoMigrazioneCodice: StatoMigrazioneCodice;
  servizioId: string;
  createdAt: string;
  updatedAt: string;
  servizio?: Servizio;
  ambienti?: Ambiente[];
}

export interface Servizio {
  id: string;
  nome: string;
  descrizione: string | null;
  ordine: number;
  createdAt: string;
  updatedAt: string;
  applicazioni?: Applicazione[];
}

export const TIPOLOGIA_AMBIENTE_LABELS: Record<TipologiaAmbiente, string> = {
  TEST_INTERNO: 'Test Interno',
  VALIDAZIONE: 'Validazione',
  TEST_CONCESSIONARI: 'Test Concessionari',
  BENCHMARK: 'Benchmark',
  PRODUZIONE: 'Produzione',
};

export const TIPO_NODO_LABELS: Record<TipoNodo, string> = {
  SINGOLO: 'Singolo',
  DOPPIO: 'Doppio',
};

export const TIPOLOGIA_AMBIENTE_COLORS: Record<TipologiaAmbiente, string> = {
  TEST_INTERNO: 'bg-blue-500',
  VALIDAZIONE: 'bg-yellow-500',
  TEST_CONCESSIONARI: 'bg-orange-500',
  BENCHMARK: 'bg-purple-500',
  PRODUZIONE: 'bg-red-500',
};

export const TIPOLOGIA_AMBIENTE_BORDER_COLORS: Record<TipologiaAmbiente, string> = {
  TEST_INTERNO: 'border-l-blue-500',
  VALIDAZIONE: 'border-l-yellow-500',
  TEST_CONCESSIONARI: 'border-l-orange-500',
  BENCHMARK: 'border-l-purple-500',
  PRODUZIONE: 'border-l-red-500',
};

export const STATO_AVANZAMENTO_LABELS: Record<StatoAvanzamento, string> = {
  NON_INIZIATO: 'Non Iniziato',
  RICHIESTA_AMBIENTI: 'Richiesta Ambienti',
  CONFIGURAZIONE_AMBIENTI: 'Configurazione Ambienti',
  IN_TEST: 'In Test',
  COMPLETATO: 'Completato',
};

// Colori stati avanzamento - stessi colori usati nell'import Excel
// NON_INIZIATO = bianco/nessun colore
// RICHIESTA_AMBIENTI = Arancione (#FFC000)
// CONFIGURAZIONE_AMBIENTI = Giallo (#FFFF00)
// IN_TEST = Azzurro (#5B9BD5)
// COMPLETATO = Verde (#70AD47)
export const STATO_AVANZAMENTO_COLORS: Record<StatoAvanzamento, string> = {
  NON_INIZIATO: 'bg-gray-400',
  RICHIESTA_AMBIENTI: 'bg-[#FFC000]',
  CONFIGURAZIONE_AMBIENTI: 'bg-[#FFFF00]',
  IN_TEST: 'bg-[#5B9BD5]',
  COMPLETATO: 'bg-[#70AD47]',
};

// Colori testo per stati avanzamento (giallo e arancione hanno testo scuro)
export const STATO_AVANZAMENTO_TEXT_COLORS: Record<StatoAvanzamento, string> = {
  NON_INIZIATO: 'text-white',
  RICHIESTA_AMBIENTI: 'text-black',
  CONFIGURAZIONE_AMBIENTI: 'text-black',
  IN_TEST: 'text-white',
  COMPLETATO: 'text-white',
};

export const STATO_AVANZAMENTO_PERCENTAGE: Record<StatoAvanzamento, number> = {
  NON_INIZIATO: 0,
  RICHIESTA_AMBIENTI: 25,
  CONFIGURAZIONE_AMBIENTI: 50,
  IN_TEST: 75,
  COMPLETATO: 100,
};

// Labels per stato migrazione codice
export const STATO_MIGRAZIONE_CODICE_LABELS: Record<StatoMigrazioneCodice, string> = {
  DA_RIPROGETTARE: 'Da Riprogettare',
  DA_INIZIARE: 'Da Iniziare',
  IN_PORTING: 'In Porting',
  DA_TESTARE: 'Da Testare',
  IN_TEST: 'In Test',
  OK: 'OK',
};

// Colori stati migrazione codice
// DA_RIPROGETTARE = Rosso (#FF0000)
// DA_INIZIARE = Arancione scuro (#ED7D31)
// IN_PORTING = Grigio (#A5A5A5)
// DA_TESTARE = Giallo arancio (#FFC000)
// IN_TEST = Azzurro (#5B9BD5)
// OK = Verde (#70AD47)
export const STATO_MIGRAZIONE_CODICE_COLORS: Record<StatoMigrazioneCodice, string> = {
  DA_RIPROGETTARE: 'bg-[#FF0000]',
  DA_INIZIARE: 'bg-[#ED7D31]',
  IN_PORTING: 'bg-[#A5A5A5]',
  DA_TESTARE: 'bg-[#FFC000]',
  IN_TEST: 'bg-[#5B9BD5]',
  OK: 'bg-[#70AD47]',
};

// Colori testo per stati migrazione codice
export const STATO_MIGRAZIONE_CODICE_TEXT_COLORS: Record<StatoMigrazioneCodice, string> = {
  DA_RIPROGETTARE: 'text-white',
  DA_INIZIARE: 'text-white',
  IN_PORTING: 'text-white',
  DA_TESTARE: 'text-black',
  IN_TEST: 'text-white',
  OK: 'text-white',
};

// Helper function to calculate app progress percentage
export function calculateAppProgress(ambienti: Ambiente[] | undefined): number {
  if (!ambienti || ambienti.length === 0) return 0;
  
  const totalPercentage = ambienti.reduce((sum, amb) => {
    return sum + (STATO_AVANZAMENTO_PERCENTAGE[amb.statoAvanzamento] || 0);
  }, 0);
  
  return Math.round(totalPercentage / ambienti.length);
}

// Helper function to calculate servizio progress percentage (based on applicazioni)
export function calculateServizioProgress(applicazioni: Applicazione[] | undefined): number {
  if (!applicazioni || applicazioni.length === 0) return 0;
  
  const totalPercentage = applicazioni.reduce((sum, app) => {
    return sum + calculateAppProgress(app.ambienti);
  }, 0);
  
  return Math.round(totalPercentage / applicazioni.length);
}

// Helper to get progress bar color based on percentage (stessi colori stati avanzamento)
export function getProgressColor(percentage: number): string {
  if (percentage === 100) return 'bg-[#70AD47]'; // Verde
  if (percentage >= 75) return 'bg-[#5B9BD5]';   // Azzurro
  if (percentage >= 50) return 'bg-[#FFFF00]';   // Giallo
  if (percentage >= 25) return 'bg-[#FFC000]';   // Arancione
  return 'bg-gray-400';
}
