import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, canManageUsers } from '@/lib/auth';

// GET - Ottiene i log di audit
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    
    const where: Record<string, unknown> = {};
    
    // Se l'utente non è admin, mostra solo log di SERVIZI, APPLICAZIONI e AMBIENTI
    // I log USER (operazioni di amministrazione) sono visibili solo agli admin
    if (!user || !canManageUsers(user.role)) {
      where.entityType = { in: ['SERVIZIO', 'APPLICAZIONE', 'AMBIENTE'] };
    } else if (entityType) {
      where.entityType = entityType;
    }
    
    if (action) {
      where.action = action;
    }
    
    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Errore nel recupero audit log:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei log' },
      { status: 500 }
    );
  }
}
