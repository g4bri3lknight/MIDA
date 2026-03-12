import nodemailer from 'nodemailer';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { db } from './db';
import { resolve4 } from 'dns';
import { promisify } from 'util';

const resolve4Async = promisify(resolve4);

// Risolve l'hostname in indirizzo IPv4 per evitare problemi con IPv6
async function resolveToIPv4(hostname: string): Promise<string> {
  try {
    const addresses = await resolve4Async(hostname);
    if (addresses && addresses.length > 0) {
      return addresses[0];
    }
    return hostname;
  } catch (error) {
    console.log('Impossibile risolvere IPv4, uso hostname originale:', hostname);
    return hostname;
  }
}

export interface EmailConfig {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  senderEmail: string;
  senderName: string;
  recipients: string;
  // Proxy
  proxyEnabled: boolean;
  proxyHost: string | null;
  proxyPort: number | null;
  proxyUser: string | null;
  proxyPassword: string | null;
  // Notifications
  notifyScadenze: boolean;
  notifyScadenzeDays: number;
  notifyModifiche: boolean;
  notifyCreate: boolean;
  notifyUpdate: boolean;
  notifyDelete: boolean;
  enabled: boolean;
}

export interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Ottiene la configurazione email attiva
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const config = await db.emailConfig.findFirst();
    return config;
  } catch (error) {
    console.error('Errore nel recupero configurazione email:', error);
    return null;
  }
}

/**
 * Crea un transporter nodemailer dalla configurazione
 */
async function createTransporter(config: EmailConfig, fallbackNoTLS = false) {
  const smtpHostOrIP = await resolveToIPv4(config.smtpHost);
  
  const isPort465 = config.smtpPort === 465;
  const isPort587 = config.smtpPort === 587;
  
  // Crea l'agente proxy se configurato
  let proxyAgent: HttpsProxyAgent | undefined;
  if (config.proxyEnabled && config.proxyHost && config.proxyPort) {
    let proxyUrl: string;
    if (config.proxyUser && config.proxyPassword) {
      proxyUrl = `http://${encodeURIComponent(config.proxyUser)}:${encodeURIComponent(config.proxyPassword)}@${config.proxyHost}:${config.proxyPort}`;
    } else {
      proxyUrl = `http://${config.proxyHost}:${config.proxyPort}`;
    }
    console.log(`[Email] Proxy configurato: ${config.proxyHost}:${config.proxyPort}`);
    proxyAgent = new HttpsProxyAgent(proxyUrl);
  }
  
  // @ts-expect-error - nodemailer types don't include all options
  let transporterConfig: nodemailer.TransportOptions = {
    host: smtpHostOrIP,
    port: config.smtpPort,
    secure: isPort465 || config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
    connectionTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
    },
  };
  
  // Aggiungi proxy se configurato
  if (proxyAgent) {
    // @ts-expect-error - nodemailer types don't include proxy agent
    transporterConfig.agent = proxyAgent;
  }
  
  // Configurazione specifica per porta 587
  if (isPort587) {
    if (fallbackNoTLS) {
      transporterConfig.secure = false;
      // @ts-expect-error - ignoreTLS not in types
      transporterConfig.ignoreTLS = true;
    } else {
      transporterConfig.secure = false;
      // @ts-expect-error - requireTLS not in types
      transporterConfig.requireTLS = true;
    }
  }
  
  return nodemailer.createTransport(transporterConfig);
}

/**
 * Invia un'email
 */
