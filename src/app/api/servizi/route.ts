import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logCreate } from '@/lib/audit';
import { sendCreateNotification } from '@/lib/email';
import { requireEdit } from '@/lib/auth/api';

// GET - Lista tutti i servizi con applicazioni e ambienti
export async function GET() {
  try {
    const servizi = await db.servizio.findMany({
      include: {
        applicazioni: {
          include: {
            ambienti: true,
          },
          orderBy: { ordine: 'asc' },
        },
      },
      orderBy: { ordine: 'asc' },
    });
    return NextResponse.json(servizi);
  } catch (error) {
    console.error('Errore nel recupero dei servizi:', error);
    return NextResponse.json({ error: 'Errore nel recupero dei servizi' }, { status: 500 });
  }
}

// POST - Crea nuovo servizio (richiede permessi di modifica)
export async function POST(request: NextRequest) {
  // Verifica autenticazione e permessi
  const authCheck = await requireEdit();
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const body = await request.json();
    const { nome, descrizione, ordine } = body;

    if (!nome || nome.trim() === '') {
      return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 });
    }

    const servizio = await db.servizio.create({
      data: {
        nome: nome.trim(),
        descrizione: descrizione?.trim() || null,
        ordine: ordine || 0,
      },
    });

    // Registra la creazione nell'audit log
    const userAgent = request.headers.get('user-agent') || undefined;
    await logCreate('SERVIZIO', servizio.id, servizio.nome, userAgent, authCheck.user?.username);

    // Invia notifica email
    await sendCreateNotification('SERVIZIO', servizio.nome, descrizione || undefined);

    return NextResponse.json(servizio, { status: 201 });
  } catch (error) {
    console.error('Errore nella creazione del servizio:', error);
    return NextResponse.json({ error: 'Errore nella creazione del servizio' }, { status: 500 });
  }
}
