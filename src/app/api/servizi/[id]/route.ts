import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logChanges, logDelete } from '@/lib/audit';
import { sendUpdateNotification, sendDeleteNotification } from '@/lib/email';
import { requireEdit, requireDelete } from '@/lib/auth/api';

// GET - Singolo servizio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const servizio = await db.servizio.findUnique({
      where: { id },
      include: {
        applicazioni: {
          include: {
            ambienti: true,
          },
          orderBy: { ordine: 'asc' },
        },
      },
    });

    if (!servizio) {
      return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 });
    }

    return NextResponse.json(servizio);
  } catch (error) {
    console.error('Errore nel recupero del servizio:', error);
    return NextResponse.json({ error: 'Errore nel recupero del servizio' }, { status: 500 });
  }
}

// PUT - Aggiorna servizio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireEdit();
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, descrizione, ordine } = body;

    if (!nome || nome.trim() === '') {
      return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 });
    }

    // Recupera il servizio prima dell'aggiornamento per l'audit
    const oldServizio = await db.servizio.findUnique({
      where: { id },
    });

    const servizio = await db.servizio.update({
      where: { id },
      data: {
        nome: nome.trim(),
        descrizione: descrizione?.trim() || null,
        ordine: ordine ?? undefined,
      },
    });

    // Registra tutte le modifiche nell'audit log
    if (oldServizio) {
      const userAgent = request.headers.get('user-agent') || undefined;
      const changes = [
        { field: 'nome', oldValue: oldServizio.nome, newValue: nome.trim() },
        { field: 'descrizione', oldValue: oldServizio.descrizione, newValue: descrizione?.trim() || null },
        { field: 'ordine', oldValue: oldServizio.ordine?.toString(), newValue: ordine?.toString() },
      ];
      await logChanges('SERVIZIO', id, servizio.nome, changes, userAgent, authCheck.user?.id);
      
      // Invia notifica email
      await sendUpdateNotification('SERVIZIO', servizio.nome, changes);
    }

    return NextResponse.json(servizio);
  } catch (error) {
    console.error('Errore nell\'aggiornamento del servizio:', error);
    return NextResponse.json({ error: 'Errore nell\'aggiornamento del servizio' }, { status: 500 });
  }
}

// DELETE - Elimina servizio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireDelete();
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const { id } = await params;
    
    // Recupera il servizio prima dell'eliminazione per l'audit
    const servizio = await db.servizio.findUnique({
      where: { id },
    });

    await db.servizio.delete({
      where: { id },
    });

    // Registra l'eliminazione nell'audit log
    if (servizio) {
      const userAgent = request.headers.get('user-agent') || undefined;
      await logDelete('SERVIZIO', id, servizio.nome, userAgent, authCheck.user?.id);
      
      // Invia notifica email
      await sendDeleteNotification('SERVIZIO', servizio.nome);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione del servizio:', error);
    return NextResponse.json({ error: 'Errore nell\'eliminazione del servizio' }, { status: 500 });
  }
}
