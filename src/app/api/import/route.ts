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
function mapColorToStatoAvanzamento(fgColor: XLSX.ExcelCellStyle['fgColor'] | null): string {
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

// Processa un foglio Excel gestendo le celle unite
function processSheet(sheet: XLSX.WorkSheet): ProcessedRow[] {
  const results: ProcessedRow[] = [];

  if (!sheet['!ref']) return results;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const merges = sheet['!merges'] || [];

  // Helper per trovare il valore di una cella (gestendo le unioni)
  const getCellValue = (row: number, col: number): string | number | undefined => {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    
    // Se la cella esiste e ha un valore, ritornalo
    if (cell && cell.v !== undefined && cell.v !== null) {
      return cell.v;
    }
    
    // Cerca se la cella è parte di un range unito
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
  const getCellColor = (row: number, col: number): XLSX.ExcelCellStyle['fgColor'] | null => {
    // Prima controlla se la cella è in un range unito
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

  // Colonne (0-indexed)
  // A=0: Applicazione
  // B=1: Data inizio
  // C=2: Data fine
  // D=3: Ambiente
  // E=4: Tipo (Nodo singolo, Nodo 1, Nodo 2)
  // F=5: DNS
  // G=6: Netscaler
  // H=7: Macchine WS
  // I=8: Macchine Jboss
  // J=9: Note
  // K=10: Riscontri
  // L=11: Conf
  // M=12: Macchina esistente da migrare

  const COL_APP = 0;
  const COL_DATA_INIZIO = 1;
  const COL_DATA_FINE = 2;
  const COL_AMB = 3;
  const COL_TIPO = 4;
  const COL_DNS = 5;
  const COL_NET = 6;
  const COL_WS = 7;
  const COL_JBOSS = 8;
  const COL_NOTE = 9;
  const COL_RISCTR = 10;
  const COL_CONF = 11;
  const COL_MACCH = 12;

  let currentApplicazione = '';
  let currentDataInizio: Date | null = null;
  let currentDataFine: Date | null = null;
  
  for (let row = 1; row <= range.e.r; row++) {
    const applicazione = getStringValue(row, COL_APP);
    const tipo = getStringValue(row, COL_TIPO);
    const dataInizioVal = getCellValue(row, COL_DATA_INIZIO);
    const dataFineVal = getCellValue(row, COL_DATA_FINE);
    
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
    
    const ambiente = getStringValue(row, COL_AMB);
    const dns = getStringValue(row, COL_DNS);
    const netscaler = getStringValue(row, COL_NET);
    const macchineWS = getStringValue(row, COL_WS);
    const macchineJBoss = getStringValue(row, COL_JBOSS);
    const note = getStringValue(row, COL_NOTE);
    const riscontri = getStringValue(row, COL_RISCTR);
    const conf = getStringValue(row, COL_CONF);
    const macchinaMigrare = getStringValue(row, COL_MACCH);
    
    // Ottieni il colore di sfondo della cella Ambiente
    const bgColor = getCellColor(row, COL_AMB);
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

  // Colonne CODEBASE:
  // A=0: ICT (Servizio)
  // B=1: Progetto (Applicazione)
  // C=2: Stato migrazione codice

  const COL_SERVIZIO = 0;
  const COL_APPLICAZIONE = 1;
  const COL_STATO = 2;

  let currentServizio = '';

  for (let row = 1; row <= range.e.r; row++) {
    const servizio = getStringValue(row, COL_SERVIZIO);
    const applicazione = getStringValue(row, COL_APPLICAZIONE);
    const stato = getStringValue(row, COL_STATO);

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
        // Cancella solo file, non cartelle
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
            
            // Aggiungi alla mappa dei nomi applicazioni per servizio
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
      // Se non contiene "/", ritorna il nome originale
      if (!appName.includes('/')) {
        return appName;
      }
      
      // Cerca tra le applicazioni del servizio in CODEBASE
      const codebaseApps = codebaseAppNames.get(servizio) || [];
      
      // Estrae entrambe le parti (prima e dopo lo "/")
      const parts = appName.split('/').map(p => p.trim().toLowerCase());
      
      // Cerca un'applicazione in CODEBASE che corrisponda a una delle parti
      for (const codebaseApp of codebaseApps) {
        const codebaseAppLower = codebaseApp.toLowerCase();
        
        // Controlla ogni parte del nome
        for (const part of parts) {
          // Match esatto
          if (codebaseAppLower === part) {
            return codebaseApp;
          }
          // Match se il nome CODEBASE inizia con la parte
          if (codebaseAppLower.startsWith(part)) {
            return codebaseApp;
          }
          // Match se la parte inizia con il nome CODEBASE
          if (part.startsWith(codebaseAppLower)) {
            return codebaseApp;
          }
        }
      }
      
      // Se non trova corrispondenza, usa la parte prima dello "/"
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
        // Se il nome contiene "/", usa il nome corretto da CODEBASE
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

        // Crea gli ambienti
        for (const amb of ambientiApp) {
          try {
            // Estrai la CHG dalle note se presente
            const chgEstratta = extractCHG(amb.note);
            const notePulite = chgEstratta ? removeCHGFromNote(amb.note) : amb.note;
            
            await db.ambiente.create({
              data: {
                applicazioneId: applicazione.id,
                tipologia: mapTipologiaAmbiente(amb.ambiente) as any,
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
          } catch (e) {
            results.errors.push(`Errore creando ambiente ${amb.ambiente} per ${appNome}: ${e}`);
          }
        }
      }
    }

    // Cancella i file dalla cartella upload dopo l'importazione
    cleanupUploadFolder();

    return NextResponse.json({
      success: true,
      message: `Importazione completata: ${results.servizi} servizi, ${results.applicazioni} applicazioni, ${results.ambienti} ambienti`,
      results,
    });
  } catch (error) {
    console.error('Errore importazione:', error);
    
    // Cancella i file dalla cartella upload anche in caso di errore
    cleanupUploadFolder();
    
    return NextResponse.json(
      { error: 'Errore durante l\'importazione', details: String(error) },
      { status: 500 }
    );
  }
}
