import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';

export async function GET() {
  try {
    const workbook = XLSX.utils.book_new();

    // ===========================================
    // FOGLIO LEGENDA
    // ===========================================
    const legendaData: (string | number)[][] = [
      ['LEGENDA COLORI E VALORI DA SCRIVERE NEL FILE EXCEL'],
      [''],
      ['STATI AVANZAMENTO AMBIENTE (determinati dal colore della cella Ambiente)'],
      ['Colore cella', 'Stato risultante', 'Significato', 'Percentuale'],
      ['Arancione', 'RICHIESTA_AMBIENTI', 'Richiesta Ambienti', '25%'],
      ['Giallo', 'CONFIGURAZIONE_AMBIENTI', 'Configurazione Ambienti', '50%'],
      ['Azzurro', 'IN_TEST', 'In Test', '75%'],
      ['Verde', 'COMPLETATO', 'Completato', '100%'],
      ['Bianco/Nessun colore', 'NON_INIZIATO', 'Non Iniziato', '0%'],
      [''],
      ['STATI MIGRAZIONE CODICE (scrivere esattamente come indicato nel foglio CODEBASE)'],
      ['Valore da scrivere', 'Descrizione', 'Colore badge'],
      ['DA RIPROGETTARE', 'Da Riprogettare', ''],
      ['DA FARE', 'Da Iniziare', ''],
      ['IN PORTING', 'In Porting', ''],
      ['DA TESTARE', 'Da Testare', ''],
      ['IN TEST', 'In Test', ''],
      ['OK', 'Completato', ''],
      [''],
      ['TIPOLOGIE AMBIENTE (valori possibili nella colonna Ambiente)'],
      ['Valore riconosciuto', 'Descrizione', 'Altro valore accettato'],
      ['Test Interno', 'Test Interno', 'TEST_INTERNO, TI, test'],
      ['Validazione', 'Validazione', 'VAL'],
      ['Test Concessionari', 'Test Concessionari', 'TEST_CONCESSIONARI, TC'],
      ['Benchmark', 'Benchmark', 'BM'],
      ['Produzione', 'Produzione', 'PRODUZIONE, PROD, PRD'],
      [''],
      ['TIPI NODO (colonna Tipo - DEVE contenere la parola "nodo")'],
      ['Valore da scrivere', 'Descrizione', 'Risultato'],
      ['Nodo singolo', 'Ambiente con un solo nodo', 'Tipo: SINGOLO'],
      ['nodo singolo', 'Ambiente con un solo nodo', 'Tipo: SINGOLO'],
      ['Nodo 1', 'Primo nodo di ambiente doppio', 'Viene unito con Nodo 2'],
      ['nodo 1', 'Primo nodo di ambiente doppio', 'Viene unito con Nodo 2'],
      ['Nodo 2', 'Secondo nodo di ambiente doppio', 'Viene unito con Nodo 1'],
      ['nodo 2', 'Secondo nodo di ambiente doppio', 'Viene unito con Nodo 1'],
      [''],
      ['ISTRUZIONI IMPORTANTI'],
      ['1. Ogni foglio (escluso CODEBASE e LEGENDA) rappresenta un Servizio'],
      ['2. Il foglio CODEBASE contiene lo stato migrazione codice delle applicazioni'],
      ['3. La colonna Tipo deve contenere la parola "nodo" altrimenti la riga viene saltata'],
      ['4. I colori delle celle Ambiente determinano automaticamente lo stato avanzamento'],
      ['5. Applicazioni con stesso nome su righe consecutive vengono raggruppate'],
      ['6. Le date possono essere in formato dd/mm/yyyy o con testo aggiuntivo'],
    ];
    
    const legendaSheet = XLSX.utils.aoa_to_sheet(legendaData);
    
    // Imposta larghezza colonne
    legendaSheet['!cols'] = [
      { wch: 25 },
      { wch: 28 },
      { wch: 28 },
      { wch: 20 },
    ];
    
    // Stile titolo principale
    const titleCell = legendaSheet[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'left' },
      };
    }
    
    // Stile sottotitoli sezioni
    const sectionRows = [2, 10, 19, 27, 35];
    sectionRows.forEach(row => {
      const cell = legendaSheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      if (cell) {
        cell.s = {
          font: { bold: true, size: 11, color: { rgb: '4472C4' } },
          fill: { fgColor: { rgb: 'D6DCE5' } },
        };
      }
    });
    
    // Stile header tabelle
    const headerRows = [3, 11, 20, 28];
    headerRows.forEach(row => {
      for (let col = 0; col < 4; col++) {
        const cell = legendaSheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell && cell.v) {
          cell.s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center' },
          };
        }
      }
    });
    
    // Colori stati avanzamento (colonna 2, righe 4-8)
    const statiAvanzamentoColors: { row: number; color: string }[] = [
      { row: 4, color: 'FFC000' },  // Arancione - RICHIESTA_AMBIENTI
      { row: 5, color: 'FFFF00' },  // Giallo - CONFIGURAZIONE_AMBIENTI
      { row: 6, color: '5B9BD5' },  // Azzurro - IN_TEST
      { row: 7, color: '70AD47' },  // Verde - COMPLETATO
      { row: 8, color: 'FFFFFF' },  // Bianco - NON_INIZIATO
    ];
    
    statiAvanzamentoColors.forEach(({ row, color }) => {
      const cell = legendaSheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: color } },
          font: { bold: true },
          alignment: { horizontal: 'center' },
        };
      }
    });
    
    // Colori stati migrazione codice (colonna 2, righe 12-17)
    const statiMigrazioneColors: { row: number; color: string }[] = [
      { row: 12, color: 'FF0000' }, // DA_RIPROGETTARE - rosso
      { row: 13, color: 'ED7D31' }, // DA_FARE - arancione scuro
      { row: 14, color: 'A5A5A5' }, // IN_PORTING - grigio
      { row: 15, color: 'FFC000' }, // DA_TESTARE - giallo arancio
      { row: 16, color: '5B9BD5' }, // IN_TEST - azzurro
      { row: 17, color: '70AD47' }, // OK - verde
    ];
    
    statiMigrazioneColors.forEach(({ row, color }) => {
      const cell = legendaSheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: color } },
          alignment: { horizontal: 'center' },
        };
      }
    });
    
    XLSX.utils.book_append_sheet(workbook, legendaSheet, 'LEGENDA');

    // ===========================================
    // FOGLIO CODEBASE di esempio
    // ===========================================
    const codebaseData = [
      ['ICT (Servizio)', 'Progetto (Applicazione)', 'Stato migrazione codice', 'Note'],
      ['Servizio 1', 'Applicazione 1', 'IN TEST', ''],
      ['', 'Applicazione 2', 'DA TESTARE', 'Note opzionali'],
      ['Servizio 2', 'Applicazione 3', 'DA FARE', ''],
      ['', 'Applicazione 4', 'IN PORTING', ''],
    ];
    const codebaseSheet = XLSX.utils.aoa_to_sheet(codebaseData);
    
    // Imposta larghezza colonne
    codebaseSheet['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 30 },
    ];
    
    // Stile intestazione
    for (let col = 0; col < 4; col++) {
      const cell = codebaseSheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center' },
        };
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, codebaseSheet, 'CODEBASE');

    // ===========================================
    // FOGLIO Servizio di esempio
    // ===========================================
    const servizioData = [
      ['Applicazione', 'Data inizio', 'Data fine', 'Ambiente', 'Tipo', 'DNS', 'Netscaler', 'Macchine WS', 'Macchine Jboss', 'Note', 'Riscontri', 'Conf', 'Macchina esistente da migrare'],
      ['Applicazione 1', '01/01/2025', '31/01/2025', 'Test Interno', 'Nodo singolo', 'dns1.example.com', 'ns1.example.com', 'ws1, ws2', 'jb1, jb2', 'Note esempio', 'Riscontro 1', 'config1', 'server-old-1'],
      ['', '', '', 'Validazione', 'Nodo 1', 'dns2.example.com', 'ns2.example.com', 'ws3', 'jb3', '', '', '', ''],
      ['', '', '', '', 'Nodo 2', 'dns3.example.com', 'ns3.example.com', 'ws4', 'jb4', '', '', '', ''],
      ['Applicazione 2', '15/01/2025', '', 'Produzione', 'Nodo singolo', 'dns4.example.com', '', 'ws5', 'jb5', 'Altra nota', '', 'config2', ''],
    ];
    const servizioSheet = XLSX.utils.aoa_to_sheet(servizioData);
    
    // Imposta larghezza colonne
    servizioSheet['!cols'] = [
      { wch: 18 }, // Applicazione
      { wch: 12 }, // Data inizio
      { wch: 12 }, // Data fine
      { wch: 18 }, // Ambiente
      { wch: 14 }, // Tipo
      { wch: 20 }, // DNS
      { wch: 18 }, // Netscaler
      { wch: 14 }, // Macchine WS
      { wch: 14 }, // Macchine Jboss
      { wch: 20 }, // Note
      { wch: 15 }, // Riscontri
      { wch: 12 }, // Conf
      { wch: 28 }, // Macchina esistente
    ];
    
    // Stile intestazione
    for (let col = 0; col < 13; col++) {
      const cell = servizioSheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center' },
        };
      }
    }
    
    // Colora le celle Ambiente in base allo stato
    // Test Interno (riga 1) - IN_TEST = azzurro
    const testInternoCell = servizioSheet[XLSX.utils.encode_cell({ r: 1, c: 3 })];
    if (testInternoCell) {
      testInternoCell.s = { fill: { fgColor: { rgb: '5B9BD5' } } };
    }
    
    // Validazione (riga 2) - COMPLETATO = verde
    const validazioneCell = servizioSheet[XLSX.utils.encode_cell({ r: 2, c: 3 })];
    if (validazioneCell) {
      validazioneCell.s = { fill: { fgColor: { rgb: '70AD47' } } };
    }
    
    // Produzione (riga 4) - NON_INIZIATO = bianco (nessun colore)
    
    XLSX.utils.book_append_sheet(workbook, servizioSheet, 'Servizio 1');

    // Genera il file
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="esempio_import_mida.xlsx"',
      },
    });
  } catch (error) {
    console.error('Errore generazione file esempio:', error);
    return NextResponse.json({ error: 'Errore generazione file esempio' }, { status: 500 });
  }
}
