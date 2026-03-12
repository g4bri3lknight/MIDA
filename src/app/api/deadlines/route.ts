import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TIPOLOGIA_AMBIENTE_LABELS, STATO_AVANZAMENTO_LABELS } from '@/types/migration';

/**
 * API per ottenere un riepilogo delle scadenze imminenti e in ritardo
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    // Recupera tutti gli ambienti non completati con data fine
    const ambienti = await db.ambiente.findMany({
      where: {
        statoAvanzamento: { not: 'COMPLETATO' },
        dataFine: { not: null },
      },
      include: {
        applicazione: {
          include: {
            servizio: true,
          },
        },
      },
      orderBy: {
        dataFine: 'asc',
      },
    });

    const overdue: typeof ambienti = [];
    const upcoming: typeof ambienti = [];
    const future: typeof ambienti = [];

    for (const ambiente of ambienti) {
      const dataFine = ambiente.dataFine!;
      
      if (dataFine < now) {
        overdue.push(ambiente);
      } else if (dataFine <= threshold) {
        upcoming.push(ambiente);
      } else {
        future.push(ambiente);
      }
    }

    // Formatta i risultati
    const formatAmbiente = (amb: typeof ambienti[0]) => {
      const dataFine = amb.dataFine!;
      const daysRemaining = Math.ceil((dataFine.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: amb.id,
        servizio: amb.applicazione.servizio.nome,
        servizioId: amb.applicazione.servizio.id,
        applicazione: amb.applicazione.nome,
        applicazioneId: amb.applicazione.id,
        tipologia: TIPOLOGIA_AMBIENTE_LABELS[amb.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS],
        tipologiaKey: amb.tipologia,
        statoAvanzamento: STATO_AVANZAMENTO_LABELS[amb.statoAvanzamento as keyof typeof STATO_AVANZAMENTO_LABELS],
        statoAvanzamentoKey: amb.statoAvanzamento,
        dataFine: dataFine.toISOString(),
        dataFineFormatted: dataFine.toLocaleDateString('it-IT'),
        daysRemaining,
        isOverdue: daysRemaining < 0,
        richiestaCHG: amb.richiestaCHG,
        lastNotificationSentAt: amb.lastNotificationSentAt?.toISOString() || null,
      };
    };

    return NextResponse.json({
      timestamp: now.toISOString(),
      threshold: threshold.toISOString(),
      days,
      summary: {
        total: ambienti.length,
        overdue: overdue.length,
        upcoming: upcoming.length,
        future: future.length,
      },
      overdue: overdue.map(formatAmbiente),
      upcoming: upcoming.map(formatAmbiente),
    });

  } catch (error) {
    console.error('[Deadlines] Errore:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle scadenze' },
      { status: 500 }
    );
  }
}
