'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  Plus, 
  RefreshCw, 
  Download, 
  Upload, 
  History, 
  Mail, 
  Users 
} from 'lucide-react';

interface MenuBarProps {
  loading: boolean;
  exporting: boolean;
  canImport: boolean;
  canEdit: boolean;
  canManageUsers: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenAuditLog: () => void;
  onOpenEmailSettings: () => void;
  onOpenUserManagement: () => void;
  onNewServizio: () => void;
}

export function MenuBar({
  loading,
  exporting,
  canImport,
  canEdit,
  canManageUsers,
  onRefresh,
  onExport,
  onImport,
  onOpenAuditLog,
  onOpenEmailSettings,
  onOpenUserManagement,
  onNewServizio,
}: MenuBarProps) {
  return (
    <>
      {/* Menu Bar - Desktop */}
      <div className="hidden md:block border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 py-1">
            {/* Menu File */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  File
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onRefresh} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Aggiorna
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport} disabled={exporting || loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Excel
                </DropdownMenuItem>
                {canImport && (
                  <DropdownMenuItem onClick={onImport}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importa Excel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onOpenAuditLog}>
                  <History className="h-4 w-4 mr-2" />
                  Storico Modifiche
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Impostazioni Email */}
            {canManageUsers && (
              <Button variant="ghost" size="sm" onClick={onOpenEmailSettings} className="h-7 px-2">
                <Mail className="h-4 w-4 mr-1" />
                Impostazioni Email
              </Button>
            )}

            {/* Gestione Utenti */}
            {canManageUsers && (
              <Button variant="ghost" size="sm" onClick={onOpenUserManagement} className="h-7 px-2">
                <Users className="h-4 w-4 mr-1" />
                Gestione Utenti
              </Button>
            )}

            <div className="flex-1" />

            {/* Nuovo Servizio */}
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={onNewServizio} className="h-7 px-2">
                <Plus className="h-4 w-4 mr-1" />
                Nuovo Servizio
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Menu Bar - Mobile */}
      <div className="md:hidden border-b bg-muted/30">
        <div className="container mx-auto px-4 py-1">
          <div className="flex items-center gap-1">
            {/* Menu File Mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  File
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onRefresh} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Aggiorna
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport} disabled={exporting || loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Excel
                </DropdownMenuItem>
                {canImport && (
                  <DropdownMenuItem onClick={onImport}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importa Excel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onOpenAuditLog}>
                  <History className="h-4 w-4 mr-2" />
                  Storico Modifiche
                </DropdownMenuItem>
                {canManageUsers && (
                  <DropdownMenuItem onClick={onOpenEmailSettings}>
                    <Mail className="h-4 w-4 mr-2" />
                    Impostazioni Email
                  </DropdownMenuItem>
                )}
                {canManageUsers && (
                  <DropdownMenuItem onClick={onOpenUserManagement}>
                    <Users className="h-4 w-4 mr-2" />
                    Gestione Utenti
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1" />

            {/* Nuovo Servizio Mobile */}
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={onNewServizio} className="h-7 px-2">
                <Plus className="h-4 w-4 mr-1" />
                Nuovo
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
