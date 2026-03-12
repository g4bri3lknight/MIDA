'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogIn, LogOut, User, Shield, Edit, Eye, Users } from 'lucide-react';
import { useAuth } from './auth-provider';
import { LoginDialog } from './login-dialog';
import { Badge } from '@/components/ui/badge';

export function UserButton() {
  const { user, isAuthenticated, canManageUsers, login, logout } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    const result = await login(username, password);
    if (!result.success) {
      return result;
    }
    return result;
  };

  const handleLogout = async () => {
    await logout();
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <Shield className="h-3 w-3" />;
      case 'EDITOR':
        return <Edit className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'Amministratore';
      case 'EDITOR':
        return 'Editor';
      default:
        return 'Visualizzatore';
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setLoginDialogOpen(true)}>
          <LogIn className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Accedi</span>
        </Button>
        <LoginDialog
          open={loginDialogOpen}
          onOpenChange={setLoginDialogOpen}
          onSuccess={() => {}}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{user?.username}</span>
            <Badge variant="secondary" className="hidden md:flex items-center gap-1 text-xs">
              {getRoleIcon()}
              {getRoleLabel()}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name || user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs text-muted-foreground">
            {getRoleIcon()}
            <span className="ml-2">Ruolo: {getRoleLabel()}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
