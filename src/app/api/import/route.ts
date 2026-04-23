import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx-js-style';
import * as fs from 'fs';
import * as path from 'path';
import { requireImport } from '@/lib/auth/api';

// Mappa tipologia ambiente da stringa a enum
function mapTipologiaAmbiente(tipo: string | undefined): string {
  if (!tipo) return 'TEST_INTERNO';

  const tipoLower = tipo.toLowerCase().trim();

  const mappings: Record<string, string> = {
    'test interno': 'TEST_INTERNO',
    'testinterno': 'TEST_INTERNO',
    'ti': 'TEST_INTERNO',
    'test': 'TEST_INTERNO',
    'validazione': 'VALIDAZIONE',
    'val': 'VALIDAZIONE',
    'test concessionari': 'TEST_CONCESSIONARI',
    'testconcessionari': 'TEST_CONCESSIONARI',
    'tc': 'TEST_CONCESSIONARI',
    'benchmark': 'BENCHMARK',
    'bm': 'BENCHMARK',
    'produzione': 'PRODUZIONE',
    'prod': 'PRODUZIONE',
    'prd': 'PRODUZIONE',
  };

  return mappings[tipoLower] || 'TEST_INTERNO';
}

// Mappa stato migrazione codice da stringa a enum
function mapStatoMigrazioneCodice(stato: string | undefined): string {
  if (!stato) return 'DA_INIZIARE';

  const statoUpper = stato.toUpperCase().trim();

  const mappings: Record<string, string> = {
    'DA RIPROGETTARE': 'DA_RIPROGETTARE',
    'DA_RIPROGETTARE': 'DA_RIPROGETTARE',
    'DA FARE': 'DA_INIZIARE',
    'DA_INIZIARE': 'DA_INIZIARE',
    'IN PORTING': 'IN_PORTING',
    'IN_PORTING': 'IN_PORTING',
    'DA TESTARE': 'DA_TESTARE',
    'DA_TESTARE': 'DA_TESTARE',
    'IN TEST': 'IN_TEST',
    'IN_TEST': 'IN_TEST',
    'OK': 'OK',
  };

  return mappings[statoUpper] || 'DA_INIZIARE';
}

// Mappa colore di sfondo a stato avanzamento
function mapColorToStatoAvanzamento(fgColor: XLSX.CellStyleColor | null): string {
  if (!fgColor) return 'NON_INIZIATO';
  
  // Check RGB first (more reliable than theme)
  if (fgColor.rgb) {
    let rgb = fgColor.rgb.toUpperCase();
    
    // Remove alpha channel if present (AARRGGBB -> RRGGBB)
    if (rgb.length === 8) {
      rgb = rgb.slice(2);
    }
    
    const colorMap: Record<string, string> = {
      'FFC000': 'RICHIESTA_AMBIENTI',      // Arancione
      'FFFF00': 'CONFIGURAZIONE_AMBIENTI', // Giallo
      '5B9BD5': 'IN_TEST',                 // Azzurro
      '70AD47': 'COMPLETATO',              // Verde
    };
    
    if (colorMap[rgb]) return colorMap[rgb];
    
    // White or transparent = NON_INIZIATO
    if (rgb === 'FFFFFF' || rgb === '00000000' || rgb === '000000') {
      return 'NON_INIZIATO';
    }
  }
  
  return 'NON_INIZIATO';
}

// Parse date from Excel serial number or string (with optional text)
function parseExcelDate(value: string | number | undefined): Date | null {
  if (!value) return null;

  if (typeof value === 'number') {
    // Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date;
  }

  if (typeof value === 'string') {
    const str = value.trim();

    // Pattern per vari formati di data
    const datePatterns = [
      // dd/mm/yyyy o dd-mm-yyyy
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
      // yyyy-mm-dd (ISO format)
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
      // dd.mm.yyyy
      /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g,
      // dd month yyyy (es. 15 marzo 2024)
      /\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})\b/gi,
    ];

    const monthNames: Record<string, number> = {
      'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
      'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
      'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
    };

    // Cerca il primo match valido
    for (const pattern of datePatterns) {
      const matches = [...str.matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[0];
        let day: number, month: number, year: number;

        if (pattern.source.includes('gennaio')) {
          // Formato: dd month yyyy
          day = parseInt(match[1], 10);
          month = monthNames[match[2].toLowerCase()];
          year = parseInt(match[3], 10);
        } else if (pattern.source.startsWith('\\b(\\d{4})')) {
          // Formato: yyyy-mm-dd o yyyy/mm/dd
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          day = parseInt(match[3], 10);
        } else {
          // Formato: dd/mm/yyyy, dd-mm-yyyy o dd.mm.yyyy
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          year = parseInt(match[3], 10);
        }

        // Valida la data
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime()) && date.getFullYear() === year &&
            date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }

    // Fallback: prova a parsare direttamente la stringa
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

