import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, canManageUsers } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Dettaglio utente (solo ADMIN)
export async function GET(
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

    const targetUser = await db.user.findUnique({
      where: { id },
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
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error('[User] Errore:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero utente' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna utente (solo ADMIN)
export async function PUT(
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

    const body = await request.json();
    const { username, password, name, email, role, active } = body;

    const existing = await db.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Verifica se username già in uso da altro utente
    if (username && username !== existing.username) {
      const duplicate = await db.user.findUnique({
        where: { username },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Username già in uso' },
          { status: 400 }
        );
      }
    }

    // Prepara dati da aggiornare
    const updateData: Record<string, unknown> = {};
    if (username) updateData.username = username;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    // Log azione
    await db.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: id,
        action: 'UPDATE',
        entityName: updatedUser.username,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updatedUser),
        userId: user.id,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[User] Errore update:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento utente' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina utente (solo ADMIN)
export async function DELETE(
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

    // Non puoi eliminare te stesso
    if (user.id === id) {
      return NextResponse.json(
        { error: 'Non puoi eliminare il tuo account' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    await db.user.delete({
      where: { id },
    });

    // Log azione
    await db.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: id,
        action: 'DELETE',
        entityName: existing.username,
        oldValue: JSON.stringify(existing),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[User] Errore delete:', error);
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione utente' },
      { status: 500 }
    );
  }
}
