import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Ottiene la configurazione email
export async function GET() {
  try {
    const config = await db.emailConfig.findFirst();
    
    if (config) {
      const hasPassword = !!config.smtpPassword && config.smtpPassword.length > 0;
      const hasProxyPassword = !!config.proxyPassword && config.proxyPassword.length > 0;
      return NextResponse.json({
        ...config,
        smtpPassword: '', // Non restituire mai la password
        proxyPassword: '', // Non restituire mai la password del proxy
        hasPassword,
        hasProxyPassword,
      });
    }
    
    return NextResponse.json(null);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('Errore nel recupero configurazione email:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero della configurazione', details: errorMsg },
      { status: 500 }
    );
  }
}

// POST - Crea o aggiorna la configurazione email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpSecure,
      senderEmail,
      senderName,
      recipients,
      // Proxy fields
      proxyEnabled,
      proxyHost,
      proxyPort,
      proxyUser,
      proxyPassword,
      // Notification fields
      notifyScadenze,
      notifyScadenzeDays,
      notifyModifiche,
      notifyCreate,
      notifyUpdate,
      notifyDelete,
      enabled,
    } = body;

    // Validazione base
    if (!smtpHost) {
      return NextResponse.json(
        { error: 'Host SMTP obbligatorio' },
        { status: 400 }
      );
    }
    if (!smtpUser) {
      return NextResponse.json(
        { error: 'Utente SMTP obbligatorio' },
        { status: 400 }
      );
    }
    if (!senderEmail) {
      return NextResponse.json(
        { error: 'Email mittente obbligatoria' },
        { status: 400 }
      );
    }
    if (!recipients) {
      return NextResponse.json(
        { error: 'Destinatari obbligatori' },
        { status: 400 }
      );
    }

    const existing = await db.emailConfig.findFirst();

    let config;
    
    if (existing) {
      const updateData: Record<string, unknown> = {
        smtpHost,
        smtpPort: parseInt(smtpPort) || 587,
        smtpUser,
        smtpSecure: smtpSecure || false,
        senderEmail,
        senderName: senderName || 'MIDA - Migration Dashboard',
        recipients,
        // Proxy
        proxyEnabled: proxyEnabled || false,
        proxyHost: proxyHost?.trim() || null,
        proxyPort: proxyPort ? parseInt(proxyPort) : null,
        proxyUser: proxyUser?.trim() || null,
        // Notification settings
        notifyScadenze: notifyScadenze ?? true,
        notifyScadenzeDays: parseInt(notifyScadenzeDays) || 7,
        notifyModifiche: notifyModifiche ?? true,
        notifyCreate: notifyCreate ?? true,
        notifyUpdate: notifyUpdate ?? true,
        notifyDelete: notifyDelete ?? true,
        enabled: enabled ?? false,
      };

      // Aggiorna la password SMTP solo se fornita
      if (smtpPassword && smtpPassword.trim() !== '') {
        updateData.smtpPassword = smtpPassword;
      }

      // Aggiorna la password del proxy solo se fornita
      if (proxyPassword && proxyPassword.trim() !== '') {
        updateData.proxyPassword = proxyPassword;
      }

      config = await db.emailConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
      
      const hasPassword = !!(config.smtpPassword && config.smtpPassword.length > 0);
      const hasProxyPassword = !!(config.proxyPassword && config.proxyPassword.length > 0);
      return NextResponse.json({
        ...config,
        smtpPassword: '',
        proxyPassword: '',
        hasPassword,
        hasProxyPassword,
      });
    } else {
      if (!smtpPassword || smtpPassword.trim() === '') {
        return NextResponse.json(
          { error: 'Password SMTP richiesta per nuova configurazione' },
          { status: 400 }
        );
      }

      config = await db.emailConfig.create({
        data: {
          smtpHost,
          smtpPort: parseInt(smtpPort) || 587,
          smtpUser,
          smtpPassword,
          smtpSecure: smtpSecure || false,
          senderEmail,
          senderName: senderName || 'MIDA - Migration Dashboard',
          recipients,
          // Proxy
          proxyEnabled: proxyEnabled || false,
          proxyHost: proxyHost?.trim() || null,
          proxyPort: proxyPort ? parseInt(proxyPort) : null,
          proxyUser: proxyUser?.trim() || null,
          proxyPassword: proxyPassword?.trim() || null,
          // Notification settings
          notifyScadenze: notifyScadenze ?? true,
          notifyScadenzeDays: parseInt(notifyScadenzeDays) || 7,
          notifyModifiche: notifyModifiche ?? true,
          notifyCreate: notifyCreate ?? true,
          notifyUpdate: notifyUpdate ?? true,
          notifyDelete: notifyDelete ?? true,
          enabled: enabled ?? false,
        },
      });

      const hasProxyPassword = !!(config.proxyPassword && config.proxyPassword.length > 0);
      return NextResponse.json({
        ...config,
        smtpPassword: '',
        proxyPassword: '',
        hasPassword: true,
        hasProxyPassword,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('Errore nel salvataggio configurazione email:', error);
    return NextResponse.json(
      { error: 'Errore nel salvataggio della configurazione', details: errorMsg },
      { status: 500 }
    );
  }
}

// DELETE - Elimina la configurazione email
export async function DELETE() {
  try {
    const existing = await db.emailConfig.findFirst();
    
    if (existing) {
      await db.emailConfig.delete({
        where: { id: existing.id },
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione configurazione email:', error);
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione della configurazione' },
      { status: 500 }
    );
  }
}
