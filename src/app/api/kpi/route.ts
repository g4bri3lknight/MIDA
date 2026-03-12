import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const servizi = await db.servizio.findMany({
      include: {
        applicazioni: {
          include: {
            ambienti: true,
          },
        },
      },
    });

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    // KPI calcolati
    let totalAmbienti = 0;
    let ambientiCompletati = 0;
    let ambientiInRitardo = 0;
    let ambientiInCorso = 0;
    
    let totalApplicazioni = 0;
    let applicazioniBloccate = 0; // DA_RIPROGETTARE
    let applicazioniDaIniziare = 0; // DA_INIZIARE / DA FARE
    let applicazioniInCorso = 0; // IN_PORTING, DA_TESTARE, IN_TEST
    let applicazioniCompletate = 0; // OK

    // Prossime scadenze (7 giorni)
    const tra7Giorni = new Date(oggi);
    tra7Giorni.setDate(tra7Giorni.getDate() + 7);

    const prossimeScadenze: {
      applicazione: string;
      applicazioneId: string;
      servizio: string;
      servizioId: string;
      dataFine: string;
      tipologia: string;
    }[] = [];

    // Ambienti in ritardo
    const ambientiRitardo: {
      applicazione: string;
      applicazioneId: string;
      servizio: string;
      servizioId: string;
      tipologia: string;
      dataFine: string | null;
      giorniRitardo: number;
    }[] = [];

    for (const servizio of servizi) {
      for (const app of servizio.applicazioni || []) {
        totalApplicazioni++;

        // Conta stati migrazione codice
        switch (app.statoMigrazioneCodice) {
          case 'DA_RIPROGETTARE':
            applicazioniBloccate++;
            break;
          case 'DA_INIZIARE':
            applicazioniDaIniziare++;
            break;
          case 'IN_PORTING':
          case 'DA_TESTARE':
          case 'IN_TEST':
            applicazioniInCorso++;
            break;
          case 'OK':
            applicazioniCompletate++;
            break;
        }

        for (const amb of app.ambienti || []) {
          totalAmbienti++;
          
          if (amb.statoAvanzamento === 'COMPLETATO') {
            ambientiCompletati++;
          } else {
            ambientiInCorso++;
          }

          // Verifica ritardo
          if (amb.dataFine && amb.statoAvanzamento !== 'COMPLETATO') {
            const dataFine = new Date(amb.dataFine);
            dataFine.setHours(0, 0, 0, 0);
            
            if (dataFine < oggi) {
              ambientiInRitardo++;
              const giorniRitardo = Math.floor((oggi.getTime() - dataFine.getTime()) / (1000 * 60 * 60 * 24));
              ambientiRitardo.push({
                applicazione: app.nome,
                applicazioneId: app.id,
                servizio: servizio.nome,
                servizioId: servizio.id,
                tipologia: amb.tipologia,
                dataFine: amb.dataFine,
                giorniRitardo,
              });
            } else if (dataFine <= tra7Giorni) {
              prossimeScadenze.push({
                applicazione: app.nome,
                applicazioneId: app.id,
                servizio: servizio.nome,
                servizioId: servizio.id,
                dataFine: amb.dataFine,
                tipologia: amb.tipologia,
              });
            }
          }
        }
      }
    }

    // Ordina per ritardo (più gravi prima)
    ambientiRitardo.sort((a, b) => b.giorniRitardo - a.giorniRitardo);
    
    // Ordina prossime scadenze per data
    prossimeScadenze.sort((a, b) => new Date(a.dataFine).getTime() - new Date(b.dataFine).getTime());

    const percentualeAvanzamento = totalAmbienti > 0 
      ? Math.round((ambientiCompletati / totalAmbienti) * 100) 
      : 0;

    return NextResponse.json({
      kpi: {
        servizi: servizi.length,
        applicazioni: totalApplicazioni,
        ambienti: totalAmbienti,
        percentualeAvanzamento,
        ambientiCompletati,
        ambientiInCorso,
        ambientiInRitardo,
        applicazioniBloccate,
        applicazioniDaIniziare,
        applicazioniInCorso,
        applicazioniCompletate,
      },
      alert: {
        ambientiRitardo: ambientiRitardo.slice(0, 10),
        prossimeScadenze: prossimeScadenze.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Errore nel recupero KPI:', error);
    return NextResponse.json({ error: 'Errore nel recupero KPI' }, { status: 500 });
  }
}
