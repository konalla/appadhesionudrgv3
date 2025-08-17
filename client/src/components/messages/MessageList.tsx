import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { SearchIcon, RefreshCw } from 'lucide-react';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string;
  receiverName: string;
}

interface MessageListProps {
  type: 'sent' | 'received';
  onMessageSelect: (message: Message) => void;
}

export default function MessageList({ type, onMessageSelect }: MessageListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // État local pour suivre le chargement manuel
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(false);
  
  // Utiliser useEffect pour charger les messages 
  useEffect(() => {
    async function loadMessages() {
      if (!user?.id) {
        console.warn('Utilisateur non connecté, impossible de charger les messages');
        setLocalLoading(false);
        return;
      }
      
      setLocalLoading(true);
      setLocalError(false);
      
      try {
        let endpoint = '/api/messages';
        
        // Récupérer les messages envoyés ou reçus selon le type
        if (type === 'sent') {
          endpoint = `/api/messages/sent/${user.id}`;
        } else if (type === 'received') {
          endpoint = `/api/messages/received/${user.id}`; 
        }
        
        console.log('Chargement des messages depuis', endpoint, 'pour utilisateur ID:', user.id);
        
        const data = await apiRequest(endpoint);
        console.log('Messages reçus:', data.length, 'messages');
        setLocalMessages(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des messages:', error);
        setLocalError(true);
        toast({
          title: t('messages.loadError'),
          description: t('messages.loadFailed'),
          variant: 'destructive',
        });
      } finally {
        setLocalLoading(false);
      }
    }
    
    loadMessages();
  }, [user?.id, type, t, toast]);
  
  // Fonction de rechargement
  const refetch = async () => {
    if (!user?.id) return;
    
    try {
      let endpoint = '/api/messages';
      
      if (type === 'sent') {
        endpoint = `/api/messages/sent/${user.id}`;
      } else if (type === 'received') {
        endpoint = `/api/messages/received/${user.id}`; 
      }
      
      setLocalLoading(true);
      
      const data = await apiRequest(endpoint);
      setLocalMessages(data);
      setLocalError(false);
      
      toast({
        title: t('messages.refreshed'),
        description: t('messages.refreshSuccess'),
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      setLocalError(true);
      toast({
        title: t('messages.refreshError'),
        description: t('messages.refreshFailed'),
        variant: 'destructive',
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRefresh = async () => {
    // La fonction refetch gère déjà les toasts de succès et d'erreur
    await refetch();
  };

  const filteredMessages = localMessages.filter((message: Message) => {
    // Filter by type (sent or received)
    const typeMatch = type === 'sent' 
      ? message.senderId === user?.id 
      : message.receiverId === user?.id;
    
    // Filter by search term
    const searchMatch = searchTerm 
      ? message.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return typeMatch && searchMatch;
  }).sort((a: Message, b: Message) => {
    // Sort by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (localLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'sent' ? t('messages.sent') : t('messages.inbox')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <p>{t('messages.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (localError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'sent' ? t('messages.sent') : t('messages.inbox')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-center items-center h-64">
            <p className="text-destructive mb-2">{t('messages.loadError')}</p>
            <p>{t('messages.tryAgain')}</p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('messages.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'sent' ? t('messages.sent') : t('messages.inbox')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <p>
              {type === 'sent' 
                ? t('messages.emptySent') 
                : t('messages.emptyInbox')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
          <CardTitle>
            {type === 'sent' ? t('messages.sent') : t('messages.inbox')}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredMessages.length} {filteredMessages.length === 1 
                ? t('messages.messageFound') 
                : t('messages.messagesFound')})
            </span>
          </CardTitle>
          <div className="flex space-x-2">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('messages.search')}
                className="pl-8 w-full md:w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{type === 'sent' ? t('messages.to') : t('messages.from')}</TableHead>
              <TableHead>{t('messages.subject')}</TableHead>
              <TableHead>{t('messages.date')}</TableHead>
              <TableHead>{t('messages.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMessages.map((message: Message) => (
              <TableRow 
                key={message.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onMessageSelect(message)}
              >
                <TableCell className="font-medium">
                  {type === 'sent' ? message.receiverName : message.senderName}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {!message.isRead && type === 'received' && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                    )}
                    <span className={`${!message.isRead && type === 'received' ? 'font-medium' : ''}`}>
                      {message.subject}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(message.createdAt)}</TableCell>
                <TableCell>
                  {message.isRead ? (
                    <Badge variant="outline">{t('messages.read')}</Badge>
                  ) : (
                    <Badge>{t('messages.unread')}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}