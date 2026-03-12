import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx-js-style';

const TIPOLOGIA_LABELS: Record<string, string> = {
  TEST_INTERNO: 'Test',
  VALIDAZIONE: 'Validazione',
  TEST_CONCESSIONARI: 'Test concessionari',
  BENCHMARK: 'Benchmark',
  PRODUZIONE: 'Produzione',
};

// Ordine tipologie per ordinamento
const TIPOLOGIA_ORDER: Record<string, number> = {
  'TEST_INTERNO': 1,
  'VALIDAZIONE': 2,
  'TEST_CONCESSIONARI': 3,
  'BENCHMARK': 4,
  'PRODUZIONE': 5,
};

// Mappa stato avanzamento a colore di sfondo (stessi colori dell'import)
const STATO_COLORS: Record<string, string> = {
  NON_INIZIATO: 'FFFFFF',           // Bianco
  RICHIESTA_AMBIENTI: 'FFC000',     // Arancione
  CONFIGURAZIONE_AMBIENTI: 'FFFF00', // Giallo
  IN_TEST: '5B9BD5',               // Azzurro
  COMPLETATO: '70AD47',            // Verde
};

// Sanitize sheet name (max 31 chars, no special chars)
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\\/\?\*\[\]:]/g, '').substring(0, 31);
}

