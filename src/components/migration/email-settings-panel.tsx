'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Mail,
  Settings,
  Send,
  History,
  CheckCircle,
  XCircle,
  Loader2,
  Bell,
  BellOff,
  RefreshCw,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Globe,
  Clock,
  AlertOctagon,
  Calendar,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailConfig {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  senderEmail: string;
  senderName: string;
  recipients: string;
  // Proxy
  proxyEnabled: boolean;
  proxyHost: string | null;
  proxyPort: number | null;
  proxyUser: string | null;
  proxyPassword: string;
  hasProxyPassword?: boolean;
  // Notifications
  notifyScadenze: boolean;
  notifyScadenzeDays: number;
  notifyModifiche: boolean;
  notifyCreate: boolean;
  notifyUpdate: boolean;
  notifyDelete: boolean;
  enabled: boolean;
  hasPassword?: boolean;
  lastSentAt: string | null;
}

interface EmailLog {
  id: string;
  type: string;
  subject: string;
  recipients: string;
  status: string;
  error: string | null;
  sentAt: string;
}

interface TestResult {
  type: 'success' | 'error' | null;
  message: string;
}

const TYPE_LABELS: Record<string, string> = {
  SCADENZA: 'Scadenza',
  MODIFICA: 'Modifica',
  TEST: 'Test',
};

