'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Pencil,
  Trash2,
  Loader2,
  Shield,
  Edit,
  RefreshCw,
  UserPlus,
  List,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from './auth-provider';

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: 'ADMIN' | 'EDITOR';
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Amministratore',
  EDITOR: 'Editor',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ADMIN: <Shield className="h-3 w-3" />,
  EDITOR: <Edit className="h-3 w-3" />,
};

interface UserManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManagementPanel({ open, onOpenChange }: UserManagementPanelProps) {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'EDITOR' as 'ADMIN' | 'EDITOR',
    active: true,
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
      setActiveTab('list');
      setMessage(null);
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await authFetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Errore nel caricamento utenti' });
      }
    } catch (error) {
      console.error('Errore:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'EDITOR',
      active: true,
    });
    setSelectedUser(null);
    setMessage(null);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name || '',
      email: user.email || '',
      role: user.role,
      active: user.active,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    setMessage(null);
    
    if (!formData.username) {
      setMessage({ type: 'error', text: 'Username obbligatorio' });
      return;
    }

    if (!formData.password) {
      setMessage({ type: 'error', text: 'Password obbligatoria per nuovo utente' });
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name || null,
          email: formData.email || null,
          role: formData.role,
          active: formData.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
        return;
      }

      setMessage({ type: 'success', text: 'Utente creato con successo!' });
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        role: 'EDITOR',
        active: true,
      });
      setSelectedUser(null);
      fetchUsers();
      setTimeout(() => {
        setActiveTab('list');
        setMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Errore:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setMessage(null);
    
    if (!selectedUser || !formData.username) {
      setMessage({ type: 'error', text: 'Username obbligatorio' });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        username: formData.username,
        name: formData.name || null,
        email: formData.email || null,
        role: formData.role,
        active: formData.active,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const response = await authFetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
        return;
      }

      setMessage({ type: 'success', text: 'Utente aggiornato con successo!' });
      setTimeout(() => {
        setEditDialogOpen(false);
        setMessage(null);
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error('Errore:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const response = await authFetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Errore nell\'eliminazione' });
        return;
      }

      setMessage({ type: 'success', text: 'Utente eliminato con successo!' });
      setDeleteDialogOpen(false);
      setTimeout(() => {
        setMessage(null);
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error('Errore:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestione Utenti
            </DialogTitle>
            <DialogDescription>
              Gestisci gli utenti e i loro permessi di accesso.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="list" className="flex items-center gap-1">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="new" className="flex items-center gap-1">
                <UserPlus className="h-4 w-4" />
                Nuovo
              </TabsTrigger>
            </TabsList>

            {/* Tab Lista Utenti */}
            <TabsContent value="list" className="flex-1 overflow-hidden mt-4">
              <div className="space-y-4 h-full flex flex-col">
                {/* Messaggio di stato */}
                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`flex-shrink-0 ${message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
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
                
                {/* Actions */}
                <div className="flex justify-between items-center flex-shrink-0">
                  <p className="text-sm text-muted-foreground">
                    {users.length} utenti registrati
                  </p>
                  <Button variant="outline" size="sm" onClick={fetchUsers}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Users list */}
                <ScrollArea className="flex-1 min-h-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : users.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Nessun utente trovato</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{user.username}</p>
                                {!user.active && (
                                  <Badge variant="secondary" className="text-xs">
                                    Disattivo
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {user.name || user.email || 'Nessun dettaglio'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {ROLE_ICONS[user.role]}
                              {ROLE_LABELS[user.role]}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Tab Nuovo Utente */}
            <TabsContent value="new" className="flex-1 overflow-hidden mt-4 flex flex-col">
              {/* Messaggio di stato - sempre visibile */}
              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`mb-4 flex-shrink-0 ${message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
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
              
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pr-4">
                  <Card>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Username *</Label>
                          <Input
                            value={formData.username}
                            onChange={(e) =>
                              setFormData({ ...formData, username: e.target.value })
                            }
                            placeholder="Username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password *</Label>
                          <Input
                            type="password"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({ ...formData, password: e.target.value })
                            }
                            placeholder="Password"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ruolo</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value: 'ADMIN' | 'EDITOR') =>
                              setFormData({ ...formData, role: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Amministratore
                                </div>
                              </SelectItem>
                              <SelectItem value="EDITOR">
                                <div className="flex items-center gap-2">
                                  <Edit className="h-4 w-4" />
                                  Editor
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Stato</Label>
                          <div className="flex items-center gap-2 pt-2">
                            <Switch
                              checked={formData.active}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, active: checked })
                              }
                            />
                            <span className="text-sm">
                              {formData.active ? 'Attivo' : 'Disattivo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => { resetForm(); setActiveTab('list'); }}
                          disabled={saving}
                        >
                          Annulla
                        </Button>
                        <Button onClick={handleCreate} disabled={saving}>
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          Crea Utente
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogDescription>
              Modifica i dati dell'utente {selectedUser?.username}
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Lascia vuoto per non cambiare"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'ADMIN' | 'EDITOR') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Amministratore
                      </div>
                    </SelectItem>
                    <SelectItem value="EDITOR">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Editor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stato</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                  <span className="text-sm">
                    {formData.active ? 'Attivo' : 'Disattivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Aggiorna
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'utente "{selectedUser?.username}"?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
