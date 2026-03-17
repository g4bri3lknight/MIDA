import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logCreate } from '@/lib/audit';
import { sendCreateNotification } from '@/lib/email';
import { TIPOLOGIA_AMBIENTE_LABELS } from '@/types/migration';
import { requireEdit } from '@/lib/auth/api';

// GET - Lista tutti gli ambienti
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicazioneId = searchParams.get('applicazioneId');

    const where = applicazioneId ? { applicazioneId } : {};

    const ambienti = await db.ambiente.findMany({
      where,
      include: {
        applicazione: {
          include: {
            servizio: true,
          },
        },
      },
    });

    return NextResponse.json(ambienti);
  } catch (error) {
    console.error('Errore nel recupero degli ambienti:', error);
    return NextResponse.json({ error: 'Errore nel recupero degli ambienti' }, { status: 500 });
  }
}

// POST - Crea nuovo ambiente
export async function POST(request: NextRequest) {
  const authCheck = await requireEdit(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const body = await request.json();
    const {
      tipologia,
      tipoNodo,
      statoAvanzamento,
      dataInizio,
      dataFine,
      nomeMacchina1,
      macchineWS1,
      macchineJBoss1,
      nomeMacchina2,
      macchineWS2,
      macchineJBoss2,
      dns,
      netscaler,
      richiestaCHG,
      riscontri,
      note,
      configurazioni,
      applicazioneId,
    } = body;

    if (!applicazioneId) {
      return NextResponse.json({ error: 'L\'applicazione è obbligatoria' }, { status: 400 });
    }

    if (!tipologia) {
      return NextResponse.json({ error: 'La tipologia è obbligatoria' }, { status: 400 });
    }

    const ambiente = await db.ambiente.create({
      data: {
        tipologia,
        tipoNodo: tipoNodo || 'SINGOLO',
        statoAvanzamento: statoAvanzamento || 'NON_INIZIATO',
        dataInizio: dataInizio ? new Date(dataInizio) : null,
        dataFine: dataFine ? new Date(dataFine) : null,
        nomeMacchina1: nomeMacchina1?.trim() || null,
        macchineWS1: macchineWS1?.trim() || null,
        macchineJBoss1: macchineJBoss1?.trim() || null,
        nomeMacchina2: nomeMacchina2?.trim() || null,
        macchineWS2: macchineWS2?.trim() || null,
        macchineJBoss2: macchineJBoss2?.trim() || null,
        dns: dns?.trim() || null,
        netscaler: netscaler?.trim() || null,
        richiestaCHG: richiestaCHG?.trim() || null,
        riscontri: riscontri?.trim() || null,
        note: note?.trim() || null,
        configurazioni: configurazioni?.trim() || null,
        applicazioneId,
      },
      include: {
        applicazione: {
          include: {
            servizio: true,
          },
        },
      },
    });

    // Registra la creazione nell'audit log
    const userAgent = request.headers.get('user-agent') || undefined;
    const entityName = `${ambiente.applicazione.nome} - ${TIPOLOGIA_AMBIENTE_LABELS[ambiente.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS]}`;
    await logCreate('AMBIENTE', ambiente.id, entityName, userAgent, authCheck.user?.id);

    // Invia notifica email
    const details = `Applicazione: ${ambiente.applicazione.nome}`;
    await sendCreateNotification('AMBIENTE', entityName, details);

    return NextResponse.json(ambiente, { status: 201 });
  } catch (error) {
    console.error('Errore nella creazione dell\'ambiente:', error);
    return NextResponse.json({ error: 'Errore nella creazione dell\'ambiente' }, { status: 500 });
  }
}