export async function sendEmail(
  options: EmailOptions,
  config?: EmailConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailConfig = config || (await getEmailConfig());
    
    if (!emailConfig) {
      console.error('[Email] Configurazione email non trovata');
      return { success: false, error: 'Configurazione email non trovata' };
    }

    if (!emailConfig.enabled) {
      console.log('[Email] Invio email disabilitato nella configurazione');
      return { success: false, error: 'Invio email disabilitato' };
    }

    console.log(`[Email] Tentativo invio a: ${options.to.join(', ')}`);
    console.log(`[Email] SMTP: ${emailConfig.smtpHost}:${emailConfig.smtpPort}`);
    
    let transporter = await createTransporter(emailConfig);

    try {
      await transporter.sendMail({
        from: `"${emailConfig.senderName}" <${emailConfig.senderEmail}>`,
        to: options.to.join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log('[Email] Email inviata con successo');
      return { success: true };
    } catch (firstError) {
      const errorMsg = firstError instanceof Error ? firstError.message : '';
      console.error(`[Email] Primo tentativo fallito: ${errorMsg}`);
      
      if (emailConfig.smtpPort === 587 && (errorMsg.includes('SSL') || errorMsg.includes('TLS'))) {
        console.log('[Email] Riprovo invio senza STARTTLS...');
        transporter = await createTransporter(emailConfig, true);
        await transporter.sendMail({
          from: `"${emailConfig.senderName}" <${emailConfig.senderEmail}>`,
          to: options.to.join(', '),
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        console.log('[Email] Email inviata con successo (fallback senza TLS)');
        return { success: true };
      }
      throw firstError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('[Email] Errore invio email:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Registra un log email
 */
export async function logEmailSend(
  type: string,
  subject: string,
  recipients: string[],
  success: boolean,
  error?: string
) {
  try {
    await db.emailLog.create({
      data: {
        type,
        subject,
        recipients: recipients.join(', '),
        status: success ? 'SENT' : 'FAILED',
        error,
      },
    });
  } catch (e) {
    console.error('Errore nel salvataggio log email:', e);
  }
}

/**
 * Invia notifica per creazione entità
 */
export async function sendCreateNotification(
  entityType: 'SERVIZIO' | 'APPLICAZIONE' | 'AMBIENTE',
  entityName: string,
  details?: string
): Promise<void> {
  try {
    const config = await getEmailConfig();
    
    if (!config) {
      console.log('[Email] Configurazione non trovata, notifica creazione non inviata');
      return;
    }
    
    if (!config.enabled) {
      console.log('[Email] Notifiche disabilitate, notifica creazione non inviata');
      return;
    }
    
    if (!config.notifyModifiche) {
      console.log('[Email] Notifiche modifiche disabilitate, notifica creazione non inviata');
      return;
    }
    
    if (!config.notifyCreate) {
      console.log('[Email] Notifiche creazione disabilitate, notifica non inviata');
      return;
    }

    const recipients = config.recipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      console.log('[Email] Nessun destinatario configurato, notifica non inviata');
      return;
    }

    const entityTypeLabel = {
      SERVIZIO: 'Servizio',
      APPLICAZIONE: 'Applicazione',
      AMBIENTE: 'Ambiente',
    }[entityType];

    const subject = `[MIDA] Nuovo ${entityTypeLabel} creato: ${entityName}`;
    const html = `
      <h2>Nuovo ${entityTypeLabel} creato</h2>
      <p><strong>Nome:</strong> ${entityName}</p>
      ${details ? `<p><strong>Dettagli:</strong> ${details}</p>` : ''}
      <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Messaggio automatico da MIDA - Migration Dashboard</p>
    `;

    console.log(`[Email] Invio notifica creazione per ${entityType}: ${entityName}`);
    const result = await sendEmail({ to: recipients, subject, html }, config);
    
    if (result.success) {
      console.log(`[Email] Notifica creazione inviata con successo`);
    } else {
      console.error(`[Email] Errore invio notifica creazione: ${result.error}`);
    }
    
    await logEmailSend('CREATE', subject, recipients, result.success, result.error);
  } catch (error) {
    console.error('[Email] Errore invio notifica creazione:', error);
  }
}

/**
 * Invia notifica per modifica entità
 */
export async function sendUpdateNotification(
  entityType: 'SERVIZIO' | 'APPLICAZIONE' | 'AMBIENTE',
  entityName: string,
  changes: { field: string; oldValue: string | null; newValue: string | null }[]
): Promise<void> {
  try {
    const config = await getEmailConfig();
    
    if (!config) {
      console.log('[Email] Configurazione non trovata, notifica modifica non inviata');
      return;
    }
    
    if (!config.enabled) {
      console.log('[Email] Notifiche disabilitate, notifica modifica non inviata');
      return;
    }
    
    if (!config.notifyModifiche) {
      console.log('[Email] Notifiche modifiche disabilitate, notifica non inviata');
      return;
    }
    
    if (!config.notifyUpdate) {
      console.log('[Email] Notifiche aggiornamento disabilitate, notifica non inviata');
      return;
    }

    const recipients = config.recipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      console.log('[Email] Nessun destinatario configurato, notifica non inviata');
      return;
    }

    const entityTypeLabel = {
      SERVIZIO: 'Servizio',
      APPLICAZIONE: 'Applicazione',
      AMBIENTE: 'Ambiente',
    }[entityType];

    const changesHtml = changes
      .filter(c => c.oldValue !== c.newValue)
      .map(c => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${c.field}</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-decoration: line-through; color: #999;">${c.oldValue || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #2e7d32;">${c.newValue || '-'}</td>
        </tr>
      `).join('');

    if (!changesHtml) {
      console.log('[Email] Nessuna modifica reale, notifica non inviata');
      return;
    }

    const subject = `[MIDA] ${entityTypeLabel} modificato: ${entityName}`;
    const html = `
      <h2>${entityTypeLabel} modificato</h2>
      <p><strong>Nome:</strong> ${entityName}</p>
      <h3>Modifiche:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">Campo</th>
            <th style="padding: 8px; text-align: left;">Valore precedente</th>
            <th style="padding: 8px; text-align: left;">Nuovo valore</th>
          </tr>
        </thead>
        <tbody>
          ${changesHtml}
        </tbody>
      </table>
      <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Messaggio automatico da MIDA - Migration Dashboard</p>
    `;

    console.log(`[Email] Invio notifica modifica per ${entityType}: ${entityName}`);
    const result = await sendEmail({ to: recipients, subject, html }, config);
    
    if (result.success) {
      console.log(`[Email] Notifica modifica inviata con successo`);
    } else {
      console.error(`[Email] Errore invio notifica modifica: ${result.error}`);
    }
    
    await logEmailSend('UPDATE', subject, recipients, result.success, result.error);
  } catch (error) {
    console.error('[Email] Errore invio notifica modifica:', error);
  }
}

/**
 * Invia notifica per eliminazione entità
 */
export async function sendDeleteNotification(
  entityType: 'SERVIZIO' | 'APPLICAZIONE' | 'AMBIENTE',
  entityName: string
): Promise<void> {
  try {
    const config = await getEmailConfig();
    
    if (!config) {
      console.log('[Email] Configurazione non trovata, notifica eliminazione non inviata');
      return;
    }
    
    if (!config.enabled) {
      console.log('[Email] Notifiche disabilitate, notifica eliminazione non inviata');
      return;
    }
    
    if (!config.notifyModifiche) {
      console.log('[Email] Notifiche modifiche disabilitate, notifica eliminazione non inviata');
      return;
    }
    
    if (!config.notifyDelete) {
      console.log('[Email] Notifiche eliminazione disabilitate, notifica non inviata');
      return;
    }

    const recipients = config.recipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      console.log('[Email] Nessun destinatario configurato, notifica non inviata');
      return;
    }

    const entityTypeLabel = {
      SERVIZIO: 'Servizio',
      APPLICAZIONE: 'Applicazione',
      AMBIENTE: 'Ambiente',
    }[entityType];

    const subject = `[MIDA] ${entityTypeLabel} eliminato: ${entityName}`;
    const html = `
      <h2>${entityTypeLabel} eliminato</h2>
      <p><strong>Nome:</strong> ${entityName}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Messaggio automatico da MIDA - Migration Dashboard</p>
    `;

    console.log(`[Email] Invio notifica eliminazione per ${entityType}: ${entityName}`);
    const result = await sendEmail({ to: recipients, subject, html }, config);
    
    if (result.success) {
      console.log(`[Email] Notifica eliminazione inviata con successo`);
    } else {
      console.error(`[Email] Errore invio notifica eliminazione: ${result.error}`);
    }
    
    await logEmailSend('DELETE', subject, recipients, result.success, result.error);
  } catch (error) {
    console.error('[Email] Errore invio notifica eliminazione:', error);
  }
}

/**
 * Interfaccia per notifica scadenza
 */
interface DeadlineNotificationParams {
  ambiente: {
    id: string;
    tipologia: string;
    statoAvanzamento: string;
    dataFine: Date;
    richiestaCHG?: string | null;
  };
  applicazione: {
    nome: string;
  };
  servizio: {
    nome: string;
  };
  daysRemaining: number;
  isOverdue: boolean;
}

/**
 * Invia notifica per scadenza migrazione
 */
export async function sendDeadlineNotification(
  params: DeadlineNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getEmailConfig();
    
    if (!config) {
      console.log('[Email] Configurazione non trovata, notifica scadenza non inviata');
      return { success: false, error: 'Configurazione non trovata' };
    }
    
    if (!config.enabled) {
      console.log('[Email] Notifiche disabilitate, notifica scadenza non inviata');
      return { success: false, error: 'Notifiche disabilitate' };
    }
    
    if (!config.notifyScadenze) {
      console.log('[Email] Notifiche scadenze disabilitate, notifica non inviata');
      return { success: false, error: 'Notifiche scadenze disabilitate' };
    }

    const recipients = config.recipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      console.log('[Email] Nessun destinatario configurato, notifica non inviata');
      return { success: false, error: 'Nessun destinatario' };
    }

    const { ambiente, applicazione, servizio, daysRemaining, isOverdue } = params;
    
    const tipologiaLabels: Record<string, string> = {
      'TEST_INTERNO': 'Test Interno',
      'VALIDAZIONE': 'Validazione',
      'TEST_CONCESSIONARI': 'Test Concessionari',
      'BENCHMARK': 'Benchmark',
      'PRODUZIONE': 'Produzione',
    };

    const statoLabels: Record<string, string> = {
      'NON_INIZIATO': 'Non Iniziato',
      'RICHIESTA_AMBIENTI': 'Richiesta Ambienti',
      'CONFIGURAZIONE_AMBIENTI': 'Configurazione Ambienti',
      'IN_TEST': 'In Test',
      'COMPLETATO': 'Completato',
    };

    const ambienteLabel = tipologiaLabels[ambiente.tipologia] || ambiente.tipologia;
    const statoLabel = statoLabels[ambiente.statoAvanzamento] || ambiente.statoAvanzamento;
    
    // Determina il tipo di alert
    const alertType = isOverdue ? '🚨 IN RITARDO' : '⚠️ IN SCADENZA';
    const alertColor = isOverdue ? '#d32f2f' : '#f57c00';
    const daysText = isOverdue 
      ? `In ritardo di ${Math.abs(daysRemaining)} giorni`
      : `Scade tra ${daysRemaining} giorni`;

    const subject = `[MIDA] ${alertType} - ${servizio.nome} > ${applicazione.nome} > ${ambienteLabel}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${alertColor}; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${alertType}</h2>
          <p style="margin: 5px 0 0 0; font-size: 18px;">${daysText}</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #eee; border-top: none;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Servizio:</strong></td>
              <td style="padding: 8px 0;">${servizio.nome}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Applicazione:</strong></td>
              <td style="padding: 8px 0;">${applicazione.nome}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Ambiente:</strong></td>
              <td style="padding: 8px 0;">${ambienteLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Stato Avanzamento:</strong></td>
              <td style="padding: 8px 0;">${statoLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Data Scadenza:</strong></td>
              <td style="padding: 8px 0; ${isOverdue ? 'color: #d32f2f; font-weight: bold;' : ''}">${ambiente.dataFine.toLocaleDateString('it-IT')}</td>
            </tr>
            ${ambiente.richiestaCHG ? `
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Richiesta CHG:</strong></td>
              <td style="padding: 8px 0;">${ambiente.richiestaCHG}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="padding: 15px; text-align: center; background: #f5f5f5; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #666; font-size: 12px;">
            <strong>Data notifica:</strong> ${new Date().toLocaleString('it-IT')}<br>
            Messaggio automatico da MIDA - Migration Dashboard
          </p>
        </div>
      </div>
    `;

    console.log(`[Email] Invio notifica scadenza per: ${servizio.nome} > ${applicazione.nome} > ${ambienteLabel}`);
    const result = await sendEmail({ to: recipients, subject, html }, config);
    
    if (result.success) {
      console.log(`[Email] Notifica scadenza inviata con successo`);
    } else {
      console.error(`[Email] Errore invio notifica scadenza: ${result.error}`);
    }
    
    await logEmailSend('DEADLINE', subject, recipients, result.success, result.error);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('[Email] Errore invio notifica scadenza:', error);
    return { success: false, error: errorMessage };
  }
}
