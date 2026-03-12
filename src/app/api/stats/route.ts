import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Ottieni tutti i dati necessari
    const servizi = await db.servizio.findMany({
      include: {
        applicazioni: {
          include: {
            ambienti: true,
          },
        },
      },
      orderBy: { ordine: 'asc' },
    });

    // Conteggi stati avanzamento ambiente
    const statiAvanzamento = {
      NON_INIZIATO: 0,
      RICHIESTA_AMBIENTI: 0,
      CONFIGURAZIONE_AMBIENTI: 0,
      IN_TEST: 0,
      COMPLETATO: 0,
    };

    // Conteggi stati migrazione codice
    const statiMigrazioneCodice = {
      DA_RIPROGETTARE: 0,
      DA_INIZIARE: 0,
      IN_PORTING: 0,
      DA_TESTARE: 0,
      IN_TEST: 0,
      OK: 0,
    };

    // Statistiche per servizio
    const serviziStats: {
      nome: string;
      id: string;
      applicazioni: number;
      ambienti: number;
      completati: number;
      percentuale: number;
    }[] = [];

    // Statistiche per tipologia ambiente
    const tipologieAmbiente: Record<string, { totali: number; completati: number }> = {};

    let totalAmbienti = 0;
    let totalCompletati = 0;

    for (const servizio of servizi) {
      let servizioAmbienti = 0;
      let servizioCompletati = 0;

      for (const app of servizio.applicazioni || []) {
        // Conta stato migrazione codice
        if (app.statoMigrazioneCodice) {
          statiMigrazioneCodice[app.statoMigrazioneCodice as keyof typeof statiMigrazioneCodice]++;
        }

        for (const amb of app.ambienti || []) {
          totalAmbienti++;
          servizioAmbienti++;

          // Conta stati avanzamento
          if (amb.statoAvanzamento) {
            statiAvanzamento[amb.statoAvanzamento as keyof typeof statiAvanzamento]++;
          }

          if (amb.statoAvanzamento === 'COMPLETATO') {
            totalCompletati++;
            servizioCompletati++;
          }

          // Conta per tipologia
          const tipologia = amb.tipologia;
          if (!tipologieAmbiente[tipologia]) {
            tipologieAmbiente[tipologia] = { totali: 0, completati: 0 };
          }
          tipologieAmbiente[tipologia].totali++;
          if (amb.statoAvanzamento === 'COMPLETATO') {
            tipologieAmbiente[tipologia].completati++;
          }
        }
      }

      serviziStats.push({
        id: servizio.id,
        nome: servizio.nome,
        applicazioni: servizio.applicazioni?.length || 0,
        ambienti: servizioAmbienti,
        completati: servizioCompletati,
        percentuale: servizioAmbienti > 0 ? Math.round((servizioCompletati / servizioAmbienti) * 100) : 0,
      });
    }

    // Calcola percentuale totale
    const percentualeTotale = totalAmbienti > 0 ? Math.round((totalCompletati / totalAmbienti) * 100) : 0;

    // Prepara dati per tipologia ambiente
    const tipologieStats = Object.entries(tipologieAmbiente).map(([tipologia, stats]) => ({
      tipologia,
      totali: stats.totali,
      completati: stats.completati,
      percentuale: stats.totali > 0 ? Math.round((stats.completati / stats.totali) * 100) : 0,
    }));

    return NextResponse.json({
      riepilogo: {
        servizi: servizi.length,
        applicazioni: servizi.reduce((sum, s) => sum + (s.applicazioni?.length || 0), 0),
        ambienti: totalAmbienti,
        completati: totalCompletati,
        percentualeTotale,
      },
      statiAvanzamento: Object.entries(statiAvanzamento).map(([stato, count]) => ({
        stato,
        count,
      })),
      statiMigrazioneCodice: Object.entries(statiMigrazioneCodice).map(([stato, count]) => ({
        stato,
        count,
      })),
      serviziStats,
      tipologieStats,
    });
  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    return NextResponse.json({ error: 'Errore nel recupero statistiche' }, { status: 500 });
  }
}
