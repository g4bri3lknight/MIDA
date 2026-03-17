'use client';

import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    servizi: number;
    applicazioni: number;
    ambienti: number;
  };
}

interface AdminPanelProps {
  onImportSuccess?: () => void;
}

export function AdminPanel({ onImportSuccess }: AdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for custom event to open dialog
  useEffect(() => {
    const handleOpenDialog = () => setIsOpen(true);
    window.addEventListener('openImportDialog', handleOpenDialog);
    return () => window.removeEventListener('openImportDialog', handleOpenDialog);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setFile(selectedFile);
        setError(null);
        setResult(null);
      } else {
        setError('Seleziona un file Excel (.xlsx o .xls)');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('excel-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Notify parent to refresh data
        onImportSuccess?.();
      } else {
        setError(data.error || 'Errore durante l\'importazione');
      }
    } catch {
      setError('Errore di connessione al server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setError(null);
    setResult(null);
  };

  const handleDownloadSample = async () => {
    try {
      const response = await fetch('/api/sample-export');
      if (!response.ok) throw new Error('Errore download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'esempio_import_mida.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Errore durante il download del file esempio');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importazione Dati Excel
          </DialogTitle>
          <DialogDescription>
            Carica un file Excel per importare servizi, applicazioni e ambienti.
            Ogni foglio del file rappresenta un Servizio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download esempio */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    File di esempio
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Scarica il template per vedere la struttura corretta
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadSample}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                  Scarica
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Struttura attesa */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Struttura File Attesa</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <ul className="space-y-1">
                <li>• Ogni <strong>foglio</strong> = un Servizio</li>
                <li>• Ogni <strong>riga</strong> = Applicazione + Ambiente</li>
                <li>• Colonna <strong>Tipo</strong>: deve contenere &quot;nodo&quot;</li>
                <li>• Foglio <strong>CODEBASE</strong>: stato migrazione codice</li>
              </ul>
            </CardContent>
          </Card>

          {/* Upload area */}
          <div className="space-y-2">
            <label
              htmlFor="excel-file"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {file ? (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileSpreadsheet className="w-10 h-10 mb-2 text-green-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Clicca per selezionare</span> o trascina
                  </p>
                  <p className="text-xs text-muted-foreground">XLSX o XLS (max 10MB)</p>
                </div>
              )}
              <input
                id="excel-file"
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {result && result.success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Importazione Completata</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Servizi creati: {result.results?.servizi}</p>
                  <p>Applicazioni create: {result.results?.applicazioni}</p>
                  <p>Ambienti creati: {result.results?.ambienti}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importazione in corso...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Chiudi
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