// Definizione delle colonne riconosciute con alias
interface ColumnDef {
  key: string;
  aliases: string[];
}

const COLUMN_DEFINITIONS: ColumnDef[] = [
  { key: 'applicazione', aliases: ['applicazione', 'application', 'app', 'nome app', 'progetto'] },
  { key: 'dataInizio', aliases: ['data inizio', 'datainizio', 'inizio', 'datainizio', 'start date', 'inizio migrazione'] },
  { key: 'dataFine', aliases: ['data fine', 'datafine', 'fine', 'datafine', 'end date', 'fine migrazione'] },
  { key: 'ambiente', aliases: ['ambiente', 'environment', 'env', 'tipo ambiente', 'tipologia'] },
  { key: 'tipo', aliases: ['tipo', 'type', 'nodo', 'tipo nodo', 'tipo_nodo'] },
  { key: 'dns', aliases: ['dns', 'nome dns'] },
  { key: 'netscaler', aliases: ['netscaler', 'net', 'vip', 'netscaler/vip'] },
  { key: 'macchineWS', aliases: ['macchine ws', 'macchinews', 'ws', 'web server', 'macchine web', 'macchine ws/jboss'] },
  { key: 'macchineJBoss', aliases: ['macchine jboss', 'macchinejboss', 'jboss', 'app server', 'macchine app', 'macchine jboss/ws'] },
  { key: 'note', aliases: ['note', 'notes', 'annotazioni', 'commenti', 'osservazioni'] },
  { key: 'riscontri', aliases: ['riscontri', 'riscontro', 'check', 'verifica', 'riscontri/note'] },
  { key: 'conf', aliases: ['conf', 'config', 'configurazioni', 'configurazione', 'config'] },
  { key: 'macchinaMigrare', aliases: ['macchina', 'macchina esistente', 'macchina da migrare', 'server', 'macchina esistente da migrare', 'nome macchina'] },
];

// Legge la riga di intestazione e restituisce una mappa key -> colIndex
function buildColumnMap(sheet: XLSX.WorkSheet, headerRow: number, merges: XLSX.Range[]): Map<string, number> {
  const colMap = new Map<string, number>();
  if (!sheet['!ref']) return colMap;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const maxCol = Math.max(range.e.c, 20); // scan at least up to col T

  // Helper per leggere una cella (gestisce unioni)
  const getHeaderCellValue = (row: number, col: number): string => {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    
    if (cell && cell.v !== undefined && cell.v !== null) {
      return String(cell.v).trim().toLowerCase();
    }
    
    // Cerca se la cella è parte di un range unito
    for (const merge of merges) {
      if (row >= merge.s.r && row <= merge.e.r && col >= merge.s.c && col <= merge.e.c) {
        const masterAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        const masterCell = sheet[masterAddress];
        if (masterCell && masterCell.v !== undefined && masterCell.v !== null) {
          return String(masterCell.v).trim().toLowerCase();
        }
      }
    }
    
    return '';
  };

  // Scansiona tutte le celle della riga header
  const foundHeaders = new Map<number, string>(); // colIndex -> normalized header text
  for (let col = 0; col <= maxCol; col++) {
    const val = getHeaderCellValue(headerRow, col);
    if (!val) continue;
    foundHeaders.set(col, val);
  }

  // Match ogni definizione di colonna con gli header trovati
  for (const colDef of COLUMN_DEFINITIONS) {
    if (colMap.has(colDef.key)) continue; // già trovato

    for (const [colIdx, headerText] of foundHeaders) {
      // Match esatto
      if (colDef.aliases.includes(headerText)) {
        colMap.set(colDef.key, colIdx);
        break;
      }

      // Match parziale: l'alias è contenuto nell'header o viceversa
      for (const alias of colDef.aliases) {
        if (headerText.includes(alias) || alias.includes(headerText)) {
          // Evita falsi positivi (es. "macchine ws" non deve matchare "macchine jboss")
          if (alias.length >= 3 || headerText === alias) {
            colMap.set(colDef.key, colIdx);
            break;
          }
        }
      }
      if (colMap.has(colDef.key)) break;
    }
  }

  // Fallback: se non trova l'ambiente ma trova almeno 4 colonne,
  // applica la mappa posizionale di default (per compatibilità file vecchi)
  if (!colMap.has('applicazione') && foundHeaders.size < 3) {
    // Nessun header riconosciuto, usa posizioni fisse come prima
    const defaults: Record<string, number> = {
      'applicazione': 0,
      'dataInizio': 1,
      'dataFine': 2,
      'ambiente': 3,
      'tipo': 4,
      'dns': 5,
      'netscaler': 6,
      'macchineWS': 7,
      'macchineJBoss': 8,
      'note': 9,
      'riscontri': 10,
      'conf': 11,
      'macchinaMigrare': 12,
    };
    for (const [key, idx] of Object.entries(defaults)) {
      colMap.set(key, idx);
    }
  } else if (!colMap.has('applicazione')) {
    // Ha trovato header ma non quello dell'applicazione:
    // prova posizioni fisse per le colonne principali non trovate
    const positionalFallbacks: Record<string, number> = {
      'applicazione': 0,
      'dataInizio': 1,
      'dataFine': 2,
      'ambiente': 3,
      'tipo': 4,
    };
    for (const [key, idx] of Object.entries(positionalFallbacks)) {
      if (!colMap.has(key)) {
        colMap.set(key, idx);
      }
    }
  }

  return colMap;
}

