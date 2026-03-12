// This file is kept for type definitions only
// The actual authentication is handled by the custom JWT implementation

// Extend NextAuth types for compatibility
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      name?: string | null;
      email?: string | null;
      role: 'ADMIN' | 'EDITOR';
    };
  }

  interface User {
    id: string;
    username: string;
    name?: string | null;
    email?: string | null;
    role: 'ADMIN' | 'EDITOR';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: 'ADMIN' | 'EDITOR';
  }
}

// Empty export for compatibility
export const authOptions = {};
