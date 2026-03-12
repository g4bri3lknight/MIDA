import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logChanges, logDelete } from '@/lib/audit';
import { sendUpdateNotification, sendDeleteNotification } from '@/lib/email';
import { requireEdit, requireDelete } from '@/lib/auth/api';

// GET - Singola applicazione
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicazione = await db.applicazione.findUnique({
      where: { id },
      include: {
        servizio: true,
        ambienti: true,
      },
    });

    if (!applicazione) {
      return NextResponse.json({ error: 'Applicazione non trovata' }, { status: 404 });
    }

    return NextResponse.json(applicazione);
  } catch (error) {
    console.error('Errore nel recupero dell\'applicazione:', error);
    return NextResponse.json({ error: 'Errore nel recupero dell\'applicazione' }, { status: 500 });
  }
}

// PUT - Aggiorna applicazione
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireEdit(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, descrizione, ordine, servizioId, statoMigrazioneCodice } = body;

    if (!nome || nome.trim() === '') {
      return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 });
    }

    // Recupera l'applicazione prima dell'aggiornamento per l'audit
    const oldApp = await db.applicazione.findUnique({
      where: { id },
    });

    const applicazione = await db.applicazione.update({
      where: { id },
      data: {
        nome: nome.trim(),
        descrizione: descrizione?.trim() || null,
        ordine: ordine ?? undefined,
        servizioId: servizioId ?? undefined,
        statoMigrazioneCodice: statoMigrazioneCodice ?? undefined,
      },
    });

    // Registra tutte le modifiche nell'audit log
    if (oldApp) {
      const userAgent = request.headers.get('user-agent') || undefined;
      const changes = [
        { field: 'nome', oldValue: oldApp.nome, newValue: nome.trim() },
        { field: 'descrizione', oldValue: oldApp.descrizione, newValue: descrizione?.trim() || null },
        { field: 'ordine', oldValue: oldApp.ordine?.toString(), newValue: ordine?.toString() },
        { field: 'statoMigrazioneCodice', oldValue: oldApp.statoMigrazioneCodice, newValue: statoMigrazioneCodice },
        { field: 'servizioId', oldValue: oldApp.servizioId, newValue: servizioId },
      ];
      await logChanges('APPLICAZIONE', id, applicazione.nome, changes, userAgent, authCheck.user?.id);
      
      // Invia notifica email
      await sendUpdateNotification('APPLICAZIONE', applicazione.nome, changes);
    }

    return NextResponse.json(applicazione);
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'applicazione:', error);
    return NextResponse.json({ error: 'Errore nell\'aggiornamento dell\'applicazione' }, { status: 500 });
  }
}

// DELETE - Elimina applicazione
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireDelete(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const { id } = await params;
    
    // Recupera l'applicazione prima dell'eliminazione per l'audit
    const applicazione = await db.applicazione.findUnique({
      where: { id },
    });

    await db.applicazione.delete({
      where: { id },
    });

    // Registra l'eliminazione nell'audit log
    if (applicazione) {
      const userAgent = request.headers.get('user-agent') || undefined;
      await logDelete('APPLICAZIONE', id, applicazione.nome, userAgent, authCheck.user?.id);
      
      // Invia notifica email
      await sendDeleteNotification('APPLICAZIONE', applicazione.nome);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'applicazione:', error);
    return NextResponse.json({ error: 'Errore nell\'eliminazione dell\'applicazione' }, { status: 500 });
  }
}