export function EmailSettingsPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [testResult, setTestResult] = useState<TestResult>({ type: null, message: '' });
  const [saveResult, setSaveResult] = useState<TestResult>({ type: null, message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: false,
    senderEmail: '',
    senderName: 'MIDA - Migration Dashboard',
    recipients: '',
    // Proxy
    proxyEnabled: false,
    proxyHost: '',
    proxyPort: '',
    proxyUser: '',
    proxyPassword: '',
    // Notifications
    notifyScadenze: true,
    notifyScadenzeDays: '7',
    notifyModifiche: true,
    notifyCreate: true,
    notifyUpdate: true,
    notifyDelete: true,
    enabled: false,
  });
  const [showProxyPassword, setShowProxyPassword] = useState(false);
  const [deadlines, setDeadlines] = useState<{
    summary: { total: number; overdue: number; upcoming: number; future: number };
    overdue: Array<{
      id: string;
      servizio: string;
      applicazione: string;
      tipologia: string;
      statoAvanzamento: string;
      dataFineFormatted: string;
      daysRemaining: number;
      isOverdue: boolean;
      richiestaCHG: string | null;
      lastNotificationSentAt: string | null;
    }>;
    upcoming: Array<{
      id: string;
      servizio: string;
      applicazione: string;
      tipologia: string;
      statoAvanzamento: string;
      dataFineFormatted: string;
      daysRemaining: number;
      isOverdue: boolean;
      richiestaCHG: string | null;
      lastNotificationSentAt: string | null;
    }>;
  } | null>(null);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
  const [checkingDeadlines, setCheckingDeadlines] = useState(false);

  useEffect(() => {
    if (testResult.type || saveResult.type) {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      }
    }
  }, [testResult, saveResult]);

  useEffect(() => {
    if (open) {
      fetchConfig();
      fetchLogs();
      fetchDeadlines();
      setTestResult({ type: null, message: '' });
      setSaveResult({ type: null, message: '' });
      setShowPassword(false);
      setShowProxyPassword(false);
    }
  }, [open]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        if (data) {
          setFormData({
            smtpHost: data.smtpHost || '',
            smtpPort: String(data.smtpPort || 587),
            smtpUser: data.smtpUser || '',
            smtpPassword: '',
            smtpSecure: data.smtpSecure || false,
            senderEmail: data.senderEmail || '',
            senderName: data.senderName || 'MIDA - Migration Dashboard',
            recipients: data.recipients || '',
            // Proxy
            proxyEnabled: data.proxyEnabled || false,
            proxyHost: data.proxyHost || '',
            proxyPort: data.proxyPort ? String(data.proxyPort) : '',
            proxyUser: data.proxyUser || '',
            proxyPassword: '',
            // Notifications
            notifyScadenze: data.notifyScadenze ?? true,
            notifyScadenzeDays: String(data.notifyScadenzeDays || 7),
            notifyModifiche: data.notifyModifiche ?? true,
            notifyCreate: data.notifyCreate ?? true,
            notifyUpdate: data.notifyUpdate ?? true,
            notifyDelete: data.notifyDelete ?? true,
            enabled: data.enabled ?? false,
          });
        }
      }
    } catch (error) {
      console.error('Errore caricamento config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/email/logs?limit=20');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Errore caricamento logs:', error);
    }
  };

  const fetchDeadlines = async () => {
    setLoadingDeadlines(true);
    try {
      const response = await fetch('/api/deadlines?days=30');
      if (response.ok) {
        const data = await response.json();
        setDeadlines(data);
      }
    } catch (error) {
      console.error('Errore caricamento scadenze:', error);
    } finally {
      setLoadingDeadlines(false);
    }
  };

  const handleCheckDeadlines = async () => {
    setCheckingDeadlines(true);
    try {
      const response = await fetch('/api/notifications', { method: 'GET' });
      const result = await response.json();
      
      if (result.success) {
        setTestResult({ 
          type: 'success', 
          message: `Controllo completato! ${result.results?.notificationsSent || 0} notifiche inviate.` 
        });
        fetchDeadlines();
        fetchLogs();
      } else {
        setTestResult({ type: 'error', message: result.message || result.error || 'Errore durante il controllo' });
      }
    } catch (error) {
      console.error('Errore controllo scadenze:', error);
      setTestResult({ type: 'error', message: 'Errore di connessione al server' });
    } finally {
      setCheckingDeadlines(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult({ type: null, message: '' });
    setTestResult({ type: null, message: '' });
    try {
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          smtpPort: parseInt(formData.smtpPort),
          notifyScadenzeDays: parseInt(formData.notifyScadenzeDays),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setSaveResult({ type: 'success', message: 'Configurazione salvata con successo!' });
      } else {
        const error = await response.json();
        const errorMsg = error.details || error.error || 'Errore nel salvataggio';
        setSaveResult({ type: 'error', message: errorMsg });
      }
    } catch (error) {
      setSaveResult({ type: 'error', message: 'Errore di connessione al server' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!formData.smtpHost) {
      setTestResult({ type: 'error', message: 'Inserisci l\'host SMTP' });
      return;
    }
    if (!formData.recipients) {
      setTestResult({ type: 'error', message: 'Inserisci almeno un destinatario' });
      return;
    }
    if (!formData.senderEmail) {
      setTestResult({ type: 'error', message: 'Inserisci l\'email del mittente' });
      return;
    }

    setTesting(true);
    setTestResult({ type: null, message: 'Invio email di test in corso...' });
    setSaveResult({ type: null, message: '' });
    
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: formData.smtpHost,
          smtpPort: formData.smtpPort,
          smtpUser: formData.smtpUser,
          smtpPassword: formData.smtpPassword || undefined,
          smtpSecure: formData.smtpSecure,
          senderEmail: formData.senderEmail,
          senderName: formData.senderName,
          recipients: formData.recipients,
          // Proxy
          proxyEnabled: formData.proxyEnabled,
          proxyHost: formData.proxyHost || undefined,
          proxyPort: formData.proxyPort || undefined,
          proxyUser: formData.proxyUser || undefined,
          proxyPassword: formData.proxyPassword || undefined,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setTestResult({ type: 'success', message: 'Email di test inviata con successo! Controlla la casella dei destinatari.' });
        fetchLogs();
      } else {
        setTestResult({ type: 'error', message: result.error || 'Errore durante l\'invio' });
      }
    } catch (error) {
      console.error('Errore test email:', error);
      setTestResult({ type: 'error', message: 'Errore di connessione al server' });
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isEnabled = formData.enabled;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Impostazioni Email">
          <Mail className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Impostazioni Email
          </DialogTitle>
          <DialogDescription>
            Configura le notifiche email per scadenze e modifiche
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="config" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid grid-cols-4 flex-shrink-0">
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-1" />
              Configurazione
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-1" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger value="deadlines">
              <Clock className="h-4 w-4 mr-1" />
              Scadenze
            </TabsTrigger>
            <TabsTrigger value="logs">
              <History className="h-4 w-4 mr-1" />
              Storico
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 pr-4" ref={scrollAreaRef}>
            <TabsContent value="config" className="space-y-4 mt-4">
              {testResult.type && (
                <Alert variant={testResult.type === 'success' ? 'default' : 'destructive'} className={testResult.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
                  {testResult.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>{testResult.type === 'success' ? 'Successo' : 'Errore'}</AlertTitle>
                  <AlertDescription className="text-sm">{testResult.message}</AlertDescription>
                </Alert>
              )}

              {saveResult.type && (
                <Alert variant={saveResult.type === 'success' ? 'default' : 'destructive'} className={saveResult.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
                  {saveResult.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>{saveResult.type === 'success' ? 'Successo' : 'Errore'}</AlertTitle>
                  <AlertDescription className="text-sm">{saveResult.message}</AlertDescription>
                </Alert>
              )}

              {/* Stato */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Stato</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isEnabled ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium text-green-600">Notifiche attive</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-muted-foreground">Notifiche disattivate</span>
                        </>
                      )}
                    </div>
                    <Switch
                      checked={formData.enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* SMTP */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Server SMTP</CardTitle>
                  <CardDescription>Configura il server di posta in uscita</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Host</Label>
                      <Input
                        placeholder="smtp.example.com"
                        value={formData.smtpHost}
                        onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Porta</Label>
                      <Input
                        type="number"
                        value={formData.smtpPort}
                        onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Utente</Label>
                      <Input
                        placeholder="user@example.com"
                        value={formData.smtpUser}
                        onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={config?.hasPassword ? 'Password gia salvata' : 'Password'}
                          value={formData.smtpPassword}
                          onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {config?.hasPassword && !formData.smtpPassword && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Password gia salvata. Lascia vuoto per mantenerla.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.smtpSecure}
                        onCheckedChange={(checked) => setFormData({ ...formData, smtpSecure: checked })}
                      />
                      <Label className="text-sm">Usa SSL/TLS (porta 465)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.smtpPort === '465' 
                        ? 'Porta 465: attiva SSL diretto' 
                        : formData.smtpPort === '587'
                          ? 'Porta 587: disattiva per STARTTLS'
                          : 'Attiva solo per connessioni SSL dirette'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Mittente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Mittente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Email mittente</Label>
                      <Input
                        placeholder="noreply@example.com"
                        value={formData.senderEmail}
                        onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nome mittente</Label>
                      <Input
                        value={formData.senderName}
                        onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Destinatari */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Destinatari</CardTitle>
                  <CardDescription>Indirizzi email separati da virgola</CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-y bg-background"
                    placeholder="email1@example.com, email2@example.com"
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  />
                </CardContent>
              </Card>

              {/* Proxy */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Proxy
                  </CardTitle>
                  <CardDescription>Configura un proxy per la connessione SMTP (opzionale)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Usa proxy</p>
                      <p className="text-xs text-muted-foreground">
                        Abilita connessione tramite proxy HTTP
                      </p>
                    </div>
                    <Switch
                      checked={formData.proxyEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, proxyEnabled: checked })}
                    />
                  </div>
                  
                  {formData.proxyEnabled && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Host Proxy</Label>
                          <Input
                            placeholder="proxy.example.com"
                            value={formData.proxyHost}
                            onChange={(e) => setFormData({ ...formData, proxyHost: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Porta</Label>
                          <Input
                            type="number"
                            placeholder="8080"
                            value={formData.proxyPort}
                            onChange={(e) => setFormData({ ...formData, proxyPort: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Utente (opzionale)</Label>
                          <Input
                            placeholder="proxy_user"
                            value={formData.proxyUser}
                            onChange={(e) => setFormData({ ...formData, proxyUser: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Password (opzionale)</Label>
                          <div className="relative">
                            <Input
                              type={showProxyPassword ? 'text' : 'password'}
                              placeholder={config?.hasProxyPassword ? 'Password gia salvata' : 'Password'}
                              value={formData.proxyPassword}
                              onChange={(e) => setFormData({ ...formData, proxyPassword: e.target.value })}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowProxyPassword(!showProxyPassword)}
                            >
                              {showProxyPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          {config?.hasProxyPassword && !formData.proxyPassword && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Password gia salvata. Lascia vuoto per mantenerla.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Azioni */}
              <div className="flex gap-2 justify-end pt-2 pb-4">
                <Button variant="outline" onClick={handleTest} disabled={testing || !formData.smtpHost || !formData.recipients}>
                  {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Invia test
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Salva
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              {saveResult.type && (
                <Alert variant={saveResult.type === 'success' ? 'default' : 'destructive'} className={saveResult.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
                  {saveResult.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>{saveResult.type === 'success' ? 'Successo' : 'Errore'}</AlertTitle>
                  <AlertDescription className="text-sm">{saveResult.message}</AlertDescription>
                </Alert>
              )}

              {/* Notifiche Scadenze */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifiche Scadenze
                  </CardTitle>
                  <CardDescription>
                    Invia automaticamente email quando una migrazione e in ritardo o prossima alla scadenza
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Attiva notifiche scadenze</p>
                      <p className="text-xs text-muted-foreground">
                        Invia promemoria per le migrazioni in scadenza
                      </p>
                    </div>
                    <Switch
                      checked={formData.notifyScadenze}
                      onCheckedChange={(checked) => setFormData({ ...formData, notifyScadenze: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Giorni di anticipo</p>
                      <p className="text-xs text-muted-foreground">
                        Quanti giorni prima della scadenza inviare la notifica
                      </p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      className="w-20"
                      value={formData.notifyScadenzeDays}
                      onChange={(e) => setFormData({ ...formData, notifyScadenzeDays: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notifiche Modifiche */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Notifiche Modifiche
                  </CardTitle>
                  <CardDescription>
                    Invia email quando vengono apportate modifiche ai dati
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Attiva notifiche modifiche</p>
                      <p className="text-xs text-muted-foreground">
                        Invia email per le operazioni CRUD
                      </p>
                    </div>
                    <Switch
                      checked={formData.notifyModifiche}
                      onCheckedChange={(checked) => setFormData({ ...formData, notifyModifiche: checked })}
                    />
                  </div>
                  
                  {formData.notifyModifiche && (
                    <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                      <div className="flex items-center justify-between">
                        <p className="text-sm">Nuovi elementi (Create)</p>
                        <Switch
                          checked={formData.notifyCreate}
                          onCheckedChange={(checked) => setFormData({ ...formData, notifyCreate: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">Modifiche (Update)</p>
                        <Switch
                          checked={formData.notifyUpdate}
                          onCheckedChange={(checked) => setFormData({ ...formData, notifyUpdate: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">Eliminazioni (Delete)</p>
                        <Switch
                          checked={formData.notifyDelete}
                          onCheckedChange={(checked) => setFormData({ ...formData, notifyDelete: checked })}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Azioni */}
              <div className="flex gap-2 justify-end pt-2 pb-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Salva Impostazioni
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Storico Email</CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchLogs}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nessuna email inviata
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {log.status === 'SENT' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{log.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {TYPE_LABELS[log.type] || log.type} - {formatDate(log.sentAt)}
                              </p>
                              {log.error && (
                                <p className="text-xs text-red-500 mt-1">
                                  Errore: {log.error}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant={log.status === 'SENT' ? 'default' : 'destructive'} className="text-xs flex-shrink-0">
                            {log.status === 'SENT' ? 'Inviata' : 'Fallita'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deadlines" className="space-y-4 mt-4">
              {/* Riepilogo */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-red-200 bg-red-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold text-red-600">{deadlines?.summary?.overdue || 0}</p>
                        <p className="text-xs text-muted-foreground">In ritardo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{deadlines?.summary?.upcoming || 0}</p>
                        <p className="text-xs text-muted-foreground">In scadenza</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-2xl font-bold">{deadlines?.summary?.total || 0}</p>
                        <p className="text-xs text-muted-foreground">Totale attive</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Azioni */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Le notifiche automatiche vengono inviate in base ai giorni di anticipo configurati.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchDeadlines}
                    disabled={loadingDeadlines}
                  >
                    {loadingDeadlines ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Aggiorna
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleCheckDeadlines}
                    disabled={checkingDeadlines || !config?.enabled || !config?.notifyScadenze}
                  >
                    {checkingDeadlines ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4 mr-1" />
                    )}
                    Controlla e invia notifiche
                  </Button>
                </div>
              </div>

              {/* In ritardo */}
              {deadlines && deadlines.overdue.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                      <AlertOctagon className="h-4 w-4" />
                      In ritardo ({deadlines.overdue.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {deadlines.overdue.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{item.servizio} → {item.applicazione}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.tipologia} | Scadenza: {item.dataFineFormatted}
                            </p>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {Math.abs(item.daysRemaining)} gg ritardo
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* In scadenza */}
              {deadlines && deadlines.upcoming.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      In scadenza ({deadlines.upcoming.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {deadlines.upcoming.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{item.servizio} → {item.applicazione}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.tipologia} | Scadenza: {item.dataFineFormatted}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                            {item.daysRemaining} gg
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Nessuna scadenza */}
              {deadlines && deadlines.summary.total === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <p className="text-sm font-medium">Nessuna scadenza attiva</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Non ci sono migrazioni con data di fine impostata
                    </p>
                  </CardContent>
                </Card>
              )}

              {loadingDeadlines && !deadlines && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
