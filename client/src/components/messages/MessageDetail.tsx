import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  username: string;
};

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Reply } from 'lucide-react';

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

interface MessageDetailProps {
  message: Message;
  currentUserId?: number;
  onBack: () => void;
  onDeleteSuccess?: () => void;
  onReply?: (userId: number, subject: string) => void;
}

export default function MessageDetail({ 
  message, 
  currentUserId,
  onBack, 
  onDeleteSuccess,
  onReply
}: MessageDetailProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // État local pour les admins
  const [admins, setAdmins] = React.useState<User[]>([]);
  
  // Charger les admins avec apiRequest
  React.useEffect(() => {
    async function loadAdmins() {
      try {
        const data = await apiRequest('/api/users/admins');
        setAdmins(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des admins:', error);
      }
    }
    
    loadAdmins();
  }, []);

  const isReceiver = message.receiverId === user?.id;

  // État de suppression
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Fonction pour supprimer un message avec apiRequest
  const deleteMessage = async () => {
    try {
      setIsDeleting(true);
      
      await apiRequest(`/api/messages/${message.id}`, {
        method: 'DELETE'
      });
      
      toast({
        title: t('messages.deleted'),
        description: t('messages.deleteSuccess'),
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
      toast({
        title: t('messages.deleteError'),
        description: error instanceof Error ? error.message : t('messages.deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fonction pour marquer un message comme lu avec apiRequest
  const markAsRead = async () => {
    try {
      await apiRequest(`/api/messages/${message.id}/read`, {
        method: 'PUT'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
    }
  };

  // Si le message est non lu et l'utilisateur est le destinataire, le marquer comme lu
  React.useEffect(() => {
    if (isReceiver && !message.isRead) {
      markAsRead();
    }
  }, [message.id, isReceiver, message.isRead]);

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    await deleteMessage();
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message.senderId, message.subject);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex-1">{message.subject}</CardTitle>
            <Badge variant={message.isRead ? "outline" : "default"}>
              {message.isRead ? t('messages.read') : t('messages.unread')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{t('messages.from')}:</span>{' '}
                <span>{message.senderName}</span>
                {message.senderId === user?.id && (
                  <span className="ml-1 text-muted-foreground">({t('messages.you')})</span>
                )}
              </div>
              <span className="text-muted-foreground">
                {formatDate(message.createdAt)}
              </span>
            </div>
            <div>
              <span className="font-medium">{t('messages.to')}:</span>{' '}
              <span>{message.receiverName}</span>
              {message.receiverId === user?.id && (
                <span className="ml-1 text-muted-foreground">({t('messages.you')})</span>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div className="min-h-[12rem] whitespace-pre-wrap">
            {message.content}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onBack}>
              {t('common.back')}
            </Button>
          </div>
          <div className="flex space-x-2">
            {isReceiver && (
              <Button variant="outline" onClick={handleReply}>
                <Reply className="mr-2 h-4 w-4" />
                {t('messages.reply')}
              </Button>
            )}
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('messages.delete')}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('messages.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('messages.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('messages.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}