import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
import { ArrowLeft, Trash2 } from 'lucide-react';

interface GroupMessage {
  id: number;
  senderId: number;
  subject: string;
  content: string;
  targetType: string;
  targetValue: string;
  recipientCount: number;
  createdAt: string;
}

interface GroupMessageDetailProps {
  message: GroupMessage;
  onBack: () => void;
  onDeleteSuccess?: () => void;
}

export default function GroupMessageDetail({ 
  message, 
  onBack, 
  onDeleteSuccess
}: GroupMessageDetailProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Helper function to get human-readable target description
  const getTargetDescription = (targetType: string, targetValue: string) => {
    if (targetType === 'all') {
      return t('messages.targetAll');
    } else if (targetType === 'region') {
      return `${t('messages.targetRegion')}: ${targetValue}`;
    } else if (targetType === 'federation') {
      return `${t('messages.targetFederation')}: ${targetValue}`;
    } else if (targetType === 'gender') {
      return `${t('messages.targetGender')}: ${t(`gender.${targetValue}`)}`;
    } else if (targetType === 'voterCard') {
      return `${t('messages.targetVoterCard')}: ${t(`voterCard.${targetValue}`)}`;
    }
    return targetValue;
  };
  
  // Fonction pour supprimer un message avec apiRequest
  const deleteMessage = async () => {
    try {
      setIsDeleting(true);
      
      await apiRequest(`/api/group-messages/${message.id}`, {
        method: 'DELETE'
      });
      
      toast({
        title: t('messages.deleted'),
        description: t('messages.deleteSuccess'),
      });
      
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

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    await deleteMessage();
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
            <Badge>
              {getTargetDescription(message.targetType, message.targetValue)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{t('messages.recipients')}:</span>{' '}
                <span>{message.recipientCount} {t('messages.members')}</span>
              </div>
              <span className="text-muted-foreground">
                {formatDate(message.createdAt)}
              </span>
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
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? t('common.deleting') : t('common.delete')}
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