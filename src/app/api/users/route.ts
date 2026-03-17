import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, canManageUsers } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Lista utenti (solo ADMIN)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    console.log('[Users GET] Current user:', user ? { id: user.id, username: user.username, role: user.role } : null);
    
    if (!user || !canManageUsers(user.role)) {
      console.log('[Users GET] Non autorizzato - user:', !!user, 'canManage:', user ? canManageUsers(user.role) : false);
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('[Users] Errore:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero utenti' },
      { status: 500 }
    );
  }
}

// POST - Crea nuovo utente (solo ADMIN)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    console.log('[Users POST] Current user:', user ? { id: user.id, username: user.username, role: user.role } : null);
    
    if (!user || !canManageUsers(user.role)) {
      console.log('[Users POST] Non autorizzato - user:', !!user, 'canManage:', user ? canManageUsers(user.role) : false);
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, name, email, role, active } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username e password sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica se username già esistente (case insensitive)
    const existing = await db.user.findFirst({
      where: {
        username: username.toLowerCase(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username già in uso' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        email,
        role: role || 'EDITOR',
        active: active ?? true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    // Log azione
    await db.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: newUser.id,
        action: 'CREATE',
        entityName: newUser.username,
        newValue: JSON.stringify(newUser),
        userId: user.id,
      },
    });

    console.log('[Users POST] Utente creato:', newUser.username);
    
    return NextResponse.json(newUser);
  } catch (error) {
    console.error('[Users] Errore creazione:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione utente' },
      { status: 500 }
    );
  }
}