// Format date for Excel in dd/mm/yyyy format
function formatDateForExcel(date: Date | null): string {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Crea un foglio Excel per un servizio seguendo lo schema di import
function createServizioSheet(
  servizioName: string,
  applicazioni: Array<{
    nome: string;
    ambienti: Array<{
      tipologia: string;
      tipoNodo: string;
      statoAvanzamento: string;
      dataInizio: Date | null;
      dataFine: Date | null;
      nomeMacchina1: string | null;
      macchineWS1: string | null;
      macchineJBoss1: string | null;
      nomeMacchina2: string | null;
      macchineWS2: string | null;
      macchineJBoss2: string | null;
      dns: string | null;
      netscaler: string | null;
      richiestaCHG: string | null;
      riscontri: string | null;
      note: string | null;
      configurazioni: string | null;
    }>;
  }>
): XLSX.WorkSheet {
  // Headers secondo schema
  const headers = [
    'Applicazione',
    'Data inizio',
    'Data fine',
    'Ambiente',
    'Tipo',
    'DNS',
    'Netscaler',
    'Macchine WS',
    'Macchine Jboss',
    'Note',
    'Riscontri',
    'Conf',
    'Macchina esistente da migrare'
  ];

  // Costruisci le righe (solo valori)
  const rows: string[][] = [];
  const merges: XLSX.Range[] = [];
  
  // Track colori per celle Ambiente: 0-based row index nel foglio completo (header = 0) -> color
  const ambienteColors: Map<number, string> = new Map();

  for (const applicazione of applicazioni) {
    const appStartRow = rows.length;

    for (const ambiente of applicazione.ambienti) {
      const tipologia = TIPOLOGIA_LABELS[ambiente.tipologia] || ambiente.tipologia;
      const statoColor = STATO_COLORS[ambiente.statoAvanzamento] || 'FFFFFF';
      const isDoppio = ambiente.tipoNodo === 'DOPPIO';
      
      const dataInizio = formatDateForExcel(ambiente.dataInizio);
      const dataFine = formatDateForExcel(ambiente.dataFine);

      if (isDoppio) {
        // Riga Nodo 1
        rows.push([
          applicazione.nome,
          dataInizio,
          dataFine,
          tipologia,
          'Nodo 1',
          ambiente.dns || '',
          ambiente.netscaler || '',
          ambiente.macchineWS1 || '',
          ambiente.macchineJBoss1 || '',
          ambiente.note || '',
          ambiente.riscontri || '',
          ambiente.configurazioni || '',
          ambiente.nomeMacchina1 || '',
        ]);

        // Riga Nodo 2
        rows.push([
          '', // Applicazione (merged)
          '', // Data inizio (merged)
          '', // Data fine (merged)
          '', // Ambiente (merged)
          'Nodo 2',
          '', // DNS (merged)
          '',
          ambiente.macchineWS2 || '',
          ambiente.macchineJBoss2 || '',
          '', // Note (merged)
          '', // Riscontri (merged)
          '', // Conf (merged)
          ambiente.nomeMacchina2 || '',
        ]);

        // Calcola indici Excel (1-based) per i merge
        const nodo1RowInSheet = rows.length - 2 + 1; // -2 perché abbiamo 2 righe, +1 per header
        const nodo2RowInSheet = rows.length - 1 + 1; // -1 per l'ultima riga, +1 per header

        // Merge Data inizio (B = col 1)
        merges.push({ s: { r: nodo1RowInSheet, c: 1 }, e: { r: nodo2RowInSheet, c: 1 } });
        // Merge Data fine (C = col 2)
        merges.push({ s: { r: nodo1RowInSheet, c: 2 }, e: { r: nodo2RowInSheet, c: 2 } });
        // Merge Ambiente (D = col 3)
        merges.push({ s: { r: nodo1RowInSheet, c: 3 }, e: { r: nodo2RowInSheet, c: 3 } });
        // Merge DNS (F = col 5)
        merges.push({ s: { r: nodo1RowInSheet, c: 5 }, e: { r: nodo2RowInSheet, c: 5 } });
        // Merge Note (J = col 9)
        merges.push({ s: { r: nodo1RowInSheet, c: 9 }, e: { r: nodo2RowInSheet, c: 9 } });
        // Merge Riscontri (K = col 10)
        merges.push({ s: { r: nodo1RowInSheet, c: 10 }, e: { r: nodo2RowInSheet, c: 10 } });
        // Merge Conf (L = col 11)
        merges.push({ s: { r: nodo1RowInSheet, c: 11 }, e: { r: nodo2RowInSheet, c: 11 } });

        // Registra colore per cella Ambiente (sulla prima riga del merge = Nodo 1)
        ambienteColors.set(nodo1RowInSheet, statoColor);

      } else {
        // Nodo singolo
        rows.push([
          applicazione.nome,
          dataInizio,
          dataFine,
          tipologia,
          'Nodo singolo',
          ambiente.dns || '',
          ambiente.netscaler || '',
          ambiente.macchineWS1 || '',
          ambiente.macchineJBoss1 || '',
          ambiente.note || '',
          ambiente.riscontri || '',
          ambiente.configurazioni || '',
          ambiente.nomeMacchina1 || '',
        ]);

        // Registra colore per cella Ambiente
        const rowInSheet = rows.length;
        ambienteColors.set(rowInSheet, statoColor);
      }
    }

    // Aggiungi merge per Applicazione (colonna A) se ci sono più righe
    const appEndRow = rows.length;
    if (appEndRow > appStartRow + 1) {
      const startRowInSheet = appStartRow + 1; // +1 per header
      const endRowInSheet = appEndRow;
      merges.push({ s: { r: startRowInSheet, c: 0 }, e: { r: endRowInSheet, c: 0 } });
    }
  }

  // Costruisci il worksheet
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Applica merge
  ws['!merges'] = merges;

  // Imposta larghezza colonne
  ws['!cols'] = [
    { wch: 20 },  // A: Applicazione
    { wch: 12 },  // B: Data inizio
    { wch: 12 },  // C: Data fine
    { wch: 18 },  // D: Ambiente
    { wch: 12 },  // E: Tipo
    { wch: 20 },  // F: DNS
    { wch: 15 },  // G: Netscaler
    { wch: 18 },  // H: Macchine WS
    { wch: 18 },  // I: Macchine Jboss
    { wch: 25 },  // J: Note
    { wch: 20 },  // K: Riscontri
    { wch: 25 },  // L: Conf
    { wch: 30 },  // M: Macchina esistente
  ];

  // Applica stili alle celle
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      
      if (!ws[cellAddress]) {
        ws[cellAddress] = { v: '', t: 's' };
      }

      // Stile header (riga 0)
      if (R === 0) {
        ws[cellAddress].s = {
          fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } },
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      } else {
        // Celle dati
        const isAmbienteCol = C === 3;
        const ambienteColor = ambienteColors.get(R);

        // Crea stile base
        const cellStyle: XLSX.ExcelCellStyle = {
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { vertical: 'center', wrapText: true }
        };

        // Aggiungi colore sfondo per celle Ambiente
        if (isAmbienteCol && ambienteColor) {
          cellStyle.fill = { patternType: 'solid', fgColor: { rgb: ambienteColor } };
        }

        ws[cellAddress].s = cellStyle;
      }
    }
  }

  return ws;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterServizio = searchParams.get('servizio') || '';
    const filterApplicazione = searchParams.get('applicazione') || '';
    const filterTipologia = searchParams.get('tipologia') || '';
    const filterRichiestaCHG = searchParams.get('richiestaCHG') || '';

    // Fetch all data with relations
    const servizi = await db.servizio.findMany({
      include: {
        applicazioni: {
          include: {
            ambienti: {
              orderBy: [
                { tipologia: 'asc' }
              ]
            },
          },
          orderBy: { ordine: 'asc' },
        },
      },
      orderBy: { ordine: 'asc' },
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const usedNames = new Set<string>();

    for (const servizio of servizi) {
      if (filterServizio && servizio.id !== filterServizio) continue;

      // Filtra applicazioni e ambienti
      const filteredApplicazioni = (servizio.applicazioni || [])
        .filter(app => !filterApplicazione || app.id === filterApplicazione)
        .map(app => ({
          nome: app.nome,
          ambienti: (app.ambienti || [])
            .filter(amb => {
              if (filterTipologia && amb.tipologia !== filterTipologia) return false;
              if (filterRichiestaCHG && amb.richiestaCHG !== filterRichiestaCHG) return false;
              return true;
            })
            .sort((a, b) => (TIPOLOGIA_ORDER[a.tipologia] || 99) - (TIPOLOGIA_ORDER[b.tipologia] || 99))
            .map(amb => ({
              ...amb,
              dataInizio: amb.dataInizio,
              dataFine: amb.dataFine,
            }))
        }))
        .filter(app => app.ambienti.length > 0);

      if (filteredApplicazioni.length === 0) continue;

      // Genera nome sheet unico
      let sheetName = sanitizeSheetName(servizio.nome);
      let counter = 1;
      while (usedNames.has(sheetName)) {
        sheetName = sanitizeSheetName(`${servizio.nome}_${counter}`);
        counter++;
      }
      usedNames.add(sheetName);

      const ws = createServizioSheet(servizio.nome, filteredApplicazioni);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // Se nessun foglio creato, aggiungi uno vuoto
    if (wb.SheetNames.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['Nessun dato trovato']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Dati');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="mida_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'esportazione' },
      { status: 500 }
    );
  }
}
