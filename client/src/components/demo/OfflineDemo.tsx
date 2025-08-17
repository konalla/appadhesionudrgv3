import React, { useState, useEffect } from 'react';
import { useOfflineContext } from '@/contexts/offline-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, RotateCcw, Database, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Composant de démonstration de la fonctionnalité mode hors ligne
export function OfflineDemo() {
  const { t } = useTranslation();
  const { isOnline, hasPendingData, syncPendingData } = useOfflineContext();
  const [testData, setTestData] = useState('');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testData.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer des données à enregistrer',
        variant: 'destructive',
      });
      return;
    }
    
    // Simuler un enregistrement
    toast({
      title: 'Succès',
      description: isOnline 
        ? 'Données enregistrées avec succès!' 
        : 'Données enregistrées avec succès! (mode hors ligne)',
      variant: 'default',
    });
    
    // Si en mode hors ligne, ajouter à la liste des requêtes en attente
    if (!isOnline) {
      const newRequest = {
        url: '/api/demo/offline-test',
        method: 'POST',
        body: JSON.stringify({ testData, timestamp: new Date().toISOString() }),
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      setPendingRequests(prev => [...prev, newRequest]);
    }
    
    setTestData('');
  };
  
  // Fonction pour forcer le mode hors ligne (à des fins de démonstration)
  const toggleOfflineMode = () => {
    if (isOnline) {
      toast({
        title: 'Mode hors ligne simulé',
        description: 'Simulation du mode hors ligne activée. Les requêtes seront mises en file d\'attente.',
        variant: 'default',
      });
      
      // Émettre un événement offline
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    } else {
      toast({
        title: 'Mode en ligne simulé',
        description: 'Simulation du mode en ligne activée. Les requêtes seront envoyées normalement.',
        variant: 'default',
      });
      
      // Émettre un événement online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
    }
  };
  
  // Fonction pour simuler la synchronisation
  const handleSync = () => {
    setSyncInProgress(true);
    
    // Simulation de synchronisation
    setTimeout(() => {
      setPendingRequests([]);
      setSyncInProgress(false);
      toast({
        title: 'Synchronisation terminée',
        description: 'Toutes les requêtes ont été traitées avec succès',
        variant: 'default',
      });
    }, 2000);
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Test du Mode Hors Ligne</CardTitle>
          <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </Badge>
        </div>
        <CardDescription>
          Cet exemple démontre comment l'application peut fonctionner hors ligne
        </CardDescription>
      </CardHeader>
      
      <Separator />
      
      <Tabs defaultValue="test">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="pending">
            File d'attente
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>
        
        <TabsContent value="test">
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="testData">Données de test</Label>
                  <Input 
                    id="testData" 
                    placeholder="Entrez des données à sauvegarder..." 
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-center mt-4">
                <Button 
                  type="submit" 
                  disabled={syncInProgress || !testData.trim()}
                  className="w-full"
                >
                  {syncInProgress ? 'Enregistrement...' : 'Enregistrer les données'}
                </Button>
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleOfflineMode}
            >
              {isOnline ? 'Simuler hors ligne' : 'Simuler en ligne'}
            </Button>
            
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleSync}
              disabled={syncInProgress || pendingRequests.length === 0}
              className={cn("flex items-center gap-2", 
                syncInProgress && "opacity-70 cursor-not-allowed"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Synchroniser
            </Button>
          </CardFooter>
        </TabsContent>
        
        <TabsContent value="pending">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Requêtes en attente
            </h3>
            
            {pendingRequests.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucune requête en attente
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((request, index) => (
                  <div key={index} className="border rounded-md p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <Badge variant={
                        request.status === 'pending' ? 'default' : 
                        request.status === 'processing' ? 'secondary' : 
                        'destructive'
                      }>
                        {request.status === 'pending' ? 'En attente' : 
                         request.status === 'processing' ? 'En cours' : 
                         'Échec'}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(request.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1">
                      <strong>URL:</strong> {request.url}
                    </div>
                    <div>
                      <strong>Méthode:</strong> {request.method}
                    </div>
                    {request.body && (
                      <div className="mt-1">
                        <strong>Données:</strong> {
                          typeof request.body === 'string' ? 
                            request.body.length > 50 ? 
                              request.body.substring(0, 50) + '...' : 
                              request.body
                            : 
                            'Données complexes'
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={handleSync}
              disabled={syncInProgress || pendingRequests.length === 0}
              className="w-full"
            >
              {syncInProgress ? 'Synchronisation...' : 'Synchroniser toutes les requêtes'}
            </Button>
          </CardFooter>
        </TabsContent>
        
        <TabsContent value="info">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p>
                  Cette démo montre comment l'application gère le mode hors ligne. Vous pouvez :
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Simuler la perte de connexion</li>
                  <li>Envoyer des requêtes en mode hors ligne</li>
                  <li>Voir la file d'attente des requêtes</li>
                  <li>Synchroniser manuellement les données</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  En situation réelle, les requêtes seront automatiquement synchronisées lorsque la connexion sera rétablie.
                </p>
              </div>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}