import React from 'react';
import { OfflineDemo } from '@/components/demo/OfflineDemo';

export default function OfflineDemoPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="pl-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col space-y-1 mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Mode Hors Ligne</h2>
          <p className="text-muted-foreground">
            Démonstration de la fonctionnalité de mode hors ligne de l'application
          </p>
        </div>
        
        <div className="grid gap-6">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Fonctionnement du mode hors ligne</h3>
            
            <div className="prose">
              <p>
                Le mode hors ligne permet aux utilisateurs de continuer à utiliser l'application même lorsqu'ils n'ont pas de connexion Internet.
                Les fonctionnalités principales incluent :
              </p>
              
              <ul>
                <li>
                  <strong>Mise en cache des ressources</strong> - Les fichiers statiques et certaines données sont stockés localement pour permettre l'accès hors ligne.
                </li>
                <li>
                  <strong>File d'attente des requêtes</strong> - Les actions des utilisateurs sont enregistrées localement et synchronisées lorsque la connexion est rétablie.
                </li>
                <li>
                  <strong>Indicateurs visuels</strong> - L'utilisateur est informé du statut de la connexion et des opérations en attente.
                </li>
                <li>
                  <strong>Synchronisation automatique</strong> - Lorsque la connexion est rétablie, les données sont automatiquement synchronisées avec le serveur.
                </li>
              </ul>
              
              <p>
                Cette fonctionnalité est particulièrement utile pour les agents de terrain qui travaillent dans des zones avec une connectivité limitée.
              </p>
            </div>
          </div>
          
          <div className="rounded-lg p-6">
            <OfflineDemo />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}