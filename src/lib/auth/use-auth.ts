export type UserRole = 'ADMIN' | 'EDITOR';

export interface AuthUser {
  id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
}

// Re-export useAuth from auth-provider for client components
export { useAuth } from '@/components/migration/auth-provider';
