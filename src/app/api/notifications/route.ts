import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendDeadlineNotification } from '@/lib/email';
import { TIPOLOGIA_AMBIENTE_LABELS, STATO_AVANZAMENTO_LABELS } from '@/types/migration';

/**
 * API per controllare le scadenze e inviare notifiche
 * Può essere chiamata:
 * - Manualmente dal frontend
 * - Da un cron job esterno
 * - Da un mini-service interno
 */
export async function GET(request: NextRequest) {
  console.log('[Notifications] Avvio controllo scadenze...');
  
  try {
    // Verifica configurazione email
    const config = await db.emailConfig.findFirst();
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        message: 'Configurazione email non trovata' 
      });
    }
    
    if (!config.enabled) {
      return NextResponse.json({ 
        success: false, 
        message: 'Notifiche email disabilitate' 
      });
    }
    
    if (!config.notifyScadenze) {
      return NextResponse.json({ 
        success: false, 
        message: 'Notifiche scadenze disabilitate' 
      });
    }

    const now = new Date();
    const daysBeforeDeadline = config.notifyScadenzeDays || 7;
    const notificationThreshold = new Date(now.getTime() + daysBeforeDeadline * 24 * 60 * 60 * 1000);
    
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
    });

    console.log(`[Notifications] Trovati ${ambienti.length} ambienti da controllare`);

    const results = {
      checked: ambienti.length,
      overdue: 0,
      upcoming: 0,
      notificationsSent: 0,
      errors: [] as string[],
      details: [] as { ambiente: string; status: string; notificationSent: boolean }[],
    };

    for (const ambiente of ambienti) {
      try {
        const dataFine = ambiente.dataFine!;
        const applicazione = ambiente.applicazione;
        const servizio = applicazione.servizio;
        
        const ambienteLabel = `${servizio.nome} > ${applicazione.nome} > ${TIPOLOGIA_AMBIENTE_LABELS[ambiente.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS]}`;
        
        // Controlla se è in ritardo
        const isOverdue = dataFine < now;
        // Controlla se è prossimo alla scadenza (entro i giorni configurati)
        const isUpcoming = !isOverdue && dataFine <= notificationThreshold;
        
        if (!isOverdue && !isUpcoming) {
          continue; // Non necessita notifica
        }

        // Controlla se abbiamo già inviato una notifica recentemente (nelle ultime 24 ore)
        if (ambiente.lastNotificationSentAt) {
          const hoursSinceLastNotification = (now.getTime() - ambiente.lastNotificationSentAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastNotification < 24) {
            console.log(`[Notifications] Notifica già inviata di recente per: ${ambienteLabel}`);
            continue;
          }
        }

        // Determina lo stato
        const status = isOverdue ? 'OVERDUE' : 'UPCOMING';
        
        if (isOverdue) {
          results.overdue++;
        } else {
          results.upcoming++;
        }

        // Invia notifica
        const daysDiff = Math.ceil((dataFine.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        const notificationResult = await sendDeadlineNotification({
          ambiente: {
            id: ambiente.id,
            tipologia: ambiente.tipologia,
            statoAvanzamento: ambiente.statoAvanzamento,
            dataFine: dataFine,
            richiestaCHG: ambiente.richiestaCHG,
          },
          applicazione: {
            nome: applicazione.nome,
          },
          servizio: {
            nome: servizio.nome,
          },
          daysRemaining: daysDiff,
          isOverdue,
        });

        if (notificationResult.success) {
          // Aggiorna la data dell'ultima notifica
          await db.ambiente.update({
            where: { id: ambiente.id },
            data: { lastNotificationSentAt: now },
          });
          
          results.notificationsSent++;
          results.details.push({
            ambiente: ambienteLabel,
            status: isOverdue ? 'IN RITARDO' : `Scade tra ${daysDiff} giorni`,
            notificationSent: true,
          });
        } else {
          results.errors.push(`Errore notifica per ${ambienteLabel}: ${notificationResult.error}`);
          results.details.push({
            ambiente: ambienteLabel,
            status: isOverdue ? 'IN RITARDO' : `Scade tra ${daysDiff} giorni`,
            notificationSent: false,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
        results.errors.push(`Errore elaborazione ambiente: ${errorMsg}`);
      }
    }

    console.log(`[Notifications] Controllo completato: ${results.notificationsSent} notifiche inviate`);

    // Registra log
    if (results.notificationsSent > 0) {
      await db.emailLog.create({
        data: {
          type: 'DEADLINE_CHECK',
          subject: `Controllo scadenze: ${results.notificationsSent} notifiche inviate`,
          recipients: config.recipients,
          status: 'SENT',
          error: results.errors.length > 0 ? results.errors.join('; ') : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      config: {
        daysBeforeDeadline,
        enabled: config.enabled,
        notifyScadenze: config.notifyScadenze,
      },
      results,
    });

  } catch (error) {
    console.error('[Notifications] Errore:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    );
  }
}

/**
 * Reset delle notifiche per un ambiente specifico (per test)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ambienteId, resetNotification } = body;

    if (ambienteId && resetNotification) {
      await db.ambiente.update({
        where: { id: ambienteId },
        data: { lastNotificationSentAt: null },
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Notifica resettata per l\'ambiente' 
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Parametri non validi' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('[Notifications] Errore POST:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel reset notifica' },
      { status: 500 }
    );
  }
}
