import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, canManageUsers } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Genera una password casuale sicura
function generateRandomPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // Assicura almeno un carattere di ogni tipo
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completa la password con caratteri casuali
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mescola i caratteri
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// POST - Reset password utente (solo ADMIN)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    
    if (!user || !canManageUsers(user.role)) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      );
    }

    // Non puoi resettare la tua password
    if (user.id === id) {
      return NextResponse.json(
        { error: 'Non puoi resettare la tua password' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Genera nuova password
    const newPassword = generateRandomPassword(12);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aggiorna la password
    await db.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Log azione
    await db.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: id,
        action: 'PASSWORD_RESET',
        entityName: existing.username,
        userId: user.id,
      },
    });

    console.log(`[Reset Password] Password resettata per utente: ${existing.username}`);

    // Restituisce la nuova password in chiaro (solo questa volta)
    return NextResponse.json({
      success: true,
      message: 'Password resettata con successo',
      user: existing,
      newPassword,
    });
  } catch (error) {
    console.error('[Reset Password] Errore:', error);
    return NextResponse.json(
      { error: 'Errore nel reset della password' },
      { status: 500 }
    );
  }
}
