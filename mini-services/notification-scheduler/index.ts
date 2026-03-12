/**
 * Notification Scheduler Service
 * 
 * Questo servizio gira come processo separato e controlla periodicamente
 * le scadenze per inviare notifiche automatiche.
 * 
 * Porta: 3031 (usata solo per health check)
 * 
 * Configurazione tramite variabili d'ambiente:
 * - NOTIFICATION_INTERVAL_MINUTES: Intervallo in minuti per il controllo (default: 60)
 * - MAIN_APP_URL: URL dell'applicazione principale (default: http://localhost:3000)
 */

import cron from 'node-cron';

const PORT = 3031;
const NOTIFICATION_INTERVAL_MINUTES = parseInt(process.env.NOTIFICATION_INTERVAL_MINUTES || '60', 10);
const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://localhost:3000';

console.log('='.repeat(60));
console.log('MIDA Notification Scheduler Service');
console.log('='.repeat(60));
console.log(`Porta: ${PORT}`);
console.log(`Intervallo controllo: ogni ${NOTIFICATION_INTERVAL_MINUTES} minuti`);
console.log(`URL app principale: ${MAIN_APP_URL}`);
console.log('='.repeat(60));

/**
 * Esegue il controllo delle scadenze chiamando l'API
 */
async function checkDeadlines(): Promise<void> {
  const now = new Date();
  console.log(`\n[${now.toISOString()}] Avvio controllo scadenze...`);

  try {
    const response = await fetch(`${MAIN_APP_URL}/api/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Header per identificare la richiesta come interna
        'X-Internal-Request': 'notification-scheduler',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`[SUCCESS] Controllo completato:`);
      console.log(`  - Ambienti controllati: ${result.results?.checked || 0}`);
      console.log(`  - In ritardo: ${result.results?.overdue || 0}`);
      console.log(`  - In scadenza: ${result.results?.upcoming || 0}`);
      console.log(`  - Notifiche inviate: ${result.results?.notificationsSent || 0}`);
      
      if (result.results?.errors?.length > 0) {
        console.log(`  - Errori: ${result.results.errors.length}`);
        result.results.errors.forEach((err: string) => console.log(`    * ${err}`));
      }
    } else {
      console.log(`[INFO] ${result.message || 'Nessuna azione eseguita'}`);
    }
  } catch (error) {
    console.error('[ERROR] Errore durante il controllo scadenze:', error);
  }
}

/**
 * Pianifica il job in base all'intervallo configurato
 */
function scheduleNotifications(): void {
  // Crea un'espressione cron basata sull'intervallo in minuti
  // Esempio: ogni 60 minuti = '0 * * * *'
  // Esempio: ogni 30 minuti = '*/30 * * * *'
  // Esempio: ogni 15 minuti = '*/15 * * * *'
  
  let cronExpression: string;
  
  if (NOTIFICATION_INTERVAL_MINUTES >= 60) {
    // Ogni X ore (arrotondando ai minuti 0)
    const hours = Math.floor(NOTIFICATION_INTERVAL_MINUTES / 60);
    cronExpression = `0 */${hours} * * *`;
  } else {
    // Ogni X minuti
    cronExpression = `*/${NOTIFICATION_INTERVAL_MINUTES} * * * *`;
  }
  
  console.log(`\nCron expression: ${cronExpression}`);
  console.log(`Prossimo controllo: tra ${NOTIFICATION_INTERVAL_MINUTES} minuti\n`);

  // Schedula il job
  const task = cron.schedule(cronExpression, checkDeadlines, {
    scheduled: true,
    timezone: 'Europe/Rome',
  });

  console.log('Job schedulato con successo. Il servizio e in esecuzione...');
  console.log('Premi Ctrl+C per terminare.\n');

  // Esegue un controllo immediato all'avvio
  console.log('Esecuzione controllo iniziale...');
  checkDeadlines().catch(console.error);
}

// Health check server semplice
Bun.serve({
  port: PORT,
  fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'notification-scheduler',
        timestamp: new Date().toISOString(),
        config: {
          notificationIntervalMinutes: NOTIFICATION_INTERVAL_MINUTES,
          mainAppUrl: MAIN_APP_URL,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response('Notification Scheduler Service', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
});

console.log(`\nHealth check disponibile su: http://localhost:${PORT}/health`);

// Avvia lo scheduler
scheduleNotifications();

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('\nRicevuto SIGINT, arresto in corso...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nRicevuto SIGTERM, arresto in corso...');
  process.exit(0);
});
