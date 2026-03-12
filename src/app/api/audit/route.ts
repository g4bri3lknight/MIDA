import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Ottiene i log di audit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    
    const where: Record<string, unknown> = {};
    if (entityType) {
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
