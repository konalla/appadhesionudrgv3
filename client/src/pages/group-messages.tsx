import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, Plus, Send, Trash2, Users } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import GroupMessageForm from '@/components/messages/GroupMessageForm';
import GroupMessageDetail from '@/components/messages/GroupMessageDetail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// GroupMessage interface
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

export default function GroupMessages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GroupMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!user?.id) {
        console.warn('User not logged in, cannot fetch group messages');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Utilisez l'endpoint approprié avec l'ID utilisateur
        const data = await apiRequest(`/api/group-messages/sent/${user.id}`);
        setGroupMessages(data);
      } catch (error: any) {
        console.error('Failed to fetch group messages:', error);
        toast({
          title: t('error'),
          description: error.message || t('messages.fetchError'),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGroupMessages();
  }, [t, toast, refreshKey, user?.id]);

  const handleComposeNew = () => {
    setView('form');
  };

  const handleFormSuccess = () => {
    setView('list');
    setRefreshKey(prev => prev + 1); // Force refresh of the list
  };

  const handleFormCancel = () => {
    setView('list');
  };
  
  const handleViewMessage = (message: GroupMessage) => {
    setSelectedMessage(message);
    setView('detail');
  };
  
  const handleBackToList = () => {
    setSelectedMessage(null);
    setView('list');
  };
  
  const handleDeleteSuccess = () => {
    setSelectedMessage(null);
    setView('list');
    setRefreshKey(prev => prev + 1); // Force refresh of the list
    toast({
      title: t('success'),
      description: t('messages.deleteSuccess')
    });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('messages.confirmDelete'))) {
      try {
        await apiRequest(`/api/group-messages/${id}`, {
          method: 'DELETE'
        });
        
        toast({
          title: t('success'),
          description: t('messages.deleteSuccess')
        });
        
        // Refresh the list
        setRefreshKey(prev => prev + 1);
      } catch (error: any) {
        console.error('Failed to delete group message:', error);
        toast({
          title: t('error'),
          description: error.message || t('messages.deleteError'),
          variant: 'destructive'
        });
      }
    }
  };

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

  return (
    <div className="container p-4 mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('messages.groupTitle')}</h1>
          <p className="text-muted-foreground">
            {t('messages.groupSubtitle')}
          </p>
        </div>

        {view === 'list' && (
          <Button onClick={handleComposeNew} className="mt-4 md:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            {t('messages.composeGroup')}
          </Button>
        )}

        {(view === 'form' || view === 'detail') && (
          <Button 
            variant="outline" 
            onClick={view === 'form' ? handleFormCancel : handleBackToList} 
            className="mt-4 md:mt-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        )}
      </div>

      {/* Navigation between individual and group messages */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/messages">
          <Button variant="outline" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {t('messages.individual')}
          </Button>
        </Link>
        <Link href="/group-messages">
          <Button variant="default" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('messages.group')}
          </Button>
        </Link>
      </div>

      {view === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('messages.sentGroupMessages')}</CardTitle>
            <CardDescription>{t('messages.groupMessagesDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('loading')}</div>
            ) : groupMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('messages.noGroupMessages')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('messages.subject')}</TableHead>
                    <TableHead>{t('messages.target')}</TableHead>
                    <TableHead>{t('messages.recipientCount')}</TableHead>
                    <TableHead>{t('messages.sent')}</TableHead>
                    <TableHead className="text-right">{t('actions.title')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{message.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTargetDescription(message.targetType, message.targetValue)}
                        </Badge>
                      </TableCell>
                      <TableCell>{message.recipientCount}</TableCell>
                      <TableCell>{formatDate(message.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMessage(message)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('common.view')}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(message.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('common.delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'form' && (
        <GroupMessageForm 
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
      
      {view === 'detail' && selectedMessage && (
        <GroupMessageDetail
          message={selectedMessage}
          onBack={handleBackToList}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}