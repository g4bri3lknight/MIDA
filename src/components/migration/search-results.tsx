'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Box, Monitor, Search } from 'lucide-react';
import type { Servizio, Applicazione, Ambiente } from '@/types/migration';
import { 
  TIPOLOGIA_AMBIENTE_LABELS, 
  STATO_AVANZAMENTO_COLORS,
  STATO_AVANZAMENTO_TEXT_COLORS,
  STATO_AVANZAMENTO_LABELS,
  STATO_MIGRAZIONE_CODICE_COLORS,
  STATO_MIGRAZIONE_CODICE_TEXT_COLORS,
  STATO_MIGRAZIONE_CODICE_LABELS,
} from '@/types/migration';

interface SearchResultsProps {
  searchResults: {
    servizi: Servizio[];
    applicazioni: { app: Applicazione; servizio: string }[];
    ambienti: { amb: Ambiente; applicazione: string; servizio: string }[];
  };
  globalSearch: string;
  onSelectServizio: (id: string) => void;
  onSelectApplicazione: (id: string) => void;
  onSelectAmbiente: (amb: Ambiente) => void;
  onClose: () => void;
}

export function SearchResults({
  searchResults,
  globalSearch,
  onSelectServizio,
  onSelectApplicazione,
  onSelectAmbiente,
  onClose,
}: SearchResultsProps) {
  const hasResults = 
    searchResults.servizi.length > 0 || 
    searchResults.applicazioni.length > 0 || 
    searchResults.ambienti.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Risultati per &quot;{globalSearch}&quot;</h2>
        <button
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={onClose}
        >
          ✕ Chiudi ricerca
        </button>
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
                <Badge 
                  key={s.id} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    onSelectServizio(s.id);
                    onClose();
                  }}
                >
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
                <div 
                  key={app.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => {
                    onSelectApplicazione(app.id);
                    onClose();
                  }}
                >
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
                <div 
                  key={amb.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => {
                    onSelectAmbiente(amb);
                    onClose();
                  }}
                >
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
      {!hasResults && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nessun risultato trovato per &quot;{globalSearch}&quot;</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
