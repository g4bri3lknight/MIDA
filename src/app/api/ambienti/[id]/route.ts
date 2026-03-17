import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logChanges, logDelete } from '@/lib/audit';
import { sendUpdateNotification, sendDeleteNotification } from '@/lib/email';
import { TIPOLOGIA_AMBIENTE_LABELS, STATO_AVANZAMENTO_LABELS, TIPO_NODO_LABELS } from '@/types/migration';
import { requireEdit, requireDelete } from '@/lib/auth/api';

// GET - Singolo ambiente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ambiente = await db.ambiente.findUnique({
      where: { id },
      include: {
        applicazione: {
          include: {
            servizio: true,
          },
        },
      },
    });

    if (!ambiente) {
      return NextResponse.json({ error: 'Ambiente non trovato' }, { status: 404 });
    }

    return NextResponse.json(ambiente);
  } catch (error) {
    console.error('Errore nel recupero dell\'ambiente:', error);
    return NextResponse.json({ error: 'Errore nel recupero dell\'ambiente' }, { status: 500 });
  }
}

// PUT - Aggiorna ambiente
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

    // Recupera l'ambiente prima dell'aggiornamento per l'audit
    const oldAmbiente = await db.ambiente.findUnique({
      where: { id },
      include: {
        applicazione: true,
      },
    });

    const ambiente = await db.ambiente.update({
      where: { id },
      data: {
        tipologia: tipologia ?? undefined,
        tipoNodo: tipoNodo ?? undefined,
        statoAvanzamento: statoAvanzamento ?? undefined,
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
        applicazioneId: applicazioneId ?? undefined,
      },
      include: {
        applicazione: {
          include: {
            servizio: true,
          },
        },
      },
    });

    // Registra tutte le modifiche nell'audit log
    if (oldAmbiente) {
      const userAgent = request.headers.get('user-agent') || undefined;
      const entityName = `${ambiente.applicazione.nome} - ${TIPOLOGIA_AMBIENTE_LABELS[ambiente.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS]}`;
      
      // Formatta le date per il log
      const formatDateForLog = (d: Date | null | undefined) => d ? d.toISOString().split('T')[0] : null;
      
      const changes = [
        { field: 'tipologia', oldValue: TIPOLOGIA_AMBIENTE_LABELS[oldAmbiente.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS], newValue: tipologia ? TIPOLOGIA_AMBIENTE_LABELS[tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS] : null },
        { field: 'tipoNodo', oldValue: TIPO_NODO_LABELS[oldAmbiente.tipoNodo as keyof typeof TIPO_NODO_LABELS], newValue: tipoNodo ? TIPO_NODO_LABELS[tipoNodo as keyof typeof TIPO_NODO_LABELS] : null },
        { field: 'statoAvanzamento', oldValue: STATO_AVANZAMENTO_LABELS[oldAmbiente.statoAvanzamento as keyof typeof STATO_AVANZAMENTO_LABELS], newValue: statoAvanzamento ? STATO_AVANZAMENTO_LABELS[statoAvanzamento as keyof typeof STATO_AVANZAMENTO_LABELS] : null },
        { field: 'dataInizio', oldValue: formatDateForLog(oldAmbiente.dataInizio), newValue: dataInizio ? new Date(dataInizio).toISOString().split('T')[0] : null },
        { field: 'dataFine', oldValue: formatDateForLog(oldAmbiente.dataFine), newValue: dataFine ? new Date(dataFine).toISOString().split('T')[0] : null },
        { field: 'nomeMacchina1', oldValue: oldAmbiente.nomeMacchina1, newValue: nomeMacchina1?.trim() || null },
        { field: 'macchineWS1', oldValue: oldAmbiente.macchineWS1, newValue: macchineWS1?.trim() || null },
        { field: 'macchineJBoss1', oldValue: oldAmbiente.macchineJBoss1, newValue: macchineJBoss1?.trim() || null },
        { field: 'nomeMacchina2', oldValue: oldAmbiente.nomeMacchina2, newValue: nomeMacchina2?.trim() || null },
        { field: 'macchineWS2', oldValue: oldAmbiente.macchineWS2, newValue: macchineWS2?.trim() || null },
        { field: 'macchineJBoss2', oldValue: oldAmbiente.macchineJBoss2, newValue: macchineJBoss2?.trim() || null },
        { field: 'dns', oldValue: oldAmbiente.dns, newValue: dns?.trim() || null },
        { field: 'netscaler', oldValue: oldAmbiente.netscaler, newValue: netscaler?.trim() || null },
        { field: 'richiestaCHG', oldValue: oldAmbiente.richiestaCHG, newValue: richiestaCHG?.trim() || null },
        { field: 'riscontri', oldValue: oldAmbiente.riscontri, newValue: riscontri?.trim() || null },
        { field: 'note', oldValue: oldAmbiente.note, newValue: note?.trim() || null },
        { field: 'configurazioni', oldValue: oldAmbiente.configurazioni, newValue: configurazioni?.trim() || null },
      ];
      
      await logChanges('AMBIENTE', id, entityName, changes, userAgent, authCheck.user?.id);
      
      // Invia notifica email
      await sendUpdateNotification('AMBIENTE', entityName, changes);
    }

    return NextResponse.json(ambiente);
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'ambiente:', error);
    return NextResponse.json({ error: 'Errore nell\'aggiornamento dell\'ambiente' }, { status: 500 });
  }
}

// DELETE - Elimina ambiente
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
    
    // Recupera l'ambiente prima dell'eliminazione per l'audit
    const ambiente = await db.ambiente.findUnique({
      where: { id },
      include: {
        applicazione: true,
      },
    });

    await db.ambiente.delete({
      where: { id },
    });

    // Registra l'eliminazione nell'audit log
    if (ambiente) {
      const userAgent = request.headers.get('user-agent') || undefined;
      const entityName = `${ambiente.applicazione.nome} - ${TIPOLOGIA_AMBIENTE_LABELS[ambiente.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS]}`;
      await logDelete('AMBIENTE', id, entityName, userAgent, authCheck.user?.id);
      
      // Invia notifica email
      await sendDeleteNotification('AMBIENTE', entityName);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'ambiente:', error);
    return NextResponse.json({ error: 'Errore nell\'eliminazione dell\'ambiente' }, { status: 500 });
  }
}
