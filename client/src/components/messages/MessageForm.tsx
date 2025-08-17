import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { messageFormSchema } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  username: string;
};

interface MessageFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  replyToUserId?: number;
  defaultSubject?: string;
}

export default function MessageForm({ 
  onSuccess, 
  onCancel,
  replyToUserId,
  defaultSubject
}: MessageFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      receiverId: replyToUserId || 0,
      subject: defaultSubject ? `Re: ${defaultSubject}` : '',
      content: ''
    }
  });

  // État pour suivre l'envoi du message
  const [isSending, setIsSending] = React.useState(false);
  
  // Fonction pour envoyer un message avec apiRequest
  const sendMessage = async (data: any) => {
    try {
      setIsSending(true);
      
      // Ajout de l'ID de l'expéditeur si l'utilisateur est connecté
      if (!user?.id) {
        throw new Error(t('auth.loginRequired'));
      }
      
      const messageData = {
        ...data,
        senderId: user.id
      };
      
      await apiRequest('POST', '/api/messages', messageData);
      
      toast({
        title: t('messages.sentSuccess'),
        description: '',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast({
        title: t('messages.sendError'),
        description: error instanceof Error ? error.message : t('messages.sendFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

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
        toast({
          title: t('error'),
          description: t('admins.loadError'),
          variant: 'destructive',
        });
      }
    }
    
    loadAdmins();
  }, [t, toast]);

  const onSubmit = async (data: any) => {
    if (!data.receiverId) {
      toast({
        title: t('messages.recipientRequired'),
        description: t('messages.selectRecipient'),
        variant: 'destructive',
      });
      return;
    }
    
    await sendMessage(data);
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{t('messages.newMessage')}</CardTitle>
        <CardDescription>{t('messages.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="receiverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('messages.recipient')}</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={replyToUserId ? replyToUserId.toString() : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('messages.selectRecipient')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {admins && admins.map((admin: User) => (
                        <SelectItem key={admin.id} value={admin.id.toString()}>
                          {admin.name} ({admin.role === 'sysadmin' ? t('admins.roles.sysadmin') : t('admins.roles.admin')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('messages.subject')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('messages.subjectPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('messages.message')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('messages.messagePlaceholder')} 
                      className="min-h-32"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t('common.cancel')}
                </Button>
              )}
              <Button type="submit" disabled={isSending}>
                {isSending ? t('common.saving') : t('messages.send')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}