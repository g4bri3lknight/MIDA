'use client';

// Migration Dashboard - Server Monitoring
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Pencil, 
  Trash2, 
  Server, 
  Layers, 
  Box,
  Network,
  FileText,
  RefreshCw,
  Filter,
  X,
  Download,
  Monitor,
  Upload,
  FileDown,
  Search
} from 'lucide-react';
import type { Servizio, Applicazione, Ambiente } from '@/types/migration';
import { 
  TIPOLOGIA_AMBIENTE_LABELS, 
  TIPOLOGIA_AMBIENTE_COLORS, 
  TIPOLOGIA_AMBIENTE_BORDER_COLORS,
  STATO_AVANZAMENTO_LABELS,
  STATO_AVANZAMENTO_COLORS,
  STATO_AVANZAMENTO_TEXT_COLORS,
  STATO_MIGRAZIONE_CODICE_LABELS,
  STATO_MIGRAZIONE_CODICE_COLORS,
  STATO_MIGRAZIONE_CODICE_TEXT_COLORS,
  calculateAppProgress,
  calculateServizioProgress,
  getProgressColor
} from '@/types/migration';
import { ServizioDialog } from '@/components/migration/servizio-dialog';
import { ApplicazioneDialog } from '@/components/migration/applicazione-dialog';
import { AmbienteDialog } from '@/components/migration/ambiente-dialog';
import { AmbienteDetailDialog } from '@/components/migration/ambiente-detail-dialog';
import { DeleteConfirmDialog } from '@/components/migration/delete-confirm-dialog';
import { AdminPanel } from '@/components/migration/admin-panel';
import { DashboardKpi } from '@/components/migration/dashboard-kpi';
import { EmailSettingsPanel } from '@/components/migration/email-settings-panel';
import { AuditLogPanel } from '@/components/migration/audit-log-panel';
import { UserManagementPanel } from '@/components/migration/user-management-panel';
import { SearchResults } from '@/components/migration/search-results';
import { MenuBar } from '@/components/migration/menu-bar';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/migration/auth-provider';
import { UserButton } from '@/components/migration/user-button';

