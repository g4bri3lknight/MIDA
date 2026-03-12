'use client';

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

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'servizio' | 'applicazione' | 'ambiente';
}

const itemTypeLabels = {
  servizio: 'servizio',
  applicazione: 'applicazione',
  ambiente: 'ambiente',
};

const itemTypeWarning = {
  servizio: 'Verranno eliminate anche tutte le applicazioni e gli ambienti associati.',
  applicazione: 'Verranno eliminati anche tutti gli ambienti associati.',
  ambiente: 'Questa azione non può essere annullata.',
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare {itemTypeLabels[itemType]} <strong>&quot;{itemName}&quot;</strong>?
            <br />
            <span className="text-destructive">{itemTypeWarning[itemType]}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