interface ProcessedRow {
  applicazione: string;
  ambiente: string;
  tipo: string;
  dataInizio: Date | null;
  dataFine: Date | null;
  dns: string;
  netscaler: string;
  macchineWS: string;
  macchineJBoss: string;
  macchinaMigrare: string;
  note: string;
  riscontri: string;
  conf: string;
  statoAvanzamento: string;
}

// Processa un foglio Excel gestendo le celle unite e colonne dinamiche
function processSheet(sheet: XLSX.WorkSheet): ProcessedRow[] {
  const results: ProcessedRow[] = [];

  if (!sheet['!ref']) return results;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const merges = sheet['!merges'] || [];

  // Helper per trovare il valore di una cella (gestendo le unioni)
  const getCellValue = (row: number, col: number): string | number | undefined => {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    
    if (cell && cell.v !== undefined && cell.v !== null) {
      return cell.v;
    }
    
    for (const merge of merges) {
      if (row >= merge.s.r && row <= merge.e.r && col >= merge.s.c && col <= merge.e.c) {
        const masterAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        const masterCell = sheet[masterAddress];
        if (masterCell && masterCell.v !== undefined && masterCell.v !== null) {
          return masterCell.v;
        }
      }
    }
    
    return undefined;
  };

  // Helper per ottenere il valore stringa
  const getStringValue = (row: number, col: number): string => {
    const val = getCellValue(row, col);
    if (val === undefined || val === null) return '';
    return String(val).trim();
  };

  // Helper per ottenere il colore di sfondo (gestendo le unioni)
  const getCellColor = (row: number, col: number): XLSX.CellStyleColor | null => {
    for (const merge of merges) {
      if (row >= merge.s.r && row <= merge.e.r && col >= merge.s.c && col <= merge.e.c) {
        const masterAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        const masterCell = sheet[masterAddress];
        if (masterCell && masterCell.s && masterCell.s.fgColor) {
          return masterCell.s.fgColor;
        }
        return null;
      }
    }
    
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    if (cell && cell.s && cell.s.fgColor) {
      return cell.s.fgColor;
    }
    
    return null;
  };

  // Costruisci la mappa delle colonne dalla riga 0 (intestazione)
  const colMap = buildColumnMap(sheet, 0, merges);

  // Helper per leggere un valore dalla colonna mappata (ritorna '' se colonna non trovata)
  const getColValue = (row: number, key: string): string => {
    const colIdx = colMap.get(key);
    if (colIdx === undefined) return '';
    return getStringValue(row, colIdx);
  };

  const getColRaw = (row: number, key: string): string | number | undefined => {
    const colIdx = colMap.get(key);
    if (colIdx === undefined) return undefined;
    return getCellValue(row, colIdx);
  };

  // Indice di partenza: riga 1 se ci sono header riconosciuti, riga 0 altrimenti
  const dataStartRow = colMap.size > 0 ? 1 : 1;

  let currentApplicazione = '';
  let currentDataInizio: Date | null = null;
  let currentDataFine: Date | null = null;
  
  for (let row = dataStartRow; row <= range.e.r; row++) {
    const applicazione = getColValue(row, 'applicazione');
    const tipo = getColValue(row, 'tipo');
    const dataInizioVal = getColRaw(row, 'dataInizio');
    const dataFineVal = getColRaw(row, 'dataFine');
    
    // Se c'è un nuovo valore applicazione, aggiorna il corrente
    if (applicazione) {
      currentApplicazione = applicazione;
      currentDataInizio = parseExcelDate(dataInizioVal);
      currentDataFine = parseExcelDate(dataFineVal);
    }
    
    // Se non c'è un'applicazione valida, salta
    if (!currentApplicazione) continue;
    
    // Determina il tipo nodo - richiede che contenga "nodo"
    const tipoLower = tipo.toLowerCase().trim();

    // Se il tipo non contiene "nodo", salta la riga
    if (!tipoLower.includes('nodo')) {
      continue;
    }

    let tipoNodoRiga = 'nodo singolo'; // default

    if (tipoLower.includes('nodo 1') || tipoLower === '1' || tipoLower === 'nodo1') {
      tipoNodoRiga = 'nodo 1';
    } else if (tipoLower.includes('nodo 2') || tipoLower === '2' || tipoLower === 'nodo2') {
      tipoNodoRiga = 'nodo 2';
    }
    
    const ambiente = getColValue(row, 'ambiente');
    const dns = getColValue(row, 'dns');
    const netscaler = getColValue(row, 'netscaler');
    const macchineWS = getColValue(row, 'macchineWS');
    const macchineJBoss = getColValue(row, 'macchineJBoss');
    const note = getColValue(row, 'note');
    const riscontri = getColValue(row, 'riscontri');
    const conf = getColValue(row, 'conf');
    const macchinaMigrare = getColValue(row, 'macchinaMigrare');
    
    // Ottieni il colore di sfondo della cella Ambiente
    const ambColIdx = colMap.get('ambiente');
    const bgColor = ambColIdx !== undefined ? getCellColor(row, ambColIdx) : null;
    const statoAvanzamento = mapColorToStatoAvanzamento(bgColor);
    
    results.push({
      applicazione: currentApplicazione,
      ambiente: ambiente || '',
      tipo: tipoNodoRiga,
      dataInizio: currentDataInizio,
      dataFine: currentDataFine,
      dns,
      netscaler,
      macchineWS,
      macchineJBoss,
      macchinaMigrare,
      note,
      riscontri,
      conf,
      statoAvanzamento,
    });
  }

  return results;
}

