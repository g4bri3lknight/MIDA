import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('next-auth.session-token');

    console.log('[Auth] User logged out');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth] Errore logout:', error);
    return NextResponse.json(
      { error: 'Errore durante il logout' },
      { status: 500 }
    );
  }
}
