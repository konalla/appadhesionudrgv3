import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Eye, Plus, Send, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';

// Message components
import MessageForm from '@/components/messages/MessageForm';
import MessageList from '@/components/messages/MessageList';
import MessageDetail from '@/components/messages/MessageDetail';
import GroupMessageForm from '@/components/messages/GroupMessageForm';
import GroupMessageDetail from '@/components/messages/GroupMessageDetail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Message interfaces
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

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Shared state
  const [messageType, setMessageType] = useState<'individual' | 'group'>('individual');
  
  // Individual message state
  const [view, setView] = useState<'list' | 'detail' | 'form'>('list');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<{ userId: number; subject: string } | null>(null);

  // Group message state
  const [groupView, setGroupView] = useState<'list' | 'form' | 'detail'>('list');
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [selectedGroupMessage, setSelectedGroupMessage] = useState<GroupMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch group messages when needed
  useEffect(() => {
    if (messageType === 'group') {
      const fetchGroupMessages = async () => {
        if (!user?.id) {
          console.warn('User not logged in, cannot fetch group messages');
          setLoading(false);
          return;
        }
        
        try {
          setLoading(true);
          const data = await apiRequest(`/api/group-messages/sent/${user.id}`);
          setGroupMessages(data);
        } catch (error: any) {
          console.error('Failed to fetch group messages:', error);
          toast({
            title: t('common.error'),
            description: error.message || t('messages.fetchError'),
            variant: 'destructive'
          });
        } finally {
          setLoading(false);
        }
      };
      
      fetchGroupMessages();
    }
  }, [messageType, refreshKey, t, toast, user?.id]);

  // Individual message handlers
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedMessage(null);
    setView('list');
  };

  const handleComposeNew = () => {
    if (messageType === 'individual') {
      setReplyTo(null);
      setView('form');
    } else {
      setGroupView('form');
    }
  };

  const handleReply = (userId: number, subject: string) => {
    setReplyTo({ userId, subject });
    setView('form');
  };

  const handleFormSuccess = () => {
    if (messageType === 'individual') {
      setView('list');
      setActiveTab('sent');
    } else {
      setGroupView('list');
      setRefreshKey(prev => prev + 1); // Force refresh of the list
    }
  };

  const handleFormCancel = () => {
    if (messageType === 'individual') {
      setView('list');
    } else {
      setGroupView('list');
    }
  };

  // Group message handlers
  const handleViewGroupMessage = (message: GroupMessage) => {
    setSelectedGroupMessage(message);
    setGroupView('detail');
  };
  
  const handleBackToGroupList = () => {
    setSelectedGroupMessage(null);
    setGroupView('list');
  };
  
  const handleGroupDeleteSuccess = () => {
    setSelectedGroupMessage(null);
    setGroupView('list');
    setRefreshKey(prev => prev + 1); // Force refresh of the list
    toast({
      title: t('common.success'),
      description: t('messages.deleteSuccess')
    });
  };

  const handleDeleteGroupMessage = async (id: number) => {
    if (window.confirm(t('messages.confirmDelete'))) {
      try {
        await apiRequest(`/api/group-messages/${id}`, {
          method: 'DELETE'
        });
        
        toast({
          title: t('common.success'),
          description: t('messages.deleteSuccess')
        });
        
        // Refresh the list
        setRefreshKey(prev => prev + 1);
      } catch (error: any) {
        console.error('Failed to delete group message:', error);
        toast({
          title: t('common.error'),
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

  const showBackButton = () => {
    if (messageType === 'individual') {
      return view === 'detail' || view === 'form';
    } else {
      return groupView === 'detail' || groupView === 'form';
    }
  };

  const handleBackClick = () => {
    if (messageType === 'individual') {
      handleBackToList();
    } else {
      handleBackToGroupList();
    }
  };

  const showAddButton = () => {
    if (messageType === 'individual') {
      return view === 'list';
    } else {
      return groupView === 'list';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="pl-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('messages.title')}</h1>
          <p className="text-muted-foreground">
            {messageType === 'individual' ? t('messages.subtitle') : t('messages.groupSubtitle')}
          </p>
        </div>

        {showAddButton() && (
          <Button onClick={handleComposeNew} className="mt-4 md:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            {messageType === 'individual' ? t('messages.compose') : t('messages.composeGroup')}
          </Button>
        )}

        {showBackButton() && (
          <Button 
            variant="outline" 
            onClick={handleBackClick} 
            className="mt-4 md:mt-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        )}
      </div>
      
      {/* Top-level tabs for individual vs group messages */}
      <div className="mb-6">
        <Tabs defaultValue="individual" value={messageType} onValueChange={(val) => {
          setMessageType(val as 'individual' | 'group');
          // Reset views when switching tabs
          setView('list');
          setGroupView('list');
        }}>
          <TabsList className="mb-4">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {t('messages.individual')}
            </TabsTrigger>
            {/* Only show group messaging tab for system administrators */}
            {user?.role !== 'admin' && (
              <TabsTrigger value="group" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('messages.group')}
              </TabsTrigger>
            )}
          </TabsList>
          
          {/* Individual messages tab content */}
          <TabsContent value="individual">
            {view === 'list' && (
              <Tabs defaultValue="inbox" value={activeTab} onValueChange={(val) => setActiveTab(val as 'inbox' | 'sent')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="inbox">{t('messages.inbox')}</TabsTrigger>
                  <TabsTrigger value="sent">{t('messages.sent')}</TabsTrigger>
                </TabsList>
                <TabsContent value="inbox">
                  <MessageList 
                    type="received" 
                    onMessageSelect={handleMessageSelect} 
                  />
                </TabsContent>
                <TabsContent value="sent">
                  <MessageList 
                    type="sent" 
                    onMessageSelect={handleMessageSelect} 
                  />
                </TabsContent>
              </Tabs>
            )}

            {view === 'detail' && selectedMessage && (
              <MessageDetail 
                message={selectedMessage} 
                currentUserId={user?.id}
                onBack={handleBackToList}
                onDeleteSuccess={handleBackToList}
                onReply={handleReply}
              />
            )}

            {view === 'form' && (
              <MessageForm 
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                replyToUserId={replyTo?.userId}
                defaultSubject={replyTo?.subject}
              />
            )}
          </TabsContent>
          
          {/* Group messages tab content - Only visible for system administrators */}
          {user?.role !== 'admin' && (
            <TabsContent value="group">
            {groupView === 'list' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('messages.sentGroupMessages')}</CardTitle>
                  <CardDescription>{t('messages.groupMessagesDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">{t('common.loading')}</div>
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
                                  onClick={() => handleViewGroupMessage(message)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('common.view')}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteGroupMessage(message.id)}
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

            {groupView === 'form' && (
              <GroupMessageForm 
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            )}
            
            {groupView === 'detail' && selectedGroupMessage && (
              <GroupMessageDetail
                message={selectedGroupMessage}
                onBack={handleBackToGroupList}
                onDeleteSuccess={handleGroupDeleteSuccess}
              />
            )}
            </TabsContent>
          )}
        </Tabs>
        </div>
      </div>
    </div>
  );
}