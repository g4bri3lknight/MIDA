import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// POST - Cambio password utente corrente
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Vecchia password e nuova password sono obbligatorie' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nuova password deve essere di almeno 6 caratteri' },
        { status: 400 }
      );
    }

    // Recupera l'utente con la password
    const existingUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        password: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Verifica la vecchia password
    const isValidPassword = await bcrypt.compare(oldPassword, existingUser.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'La password attuale non è corretta' },
        { status: 400 }
      );
    }

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aggiorna la password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log azione
    await db.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: user.id,
        action: 'PASSWORD_CHANGE',
        entityName: user.username,
        userId: user.id,
      },
    });

    console.log(`[Change Password] Password cambiata per utente: ${user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Password cambiata con successo',
    });
  } catch (error) {
    console.error('[Change Password] Errore:', error);
    return NextResponse.json(
      { error: 'Errore nel cambio della password' },
      { status: 500 }
    );
  }
}
