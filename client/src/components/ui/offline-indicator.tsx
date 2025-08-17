import React from 'react';
import { useOfflineContext } from '@/contexts/offline-context';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface OfflineIndicatorProps {
  className?: string;
  showSyncButton?: boolean;
}

export function OfflineIndicator({ className, showSyncButton = false }: OfflineIndicatorProps) {
  const { isOnline, hasPendingData, syncPendingData } = useOfflineContext();
  const { t } = useTranslation();

  // Ne rien afficher si tout est normal
  if (isOnline && !hasPendingData) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
        isOnline ? 'bg-amber-50 text-amber-800' : 'bg-destructive/10 text-destructive',
        className
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>{t('common.offline.status', 'Mode hors ligne')}</span>
        </>
      ) : hasPendingData ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>{t('common.offline.pendingData', 'Données en attente de synchronisation')}</span>
          {showSyncButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => syncPendingData()}
              className="ml-2 h-6 px-2 text-xs"
            >
              {t('common.offline.sync', 'Synchroniser')}
            </Button>
          )}
        </>
      ) : null}
    </div>
  );
}