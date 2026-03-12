import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Ottiene i log delle email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    
    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }
    
    const logs = await db.emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Errore nel recupero log email:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei log' },
      { status: 500 }
    );
  }
}
