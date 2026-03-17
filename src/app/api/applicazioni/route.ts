import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logCreate } from '@/lib/audit';
import { sendCreateNotification } from '@/lib/email';
import { requireEdit } from '@/lib/auth/api';

// GET - Lista tutte le applicazioni
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const servizioId = searchParams.get('servizioId');

    const where = servizioId ? { servizioId } : {};

    const applicazioni = await db.applicazione.findMany({
      where,
      include: {
        servizio: true,
        ambienti: true,
      },
      orderBy: { ordine: 'asc' },
    });

    return NextResponse.json(applicazioni);
  } catch (error) {
    console.error('Errore nel recupero delle applicazioni:', error);
    return NextResponse.json({ error: 'Errore nel recupero delle applicazioni' }, { status: 500 });
  }
}

// POST - Crea nuova applicazione
export async function POST(request: NextRequest) {
  const authCheck = await requireEdit(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const body = await request.json();
    const { nome, descrizione, ordine, servizioId, statoMigrazioneCodice } = body;

    if (!nome || nome.trim() === '') {
      return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 });
    }

    if (!servizioId) {
      return NextResponse.json({ error: 'Il servizio è obbligatorio' }, { status: 400 });
    }

    const applicazione = await db.applicazione.create({
      data: {
        nome: nome.trim(),
        descrizione: descrizione?.trim() || null,
        ordine: ordine || 0,
        servizioId,
        statoMigrazioneCodice: statoMigrazioneCodice || 'DA_RIPROGETTARE',
      },
      include: {
        servizio: true,
      },
    });

    // Registra la creazione nell'audit log
    const userAgent = request.headers.get('user-agent') || undefined;
    await logCreate('APPLICAZIONE', applicazione.id, applicazione.nome, userAgent, authCheck.user?.id);

    // Invia notifica email
    const details = `Servizio: ${applicazione.servizio?.nome || 'N/A'}`;
    await sendCreateNotification('APPLICAZIONE', applicazione.nome, details);

    return NextResponse.json(applicazione, { status: 201 });
  } catch (error) {
    console.error('Errore nella creazione dell\'applicazione:', error);
    return NextResponse.json({ error: 'Errore nella creazione dell\'applicazione' }, { status: 500 });
  }
}
