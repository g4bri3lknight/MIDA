import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'mida-secret-key-change-in-production';

// GET - Ottieni sessione corrente dal token Authorization
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      });
    }

    const token = authHeader.substring(7);

    // Verifica il token JWT
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(SECRET_KEY)
    );

    // Verifica che l'utente esista ancora e sia attivo
    const user = await db.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      });
    }

    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('[Session] Errore:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