export default function MigrationDashboard() {
  const { canEdit, canDelete, canImport, canManageUsers, authFetch } = useAuth();

  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedServizi, setExpandedServizi] = useState<Set<string>>(new Set());
  const [expandedApplicazioni, setExpandedApplicazioni] = useState<Set<string>>(new Set());

  // Filters
  const [filterServizio, setFilterServizio] = useState<string>('');
  const [filterApplicazione, setFilterApplicazione] = useState<string>('');
  const [filterTipologia, setFilterTipologia] = useState<string>('');
  const [filterRichiestaCHG, setFilterRichiestaCHG] = useState<string>('');

  // Dialog states
  const [servizioDialogOpen, setServizioDialogOpen] = useState(false);
  const [applicazioneDialogOpen, setApplicazioneDialogOpen] = useState(false);
  const [ambienteDialogOpen, setAmbienteDialogOpen] = useState(false);
  const [ambienteDetailOpen, setAmbienteDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit states
  const [editingServizio, setEditingServizio] = useState<Servizio | null>(null);
  const [editingApplicazione, setEditingApplicazione] = useState<Applicazione | null>(null);
  const [editingAmbiente, setEditingAmbiente] = useState<Ambiente | null>(null);
  const [viewingAmbiente, setViewingAmbiente] = useState<Ambiente | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'servizio' | 'applicazione' | 'ambiente'; id: string; name: string } | null>(null);

  // Preselection for new items
  const [selectedServizioId, setSelectedServizioId] = useState<string | null>(null);
  const [selectedApplicazioneId, setSelectedApplicazioneId] = useState<string | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{
    servizi: Servizio[];
    applicazioni: { app: Applicazione; servizio: string }[];
    ambienti: { amb: Ambiente; applicazione: string; servizio: string }[];
  }>({ servizi: [], applicazioni: [], ambienti: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/servizi');
      if (!response.ok) throw new Error('Errore nel caricamento');
      const data = await response.json();
      setServizi(data);
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleServizio = (id: string) => {
    setExpandedServizi(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleApplicazione = (id: string) => {
    setExpandedApplicazioni(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Servizio handlers
  const handleAddServizio = () => {
    setEditingServizio(null);
    setServizioDialogOpen(true);
  };

  const handleEditServizio = (servizio: Servizio) => {
    setEditingServizio(servizio);
    setServizioDialogOpen(true);
  };

  const handleDeleteServizio = (servizio: Servizio) => {
    setDeletingItem({ type: 'servizio', id: servizio.id, name: servizio.nome });
    setDeleteDialogOpen(true);
  };

  // Applicazione handlers
  const handleAddApplicazione = (servizioId: string) => {
    setSelectedServizioId(servizioId);
    setEditingApplicazione(null);
    setApplicazioneDialogOpen(true);
  };

  const handleEditApplicazione = (applicazione: Applicazione) => {
    setEditingApplicazione(applicazione);
    setApplicazioneDialogOpen(true);
  };

  const handleDeleteApplicazione = (applicazione: Applicazione) => {
    setDeletingItem({ type: 'applicazione', id: applicazione.id, name: applicazione.nome });
    setDeleteDialogOpen(true);
  };

  // Ambiente handlers
  const handleAddAmbiente = (applicazioneId: string) => {
    setSelectedApplicazioneId(applicazioneId);
    setEditingAmbiente(null);
    setAmbienteDialogOpen(true);
  };

  const handleEditAmbiente = (ambiente: Ambiente) => {
    setEditingAmbiente(ambiente);
    setAmbienteDialogOpen(true);
  };

  const handleDeleteAmbiente = (ambiente: Ambiente) => {
    setDeletingItem({ type: 'ambiente', id: ambiente.id, name: TIPOLOGIA_AMBIENTE_LABELS[ambiente.tipologia] });
    setDeleteDialogOpen(true);
  };

  const handleViewAmbiente = (ambiente: Ambiente) => {
    setViewingAmbiente(ambiente);
    setAmbienteDetailOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    const endpoints = {
      servizio: 'servizi',
      applicazione: 'applicazioni',
      ambiente: 'ambienti',
    };

    try {
      const endpoint = `/api/${endpoints[deletingItem.type]}/${deletingItem.id}`;
      const response = await authFetch(endpoint, { method: 'DELETE' });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante l\'eliminazione');
      }
      
      toast.success('Elemento eliminato con successo');
      fetchData();
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleDialogSuccess = () => {
    fetchData();
  };

  // Get unique values for filters
  const getAllApplicazioni = (): Applicazione[] => {
    const apps: Applicazione[] = [];
    servizi.forEach(s => {
      s.applicazioni?.forEach(a => apps.push(a));
    });
    return apps;
  };

  const getAllRichiesteCHG = (): string[] => {
    const richieste = new Set<string>();
    servizi.forEach(s => {
      s.applicazioni?.forEach(a => {
        a.ambienti?.forEach(amb => {
          if (amb.richiestaCHG) richieste.add(amb.richiestaCHG);
        });
      });
    });
    return Array.from(richieste).sort();
  };

  // Filtered data - helper function to check if ambiente matches filters
  const ambienteMatchesFilters = (amb: Ambiente): boolean => {
    if (filterTipologia && amb.tipologia !== filterTipologia) return false;
    if (filterRichiestaCHG && amb.richiestaCHG !== filterRichiestaCHG) return false;
    return true;
  };

  const applicazioneMatchesFilters = (app: Applicazione): boolean => {
    if (filterApplicazione && app.id !== filterApplicazione) return false;
    // If there are ambiente filters, check if any ambiente matches
    if (filterTipologia || filterRichiestaCHG) {
      return (app.ambienti || []).some(amb => ambienteMatchesFilters(amb));
    }
    return true;
  };

  const servizioMatchesFilters = (serv: Servizio): boolean => {
    if (filterServizio && serv.id !== filterServizio) return false;
    // If there are applicazione or ambiente filters, check if any applicazione matches
    if (filterApplicazione || filterTipologia || filterRichiestaCHG) {
      return (serv.applicazioni || []).some(app => applicazioneMatchesFilters(app));
    }
    return true;
  };

  // Get filtered ambienti for an applicazione
  const getFilteredAmbienti = (app: Applicazione): Ambiente[] => {
    return (app.ambienti || []).filter(amb => ambienteMatchesFilters(amb));
  };

  // Get filtered applicazioni for a servizio
  const getFilteredApplicazioni = (serv: Servizio): Applicazione[] => {
    return (serv.applicazioni || []).filter(app => applicazioneMatchesFilters(app));
  };

  // Filtered servizi
  const filteredServizi = servizi.filter(serv => servizioMatchesFilters(serv));

  const hasActiveFilters = filterServizio || filterApplicazione || filterTipologia || filterRichiestaCHG;

  const clearFilters = () => {
    setFilterServizio('');
    setFilterApplicazione('');
    setFilterTipologia('');
    setFilterRichiestaCHG('');
  };

  // Global search function
  const performGlobalSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults({ servizi: [], applicazioni: [], ambienti: [] });
      setShowSearchResults(false);
      return;
    }

    const lowerQuery = query.toLowerCase().trim();
    const results = {
      servizi: [] as Servizio[],
      applicazioni: [] as { app: Applicazione; servizio: string }[],
      ambienti: [] as { amb: Ambiente; applicazione: string; servizio: string }[],
    };

    for (const servizio of servizi) {
      // Search in servizio name
      if (servizio.nome.toLowerCase().includes(lowerQuery)) {
        results.servizi.push(servizio);
      }

      for (const app of servizio.applicazioni || []) {
        // Search in applicazione name and descrizione
        if (app.nome.toLowerCase().includes(lowerQuery) ||
            (app.descrizione?.toLowerCase().includes(lowerQuery))) {
          results.applicazioni.push({ app, servizio: servizio.nome });
        }

        for (const amb of app.ambienti || []) {
          // Search in ambiente fields
          const searchFields = [
            amb.dns,
            amb.netscaler,
            amb.macchineWS1,
            amb.macchineJBoss1,
            amb.macchineWS2,
            amb.macchineJBoss2,
            amb.note,
            amb.richiestaCHG,
            amb.configurazioni,
            amb.nomeMacchina1,
            amb.nomeMacchina2,
          ].filter(Boolean);

          if (searchFields.some(field => field?.toLowerCase().includes(lowerQuery))) {
            results.ambienti.push({ amb, applicazione: app.nome, servizio: servizio.nome });
          }
        }
      }
    }

    setSearchResults(results);
    setShowSearchResults(true);
  }, [servizi]);

  // Show/hide dashboard KPI (only when no filters active and not searching)
  const showDashboard = !hasActiveFilters && !showSearchResults && filteredServizi.length > 0;

  // Export to Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterServizio) params.append('servizio', filterServizio);
      if (filterApplicazione) params.append('applicazione', filterApplicazione);
      if (filterTipologia) params.append('tipologia', filterTipologia);
      if (filterRichiestaCHG) params.append('richiestaCHG', filterRichiestaCHG);

      const response = await fetch(`/api/export?${params.toString()}`);
      if (!response.ok) throw new Error('Errore durante l\'esportazione');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Esportazione completata');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Server className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">MIDA</h1>
                  <p className="text-sm text-muted-foreground">
                    Migration Dashboard
                  </p>
                </div>
              </div>
              
              <UserButton />
            </div>
          </div>
        </header>

        {/* Menu Bar */}
        <MenuBar
          loading={loading}
          exporting={exporting}
          canImport={canImport}
          canEdit={canEdit}
          canManageUsers={canManageUsers}
          onRefresh={fetchData}
          onExport={handleExport}
          onImport={() => {
            const event = new CustomEvent('openImportDialog');
            window.dispatchEvent(event);
          }}
          onOpenAuditLog={() => {
            const event = new CustomEvent('openAuditLog');
            window.dispatchEvent(event);
          }}
          onOpenEmailSettings={() => setEmailSettingsOpen(true)}
          onOpenUserManagement={() => setUserManagementOpen(true)}
          onNewServizio={handleAddServizio}
        />

        {/* Filters */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Global Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cerca in tutto..."
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    performGlobalSearch(e.target.value);
                  }}
                  className="pl-10 h-8"
                />
                {globalSearch && (
                  <button
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => {
                      setGlobalSearch('');
                      setShowSearchResults(false);
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filtri:
              </div>
              <Select value={filterServizio || 'all'} onValueChange={(v) => setFilterServizio(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="Tutti i servizi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i servizi</SelectItem>
                  {servizi.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterApplicazione || 'all'} onValueChange={(v) => setFilterApplicazione(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="Tutte le applicazioni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le applicazioni</SelectItem>
                  {getAllApplicazioni().map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTipologia || 'all'} onValueChange={(v) => setFilterTipologia(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Tutti i tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  {Object.entries(TIPOLOGIA_AMBIENTE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRichiestaCHG || 'all'} onValueChange={(v) => setFilterRichiestaCHG(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Tutte le richieste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le richieste</SelectItem>
                  {getAllRichiesteCHG().map((chg) => (
                    <SelectItem key={chg} value={chg}>
                      {chg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Pulisci filtri
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Dashboard with KPI - shown when no filters active */}
              {showDashboard && (
                <DashboardKpi 
                  onFilterByApplicazione={(applicazioneId) => {
                    setFilterApplicazione(applicazioneId);
                  }}
                />
              )}
              
              {/* Search Results OR Service List */}
              {showSearchResults ? (
                /* Search Results */
                <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Risultati per "{globalSearch}"</h2>
                <Button variant="ghost" size="sm" onClick={() => {
                  setGlobalSearch('');
                  setShowSearchResults(false);
                }}>
                  <X className="h-4 w-4 mr-1" />
                  Chiudi ricerca
                </Button>
              </div>
              
              {/* Servizi trovati */}
              {searchResults.servizi.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Servizi ({searchResults.servizi.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {searchResults.servizi.map(s => (
                        <Badge key={s.id} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            setFilterServizio(s.id);
                            setShowSearchResults(false);
                            setGlobalSearch('');
                          }}>
                          {s.nome}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Applicazioni trovate */}
              {searchResults.applicazioni.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Box className="h-4 w-4" />
                      Applicazioni ({searchResults.applicazioni.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.applicazioni.map(({ app, servizio }) => (
                        <div key={app.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                          onClick={() => {
                            setFilterApplicazione(app.id);
                            setShowSearchResults(false);
                            setGlobalSearch('');
                          }}>
                          <div>
                            <p className="font-medium">{app.nome}</p>
                            <p className="text-xs text-muted-foreground">{servizio}</p>
                          </div>
                          <Badge className={`${STATO_MIGRAZIONE_CODICE_COLORS[app.statoMigrazioneCodice || 'DA_RIPROGETTARE']} ${STATO_MIGRAZIONE_CODICE_TEXT_COLORS[app.statoMigrazioneCodice || 'DA_RIPROGETTARE']} text-xs`}>
                            {STATO_MIGRAZIONE_CODICE_LABELS[app.statoMigrazioneCodice || 'DA_RIPROGETTARE']}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Ambienti trovati */}
              {searchResults.ambienti.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Ambienti ({searchResults.ambienti.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.ambienti.map(({ amb, applicazione, servizio }) => (
                        <div key={amb.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                          onClick={() => {
                            handleViewAmbiente(amb);
                            setShowSearchResults(false);
                            setGlobalSearch('');
                          }}>
                          <div>
                            <p className="font-medium">{applicazione}</p>
                            <p className="text-xs text-muted-foreground">{servizio} • {TIPOLOGIA_AMBIENTE_LABELS[amb.tipologia]}</p>
                          </div>
                          <Badge className={`${STATO_AVANZAMENTO_COLORS[amb.statoAvanzamento || 'NON_INIZIATO']} ${STATO_AVANZAMENTO_TEXT_COLORS[amb.statoAvanzamento || 'NON_INIZIATO']} text-xs`}>
                            {STATO_AVANZAMENTO_LABELS[amb.statoAvanzamento || 'NON_INIZIATO']}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* No results */}
              {searchResults.servizi.length === 0 && searchResults.applicazioni.length === 0 && searchResults.ambienti.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nessun risultato trovato per "{globalSearch}"</p>
                  </CardContent>
                </Card>
              )}
                </div>
              ) : filteredServizi.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nessun risultato trovato</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {hasActiveFilters 
                        ? 'Nessun elemento corrisponde ai filtri selezionati'
                        : 'Inizia creando il primo servizio per monitorare la migrazione'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        Pulisci filtri
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredServizi.map((servizio) => (
                <Card key={servizio.id} className="overflow-hidden">
                  <Collapsible
                    open={expandedServizi.has(servizio.id)}
                    onOpenChange={() => toggleServizio(servizio.id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 px-4 py-3">
                      <CollapsibleTrigger className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                        {expandedServizi.has(servizio.id) ? (
                          <ChevronDown className="h-5 w-5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0" />
                        )}
                        <Layers className="h-5 w-5 text-primary shrink-0" />
                        <CardTitle className="text-lg truncate">{servizio.nome}</CardTitle>
                        {servizio.descrizione && (
                          <span className="text-sm text-muted-foreground hidden md:inline truncate">- {servizio.descrizione}</span>
                        )}
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {servizio.applicazioni?.length || 0} app
                        </Badge>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden md:flex items-center">
                          <div className="relative w-28 h-5 bg-muted rounded-full overflow-hidden border border-border">
                            <div 
                              className={`h-full transition-all duration-300 ${getProgressColor(calculateServizioProgress(servizio.applicazioni))}`}
                              style={{ width: `${calculateServizioProgress(servizio.applicazioni)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                              {calculateServizioProgress(servizio.applicazioni)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddApplicazione(servizio.id);
                              }}
                              title="Nuova applicazione"
                            >
                              <Plus className="h-4 w-4 sm:mr-0.5" />
                              <span className="hidden sm:inline">Nuova Applicazione</span>
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditServizio(servizio);
                              }}
                              title="Modifica servizio"
                            >
                              <Pencil className="h-4 w-4 sm:mr-0.5" />
                              <span className="hidden sm:inline">Modifica</span>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteServizio(servizio);
                              }}
                              title="Elimina servizio"
                            >
                              <Trash2 className="h-4 w-4 sm:mr-0.5" />
                              <span className="hidden sm:inline">Elimina</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <CardContent className="pt-4">
                        {getFilteredApplicazioni(servizio).length > 0 ? (
                          <div className="space-y-3">
                            {getFilteredApplicazioni(servizio).map((applicazione) => (
                              <Card key={applicazione.id} className="border-l-4 border-l-primary/30">
                                <Collapsible
                                  open={expandedApplicazioni.has(applicazione.id)}
                                  onOpenChange={() => toggleApplicazione(applicazione.id)}
                                >
                                  <div className="bg-muted/30 px-4 py-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer min-w-0">
                                        {expandedApplicazioni.has(applicazione.id) ? (
                                          <ChevronDown className="h-4 w-4 shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 shrink-0" />
                                        )}
                                        <Box className="h-4 w-4 text-primary/70 shrink-0" />
                                        <span className="font-medium truncate">{applicazione.nome}</span>
                                        {applicazione.descrizione && (
                                          <span className="text-sm text-muted-foreground hidden md:inline truncate">
                                            - {applicazione.descrizione}
                                          </span>
                                        )}
                                        <Badge variant="outline" className="ml-2 shrink-0">
                                          {applicazione.ambienti?.length || 0} env
                                        </Badge>
                                        <span className="hidden sm:inline text-sm text-muted-foreground shrink-0">Migrazione codice:</span>
                                        <Badge className={`${STATO_MIGRAZIONE_CODICE_COLORS[applicazione.statoMigrazioneCodice || 'DA_RIPROGETTARE']} ${STATO_MIGRAZIONE_CODICE_TEXT_COLORS[applicazione.statoMigrazioneCodice || 'DA_RIPROGETTARE']} text-xs shrink-0`}>
                                          {STATO_MIGRAZIONE_CODICE_LABELS[applicazione.statoMigrazioneCodice || 'DA_RIPROGETTARE']}
                                        </Badge>
                                      </CollapsibleTrigger>
                                      <div className="flex items-center gap-2">
                                        <div className="hidden md:flex items-center">
                                          <div className="relative w-28 h-5 bg-muted rounded-full overflow-hidden border border-border">
                                            <div 
                                              className={`h-full transition-all duration-300 ${getProgressColor(calculateAppProgress(applicazione.ambienti))}`}
                                              style={{ width: `${calculateAppProgress(applicazione.ambienti)}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                                              {calculateAppProgress(applicazione.ambienti)}%
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                                          {canEdit && (
                                            <Button
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddAmbiente(applicazione.id);
                                              }}
                                              title="Nuovo ambiente"
                                            >
                                              <Plus className="h-3.5 w-3.5 md:mr-0.5" />
                                              <span className="hidden md:inline">Nuovo Ambiente</span>
                                            </Button>
                                          )}
                                          {canEdit && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditApplicazione(applicazione);
                                              }}
                                              title="Modifica applicazione"
                                            >
                                              <Pencil className="h-3.5 w-3.5 md:mr-0.5" />
                                              <span className="hidden md:inline">Modifica</span>
                                            </Button>
                                          )}
                                          {canDelete && (
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteApplicazione(applicazione);
                                              }}
                                              title="Elimina applicazione"
                                            >
                                              <Trash2 className="h-3.5 w-3.5 md:mr-0.5" />
                                              <span className="hidden md:inline">Elimina</span>
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <CollapsibleContent>
                                    <CardContent className="pt-3">
                                      {getFilteredAmbienti(applicazione).length > 0 ? (
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-start">
                                          {getFilteredAmbienti(applicazione).map((ambiente) => (
                                            <Card 
                                              key={ambiente.id} 
                                              className={`bg-card overflow-hidden border-l-4 cursor-pointer hover:bg-muted/50 transition-colors ${TIPOLOGIA_AMBIENTE_BORDER_COLORS[ambiente.tipologia]}`}
                                              onClick={() => handleViewAmbiente(ambiente)}
                                            >
                                              <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2">
                                                <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <Badge className={`${TIPOLOGIA_AMBIENTE_COLORS[ambiente.tipologia]} text-white text-xs shrink-0`}>
                                                  {TIPOLOGIA_AMBIENTE_LABELS[ambiente.tipologia]}
                                                </Badge>
                                                <Badge className={`${STATO_AVANZAMENTO_COLORS[ambiente.statoAvanzamento || 'NON_INIZIATO']} ${STATO_AVANZAMENTO_TEXT_COLORS[ambiente.statoAvanzamento || 'NON_INIZIATO']} text-xs shrink-0`}>
                                                  {STATO_AVANZAMENTO_LABELS[ambiente.statoAvanzamento || 'NON_INIZIATO']}
                                                </Badge>
                                                {ambiente.richiestaCHG && (
                                                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                                                    CHG: {ambiente.richiestaCHG}
                                                  </Badge>
                                                )}
                                              </div>
                                            </Card>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-6 text-muted-foreground">
                                          <p>Nessun ambiente configurato</p>
                                          {canEdit && (
                                            <Button
                                              variant="link"
                                              size="sm"
                                              onClick={() => handleAddAmbiente(applicazione.id)}
                                            >
                                              Aggiungi il primo ambiente
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </CardContent>
                                  </CollapsibleContent>
                                </Collapsible>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>Nessuna applicazione configurata</p>
                            {canEdit && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => handleAddApplicazione(servizio.id)}
                              >
                                Aggiungi la prima applicazione
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t bg-card mt-auto">
          <div className="container mx-auto px-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              MIDA - Migration Dashboard
            </p>
          </div>
        </footer>
      </div>

      {/* Dialogs */}
      <ServizioDialog
        open={servizioDialogOpen}
        onOpenChange={setServizioDialogOpen}
        servizio={editingServizio}
        onSuccess={handleDialogSuccess}
      />
      <ApplicazioneDialog
        open={applicazioneDialogOpen}
        onOpenChange={setApplicazioneDialogOpen}
        applicazione={editingApplicazione}
        servizi={servizi}
        selectedServizioId={selectedServizioId}
        onSuccess={handleDialogSuccess}
      />
      <AmbienteDialog
        open={ambienteDialogOpen}
        onOpenChange={setAmbienteDialogOpen}
        ambiente={editingAmbiente}
        servizi={servizi}
        selectedApplicazioneId={selectedApplicazioneId}
        onSuccess={handleDialogSuccess}
      />
      <AmbienteDetailDialog
        open={ambienteDetailOpen}
        onOpenChange={setAmbienteDetailOpen}
        ambiente={viewingAmbiente}
        onEdit={handleEditAmbiente}
        onDelete={handleDeleteAmbiente}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={deletingItem?.name || ''}
        itemType={deletingItem?.type || 'servizio'}
      />
      <UserManagementPanel open={userManagementOpen} onOpenChange={setUserManagementOpen} />
      
      {/* Hidden panels - opened via events */}
      <AdminPanel onImportSuccess={fetchData} />
      <EmailSettingsPanel open={emailSettingsOpen} onOpenChange={setEmailSettingsOpen} />
      <AuditLogPanel />
    </div>
  );
}
