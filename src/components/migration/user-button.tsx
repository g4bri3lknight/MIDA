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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogIn, LogOut, KeyRound, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './auth-provider';
import { LoginDialog } from './login-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function UserButton() {
  const { user, isAuthenticated, login, logout, authFetch } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Ottiene le iniziali dal nome completo, oppure la prima lettera dello username
  const getInitials = (): string => {
    if (user?.name) {
      // Dividi il nome in parti e prendi le iniziali di ogni parola
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        // Se ci sono almeno 2 parole, prendi la prima lettera delle prime due
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      // Se c'è solo una parola, prendi le prime 2 lettere
      return parts[0].substring(0, 2).toUpperCase();
    }
    // Fallback: prima lettera dello username
    return user?.username?.substring(0, 2).toUpperCase() || 'U';
  };

  const handleChangePassword = async () => {
    setMessage(null);
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Tutti i campi sono obbligatori' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La nuova password deve essere di almeno 6 caratteri' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Le nuove password non coincidono' });
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Errore nel cambio password' });
        return;
      }

      setMessage({ type: 'success', text: 'Password cambiata con successo!' });
      
      // Chiudi il dialog dopo 2 secondi
      setTimeout(() => {
        setChangePasswordDialogOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Errore:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  };

  const resetPasswordForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage(null);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{user?.username}</span>
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
          <DropdownMenuItem onClick={() => setChangePasswordDialogOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Cambia Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Login Dialog */}
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        onSuccess={() => {}}
      />

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialogOpen} onOpenChange={(open) => {
        setChangePasswordDialogOpen(open);
        if (!open) resetPasswordForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Cambia Password
            </DialogTitle>
            <DialogDescription>
              Inserisci la tua password attuale e la nuova password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Messaggio di stato */}
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-green-700 dark:text-green-300' : ''}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Password attuale */}
            <div className="space-y-2">
              <Label>Password Attuale</Label>
              <div className="relative">
                <Input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Inserisci la password attuale"
                  disabled={saving}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Nuova password */}
            <div className="space-y-2">
              <Label>Nuova Password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Inserisci la nuova password (min. 6 caratteri)"
                  disabled={saving}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Conferma password */}
            <div className="space-y-2">
              <Label>Conferma Nuova Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Conferma la nuova password"
                  disabled={saving}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialogOpen(false);
                resetPasswordForm();
              }}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Cambia Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
