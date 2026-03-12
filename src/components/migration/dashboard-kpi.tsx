'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Server,
  Box,
  Monitor,
  TrendingUp,
  AlertCircle,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { TIPOLOGIA_AMBIENTE_LABELS } from '@/types/migration';

interface DashboardKpiProps {
  onFilterByApplicazione?: (applicazioneId: string) => void;
}

interface KpiData {
  kpi: {
    servizi: number;
    applicazioni: number;
    ambienti: number;
    percentualeAvanzamento: number;
    ambientiCompletati: number;
    ambientiInCorso: number;
    ambientiInRitardo: number;
    applicazioniBloccate: number;
    applicazioniDaIniziare: number;
    applicazioniInCorso: number;
    applicazioniCompletate: number;
  };
  alert: {
    ambientiRitardo: {
      applicazione: string;
      applicazioneId: string;
      servizio: string;
      servizioId: string;
      tipologia: string;
      dataFine: string;
      giorniRitardo: number;
    }[];
    prossimeScadenze: {
      applicazione: string;
      applicazioneId: string;
      servizio: string;
      servizioId: string;
      dataFine: string;
      tipologia: string;
    }[];
  };
}

export function DashboardKpi({ onFilterByApplicazione }: DashboardKpiProps) {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpi();
  }, []);

  const fetchKpi = async () => {
    try {
      const response = await fetch('/api/kpi');
      if (response.ok) {
        const kpiData = await response.json();
        setData(kpiData);
      }
    } catch (error) {
      console.error('Errore caricamento KPI:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Calcola giorni rimanenti per scadenze
  const getDaysRemaining = (dataFine: string): number => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const fine = new Date(dataFine);
    fine.setHours(0, 0, 0, 0);
    return Math.ceil((fine.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Handle alert click
  const handleAlertClick = (applicazioneId: string) => {
    if (onFilterByApplicazione) {
      onFilterByApplicazione(applicazioneId);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { kpi, alert } = data;

  return (
    <div className="space-y-6 mb-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Progresso Totale */}
        <Card className="col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progresso Totale</p>
                <p className="text-3xl font-bold text-green-600">{kpi.percentualeAvanzamento}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.ambientiCompletati} di {kpi.ambienti} ambienti completati
                </p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${kpi.percentualeAvanzamento * 2.2} 220`}
                    className={kpi.percentualeAvanzamento >= 75 ? 'text-green-500' : 
                               kpi.percentualeAvanzamento >= 50 ? 'text-blue-500' :
                               kpi.percentualeAvanzamento >= 25 ? 'text-yellow-500' : 'text-gray-400'}
                  />
                </svg>
                <TrendingUp className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Servizi */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{kpi.servizi}</p>
                <p className="text-xs text-muted-foreground">Servizi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applicazioni */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Box className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{kpi.applicazioni}</p>
                <p className="text-xs text-muted-foreground">Applicazioni</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ambienti */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Monitor className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{kpi.ambienti}</p>
                <p className="text-xs text-muted-foreground">Ambienti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Ritardo */}
        <Card className={kpi.ambientiInRitardo > 0 ? 'border-red-300 bg-red-50 dark:bg-red-950' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${kpi.ambientiInRitardo > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <div>
                <p className={`text-2xl font-bold ${kpi.ambientiInRitardo > 0 ? 'text-red-600' : ''}`}>
                  {kpi.ambientiInRitardo}
                </p>
                <p className="text-xs text-muted-foreground">In Ritardo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stati Migrazione Codice */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Stato Migrazione Codice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">Bloccate:</span>
              <Badge variant="destructive">{kpi.applicazioniBloccate}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm">Da Iniziare:</span>
              <Badge className="bg-orange-100 text-orange-800">{kpi.applicazioniDaIniziare}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">In Corso:</span>
              <Badge className="bg-blue-100 text-blue-800">{kpi.applicazioniInCorso}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">Completate:</span>
              <Badge className="bg-green-100 text-green-800">{kpi.applicazioniCompletate}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Section */}
      {(alert.ambientiRitardo.length > 0 || alert.prossimeScadenze.length > 0) && (
        <div className="grid grid-cols-1 gap-4">
          {/* Ambienti in Ritardo */}
          {alert.ambientiRitardo.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Ambienti in Ritardo ({alert.ambientiRitardo.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-80 overflow-y-auto">
                  {alert.ambientiRitardo.map((amb, i) => (
                    <div 
                      key={i} 
                      className="flex flex-col p-2 bg-red-50 dark:bg-red-950 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 transition-colors group border border-red-100 dark:border-red-900"
                      onClick={() => handleAlertClick(amb.applicazioneId)}
                      title="Clicca per filtrare questa applicazione"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-medium truncate group-hover:underline flex-1">{amb.applicazione}</p>
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 shrink-0">
                          {amb.giorniRitardo}gg
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {amb.servizio}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {TIPOLOGIA_AMBIENTE_LABELS[amb.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS]}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prossime Scadenze */}
          {alert.prossimeScadenze.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                  <Calendar className="h-4 w-4" />
                  Prossime Scadenze (7 giorni)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-80 overflow-y-auto">
                  {alert.prossimeScadenze.map((amb, i) => (
                    <div 
                      key={i} 
                      className="flex flex-col p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-colors group border border-yellow-100 dark:border-yellow-900"
                      onClick={() => handleAlertClick(amb.applicazioneId)}
                      title="Clicca per filtrare questa applicazione"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-medium truncate group-hover:underline flex-1">{amb.applicazione}</p>
                        <Badge className="bg-yellow-100 text-yellow-800 text-[10px] px-1 py-0 h-4 shrink-0">
                          {formatDate(amb.dataFine)}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {amb.servizio}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {TIPOLOGIA_AMBIENTE_LABELS[amb.tipologia as keyof typeof TIPOLOGIA_AMBIENTE_LABELS]}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

    </div>
  );
}