interface GroupedAmbiente {
  applicazione: string;
  ambiente: string;
  tipoNodo: 'SINGOLO' | 'DOPPIO';
  statoAvanzamento: string;
  dataInizio: Date | null;
  dataFine: Date | null;
  // Nodo 1
  dns1: string;
  netscaler1: string;
  macchineWS1: string;
  macchineJBoss1: string;
  macchinaMigrare1: string;
  // Nodo 2
  dns2: string;
  netscaler2: string;
  macchineWS2: string;
  macchineJBoss2: string;
  macchinaMigrare2: string;
  // Comuni
  note: string;
  riscontri: string;
  conf: string;
}

// Raggruppa le righe per applicazione e ambiente, gestendo nodi doppi
function groupByAmbiente(rows: ProcessedRow[]): GroupedAmbiente[] {
  const result: GroupedAmbiente[] = [];

  // Raggruppa per applicazione + ambiente
  const grouped = new Map<string, ProcessedRow[]>();
  
  for (const row of rows) {
    const key = `${row.applicazione}|||${row.ambiente}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  }

  // Processa ogni gruppo
  for (const [key, groupRows] of grouped) {
    let [applicazione, ambiente] = key.split('|||');
    
    // Cerca nodo 1 e nodo 2
    const nodo1Row = groupRows.find(r => r.tipo.toLowerCase().includes('nodo 1'));
    const nodo2Row = groupRows.find(r => r.tipo.toLowerCase().includes('nodo 2'));
    const nodoSingoloRow = groupRows.find(r => r.tipo.toLowerCase().includes('nodo singolo'));
    
    // Determina il tipo di nodo
    let tipoNodo: 'SINGOLO' | 'DOPPIO' = 'SINGOLO';
    
    if (nodoSingoloRow) {
      tipoNodo = 'SINGOLO';
      ambiente = nodoSingoloRow.ambiente || ambiente;
    } else if (nodo1Row && nodo2Row) {
      tipoNodo = 'DOPPIO';
      ambiente = nodo1Row.ambiente || ambiente;
    } else if (nodo1Row) {
      tipoNodo = 'SINGOLO';
      ambiente = nodo1Row.ambiente || ambiente;
    } else {
      tipoNodo = 'SINGOLO';
      ambiente = groupRows[0]?.ambiente || ambiente;
    }
    
    // Prendi lo stato avanzamento e le date dal primo nodo disponibile
    const firstRow = nodo1Row || nodoSingoloRow || groupRows[0];
    const statoAvanzamento = firstRow?.statoAvanzamento || 'NON_INIZIATO';
    const dataInizio = firstRow?.dataInizio || null;
    const dataFine = firstRow?.dataFine || null;
    
    result.push({
      applicazione,
      ambiente,
      tipoNodo,
      statoAvanzamento,
      dataInizio,
      dataFine,
      // Nodo 1
      dns1: nodo1Row?.dns || nodoSingoloRow?.dns || '',
      netscaler1: nodo1Row?.netscaler || nodoSingoloRow?.netscaler || '',
      macchineWS1: nodo1Row?.macchineWS || nodoSingoloRow?.macchineWS || '',
      macchineJBoss1: nodo1Row?.macchineJBoss || nodoSingoloRow?.macchineJBoss || '',
      macchinaMigrare1: nodo1Row?.macchinaMigrare || nodoSingoloRow?.macchinaMigrare || '',
      // Nodo 2
      dns2: nodo2Row?.dns || '',
      netscaler2: nodo2Row?.netscaler || '',
      macchineWS2: nodo2Row?.macchineWS || '',
      macchineJBoss2: nodo2Row?.macchineJBoss || '',
      macchinaMigrare2: nodo2Row?.macchinaMigrare || '',
      // Comuni
      note: nodo1Row?.note || nodoSingoloRow?.note || nodo2Row?.note || '',
      riscontri: nodo1Row?.riscontri || nodoSingoloRow?.riscontri || nodo2Row?.riscontri || '',
      conf: nodo1Row?.conf || nodoSingoloRow?.conf || nodo2Row?.conf || '',
    });
  }

  return result;
}

// Interfaccia per lo stato migrazione codice
interface CodebaseEntry {
  servizio: string;
  applicazione: string;
  statoMigrazioneCodice: string;
}

// Processa il foglio CODEBASE per ottenere gli stati migrazione codice
function processCodebaseSheet(sheet: XLSX.WorkSheet): CodebaseEntry[] {
  const results: CodebaseEntry[] = [];

  if (!sheet['!ref']) return results;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const merges = sheet['!merges'] || [];

  // Helper per trovare il valore di una cella (gestendo le unioni)
  const getCellValue = (row: number, col: number): string | number | undefined => {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    
    if (cell && cell.v !== undefined && cell.v !== null) {
      return cell.v;
    }
    
    for (const merge of merges) {
      if (row >= merge.s.r && row <= merge.e.r && col >= merge.s.c && col <= merge.e.c) {
        const masterAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        const masterCell = sheet[masterAddress];
        if (masterCell && masterCell.v !== undefined && masterCell.v !== null) {
          return masterCell.v;
        }
      }
    }
    
    return undefined;
  };

  const getStringValue = (row: number, col: number): string => {
    const val = getCellValue(row, col);
    if (val === undefined || val === null) return '';
    return String(val).trim();
  };

  // Leggi header dinamicamente anche per CODEBASE
  const colMap = buildColumnMap(sheet, 0, merges);

  const colServizio = colMap.get('applicazione') ?? 0; // In CODEBASE, col A = servizio (ICT)
  const colApplicazione = colMap.get('ambiente') ?? 1;   // In CODEBASE, col B = applicazione
  const colStato = colMap.get('tipo') ?? 2;             // In CODEBASE, col C = stato

  // Se abbiamo trovato header "servizio" o "ict" mappali
  const codebaseColMap = new Map<string, number>();
  
  // Scan header row per CODEBASE specific columns
  const range2 = XLSX.utils.decode_range(sheet['!ref']);
  for (let col = 0; col <= range2.e.c; col++) {
    const headerVal = getStringValue(0, col).toLowerCase();
    if (['ict', 'servizio', 'service'].includes(headerVal)) {
      codebaseColMap.set('servizio', col);
    } else if (['progetto', 'applicazione', 'application', 'project', 'app'].includes(headerVal)) {
      codebaseColMap.set('applicazione', col);
    } else if (['stato', 'stato migrazione', 'stato migrazione codice', 'status', 'codebase'].includes(headerVal)) {
      codebaseColMap.set('stato', col);
    }
  }

  // Fallback posizionale se non ha trovato header CODEBASE
  const cbServizio = codebaseColMap.get('servizio') ?? colServizio;
  const cbApplicazione = codebaseColMap.get('applicazione') ?? colApplicazione;
  const cbStato = codebaseColMap.get('stato') ?? colStato;

  let currentServizio = '';

  for (let row = 1; row <= range.e.r; row++) {
    const servizio = getStringValue(row, cbServizio);
    const applicazione = getStringValue(row, cbApplicazione);
    const stato = getStringValue(row, cbStato);

    // Aggiorna il servizio corrente se presente
    if (servizio && servizio.toUpperCase() !== 'LEGENDA') {
      currentServizio = servizio;
    }

    // Se abbiamo un'applicazione e uno stato, aggiungi
    if (applicazione && stato && currentServizio) {
      // Salta righe che non sono stati validi
      const statoUpper = stato.toUpperCase();
      if (['DA RIPROGETTARE', 'DA FARE', 'IN PORTING', 'DA TESTARE', 'IN TEST', 'OK'].includes(statoUpper)) {
        results.push({
          servizio: currentServizio,
          applicazione,
          statoMigrazioneCodice: mapStatoMigrazioneCodice(stato),
        });
      }
    }
  }

  return results;
}

// Estrae il codice CHG dalle note
function extractCHG(note: string | undefined): string | null {
  if (!note) return null;
  
  // Pattern per cercare CHG seguita da numeri (con o senza separatori)
  const chgPattern = /CHG[\s\-]*(\d+)/i;
  const match = note.match(chgPattern);
  
  if (match) {
    // Restituisce CHG seguito dai numeri trovati
    return `CHG${match[1]}`;
  }
  
  return null;
}

// Rimuove il codice CHG dalle note
function removeCHGFromNote(note: string | undefined): string | null {
  if (!note) return null;
  
  // Rimuove il pattern CHG (con eventuali spazi/trattini) dalle note
  const cleaned = note.replace(/CHG[\s\-]*\d+/gi, '').trim();
  
  return cleaned || null;
}

// Cancella tutti i file dalla cartella upload
function cleanupUploadFolder(): void {
  const uploadDir = path.join(process.cwd(), 'upload');

  try {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (error) {
    console.error('Errore durante la pulizia della cartella upload:', error);
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requireImport(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 });
    }

    // Leggi il file Excel con gli stili delle celle
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true });

    const results = {
      servizi: 0,
      applicazioni: 0,
      ambienti: 0,
      ambientiAggiornati: 0,
      ambientiDuplicati: 0,
      errors: [] as string[],
      debug: [] as string[],
    };

    // Prima processa il foglio CODEBASE se esiste
    const codebaseMap = new Map<string, string>(); // key: servizio|||applicazione -> statoMigrazioneCodice
    const codebaseAppNames = new Map<string, string[]>(); // key: servizio -> array di nomi applicazioni
    
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toUpperCase() === 'CODEBASE') {
        const codebaseSheet = workbook.Sheets[sheetName];
        if (codebaseSheet) {
          const codebaseEntries = processCodebaseSheet(codebaseSheet);
          results.debug.push(`Foglio CODEBASE: trovate ${codebaseEntries.length} applicazioni con stato migrazione codice`);
          
          for (const entry of codebaseEntries) {
            const key = `${entry.servizio}|||${entry.applicazione}`;
            codebaseMap.set(key, entry.statoMigrazioneCodice);
            
            if (!codebaseAppNames.has(entry.servizio)) {
              codebaseAppNames.set(entry.servizio, []);
            }
            codebaseAppNames.get(entry.servizio)!.push(entry.applicazione);
          }
        }
        break;
      }
    }

    // Funzione per trovare il nome corretto dell'applicazione da CODEBASE
    function findCorrectAppName(servizio: string, appName: string): string {
      if (!appName.includes('/')) {
        return appName;
      }
      
      const codebaseApps = codebaseAppNames.get(servizio) || [];
      const parts = appName.split('/').map(p => p.trim().toLowerCase());
      
      for (const codebaseApp of codebaseApps) {
        const codebaseAppLower = codebaseApp.toLowerCase();
        
        for (const part of parts) {
          if (codebaseAppLower === part) {
            return codebaseApp;
          }
          if (codebaseAppLower.startsWith(part)) {
            return codebaseApp;
          }
          if (part.startsWith(codebaseAppLower)) {
            return codebaseApp;
          }
        }
      }
      
      return appName.split('/')[0].trim();
    }

    // Processa ogni foglio
    for (const sheetName of workbook.SheetNames) {
      // Salta fogli speciali
      if (sheetName.toUpperCase() === 'INTRO' || sheetName.toLowerCase().startsWith('legenda') || sheetName.toUpperCase() === 'CODEBASE') {
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Processa il foglio gestendo le celle unite e i colori
      const rawRows = processSheet(sheet);
      
      results.debug.push(`Foglio "${sheetName}": trovate ${rawRows.length} righe`);
      
      if (rawRows.length === 0) continue;

      // Raggruppa per ambiente (gestendo nodi doppi)
      const ambientiTrovati = groupByAmbiente(rawRows);
      
      results.debug.push(`Foglio "${sheetName}": ${ambientiTrovati.length} ambienti dopo raggruppamento`);
      
      if (ambientiTrovati.length === 0) continue;

      // Crea o trova il Servizio
      let servizio = await db.servizio.findFirst({
        where: { nome: sheetName },
      });

      if (!servizio) {
        servizio = await db.servizio.create({
          data: {
            nome: sheetName,
            ordine: results.servizi,
          },
        });
        results.servizi++;
      }

      // Raggruppa per applicazione
      const applicazioniMap = new Map<string, GroupedAmbiente[]>();
      for (const amb of ambientiTrovati) {
        if (!applicazioniMap.has(amb.applicazione)) {
          applicazioniMap.set(amb.applicazione, []);
        }
        applicazioniMap.get(amb.applicazione)!.push(amb);
      }

      // Crea ogni applicazione e i suoi ambienti
      let appOrdine = 0;
      for (const [appNomeRaw, ambientiApp] of applicazioniMap) {
        const appNome = findCorrectAppName(sheetName, appNomeRaw);
        
        if (appNome !== appNomeRaw) {
          results.debug.push(`Rinominata applicazione "${appNomeRaw}" in "${appNome}" (servizio: ${sheetName})`);
        }
        
        // Cerca lo stato migrazione codice dalla mappa CODEBASE
        const codebaseKey = `${sheetName}|||${appNome}`;
        const statoMigrazioneCodice = codebaseMap.get(codebaseKey) || 'DA_INIZIARE';

        // Crea o trova l'Applicazione
        let applicazione = await db.applicazione.findFirst({
          where: {
            nome: appNome,
            servizioId: servizio.id,
          },
        });

        if (!applicazione) {
          applicazione = await db.applicazione.create({
            data: {
              nome: appNome,
              servizioId: servizio.id,
              ordine: appOrdine++,
              statoMigrazioneCodice: statoMigrazioneCodice as any,
            },
          });
          results.applicazioni++;
        } else {
          // Aggiorna lo stato migrazione codice se presente nella mappa
          if (codebaseMap.has(codebaseKey)) {
            await db.applicazione.update({
              where: { id: applicazione.id },
              data: { statoMigrazioneCodice: statoMigrazioneCodice as any },
            });
          }
        }

        // Crea o aggiorna gli ambienti (con controllo duplicati)
        for (const amb of ambientiApp) {
          try {
            // Estrai la CHG dalle note se presente
            const chgEstratta = extractCHG(amb.note);
            const notePulite = chgEstratta ? removeCHGFromNote(amb.note) : amb.note;
            
            const tipologiaEnum = mapTipologiaAmbiente(amb.ambiente) as any;

            // Controlla se esiste già un ambiente per questa applicazione con la stessa tipologia
            const existingAmbiente = await db.ambiente.findFirst({
              where: {
                applicazioneId: applicazione.id,
                tipologia: tipologiaEnum,
              },
            });

            if (existingAmbiente) {
              // Aggiorna l'ambiente esistente
              await db.ambiente.update({
                where: { id: existingAmbiente.id },
                data: {
                  tipoNodo: amb.tipoNodo as any,
                  statoAvanzamento: amb.statoAvanzamento as any,
                  dataInizio: amb.dataInizio,
                  dataFine: amb.dataFine,
                  // Nodo 1
                  dns: amb.dns1 || null,
                  netscaler: amb.netscaler1 || null,
                  macchineWS1: amb.macchineWS1 || null,
                  macchineJBoss1: amb.macchineJBoss1 || null,
                  nomeMacchina1: amb.macchinaMigrare1 || null,
                  // Nodo 2
                  macchineWS2: amb.macchineWS2 || null,
                  macchineJBoss2: amb.macchineJBoss2 || null,
                  nomeMacchina2: amb.macchinaMigrare2 || null,
                  // Altri campi - aggiorna solo se presenti nel file
                  ...(amb.riscontri ? { riscontri: amb.riscontri } : {}),
                  ...(amb.conf ? { configurazioni: amb.conf } : {}),
                  ...(notePulite ? { note: notePulite } : {}),
                  ...(chgEstratta ? { richiestaCHG: chgEstratta } : {}),
                },
              });
              results.ambientiAggiornati++;
              results.debug.push(`Ambiente aggiornato: ${appNome} / ${TIPOLOGIA_LABELS[tipologiaEnum] || amb.ambiente}`);
            } else {
              // Crea nuovo ambiente
              await db.ambiente.create({
                data: {
                  applicazioneId: applicazione.id,
                  tipologia: tipologiaEnum,
                  tipoNodo: amb.tipoNodo as any,
                  statoAvanzamento: amb.statoAvanzamento as any,
                  dataInizio: amb.dataInizio,
                  dataFine: amb.dataFine,
                  // Nodo 1
                  dns: amb.dns1 || null,
                  netscaler: amb.netscaler1 || null,
                  macchineWS1: amb.macchineWS1 || null,
                  macchineJBoss1: amb.macchineJBoss1 || null,
                  nomeMacchina1: amb.macchinaMigrare1 || null,
                  // Nodo 2
                  macchineWS2: amb.macchineWS2 || null,
                  macchineJBoss2: amb.macchineJBoss2 || null,
                  nomeMacchina2: amb.macchinaMigrare2 || null,
                  // Altri campi
                  richiestaCHG: chgEstratta,
                  riscontri: amb.riscontri || null,
                  note: notePulite || null,
                  configurazioni: amb.conf || null,
                },
              });
              results.ambienti++;
            }
          } catch (e) {
            results.errors.push(`Errore su ambiente ${amb.ambiente} per ${appNome}: ${e}`);
          }
        }
      }
    }

    // Cancella i file dalla cartella upload dopo l'importazione
    cleanupUploadFolder();

    return NextResponse.json({
      success: true,
      message: `Importazione completata: ${results.servizi} servizi, ${results.applicazioni} applicazioni, ${results.ambienti} ambienti creati, ${results.ambientiAggiornati} ambienti aggiornati`,
      results,
    });
  } catch (error) {
    console.error('Errore importazione:', error);
    
    cleanupUploadFolder();
    
    return NextResponse.json(
      { error: 'Errore durante l\'importazione', details: String(error) },
      { status: 500 }
    );
  }
}

// Label per i log di debug
const TIPOLOGIA_LABELS: Record<string, string> = {
  'TEST_INTERNO': 'Test Interno',
  'VALIDAZIONE': 'Validazione',
  'TEST_CONCESSIONARI': 'Test Concessionari',
  'BENCHMARK': 'Benchmark',
  'PRODUZIONE': 'Produzione',
};
