import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from 'wouter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, MoreHorizontal, Printer, Filter, Download, QrCode, Search, Users, Building } from "lucide-react";
import { formatDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import MemberCardForm from '../components/members/MemberCardForm';

interface MemberCard {
  id: number;
  memberId: number;
  cardNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  printedCount: number;
  lastPrintedAt: string | null;
  qrCodeData: string;
  cardTemplate: string;
}

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  membershipId: string;
  [key: string]: any;
}

export default function MemberCards() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<MemberCard | null>(null);
  const [isFederationDialogOpen, setIsFederationDialogOpen] = useState(false);
  const [selectedFederation, setSelectedFederation] = useState<string>("");
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // Fetch cards
  const { data: cards = [], isLoading: isLoadingCards } = useQuery<MemberCard[]>({
    queryKey: ['/api/member-cards'],
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Fetch members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: ['/api/members'],
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  
  // Fetch federations
  const { data: federations = [], isLoading: isLoadingFederations } = useQuery<any[]>({
    queryKey: ['/api/federations'],
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Delete card mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/member-cards/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/member-cards'] });
      toast({
        title: t('success'),
        description: t('cardDeleteSuccess'),
      });
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Print card mutation
  const printMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/member-cards/${id}/print`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/member-cards'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Batch generate cards mutation
  const batchGenerateMutation = useMutation({
    mutationFn: async (memberIds: number[]) => {
      return apiRequest('/api/member-cards/batch-generate', {
        method: 'POST',
        body: JSON.stringify({ memberIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/member-cards'] });
      toast({
        title: t('success'),
        description: t('cardsBatchGeneratedSuccess'),
      });
      setIsGeneratingCards(false);
      setSelectedMemberIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
      setIsGeneratingCards(false);
    },
  });
  
  // Federation batch generate cards mutation (creation in database)
  const federationBatchGenerateMutation = useMutation({
    mutationFn: async (federationName: string) => {
      return apiRequest('/api/member-cards/federation-batch-generate', {
        method: 'POST',
        body: JSON.stringify({ federationName }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/member-cards'] });
      toast({
        title: t('success'),
        description: t('federationCardsBatchGeneratedSuccess', { federation: selectedFederation }),
      });
      setIsFederationDialogOpen(false);
      setSelectedFederation("");
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
      setIsFederationDialogOpen(false);
    },
  });

  // Helper to get member name by ID
  const getMemberName = (memberId: number): string => {
    const member = members.find((m: Member) => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Unknown';
  };

  // Filter cards based on search query
  const filteredCards = cards.filter((card: MemberCard) => {
    const memberName = getMemberName(card.memberId).toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return (
      card.cardNumber.toLowerCase().includes(searchLower) ||
      memberName.includes(searchLower)
    );
  });

  // Download a single card PDF
  const downloadCardPDF = (cardId: number) => {
    // Ouvrir directement un nouvel onglet pour télécharger le PDF
    // Cela évite les problèmes de parsing JSON des réponses PDF
    const downloadUrl = `/api/member-cards/${cardId}/generate-pdf`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mettre à jour le compteur d'impressions
    printMutation.mutate(cardId);
  };

  // Generate batch of cards
  const generateBatchCards = () => {
    if (selectedMemberIds.length === 0) {
      toast({
        title: t('warning'),
        description: t('noMembersSelected'),
      });
      return;
    }

    setIsGeneratingCards(true);
    batchGenerateMutation.mutate(selectedMemberIds);
  };
  
  // Generate federation cards
  const generateFederationCards = () => {
    if (!selectedFederation) {
      toast({
        title: t('warning'),
        description: t('noFederationSelected'),
      });
      return;
    }

    federationBatchGenerateMutation.mutate(selectedFederation);
  };

  // Open card form for creating/editing
  const openCardForm = (memberId?: number) => {
    setCurrentMemberId(memberId || null);
    setIsCardFormOpen(true);
  };

  // Toggle member selection for batch operations
  const toggleMemberSelection = (id: number) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter(mid => mid !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  // Toggle all members selection
  const toggleAllMembersSelection = () => {
    if (selectedMemberIds.length === filteredCards.length) {
      // If all are selected, deselect all
      setSelectedMemberIds([]);
    } else {
      // Otherwise, select all
      const allMemberIds = filteredCards.map(card => card.memberId);
      setSelectedMemberIds(allMemberIds);
    }
  };

  // Confirm card deletion
  const confirmDelete = (card: MemberCard) => {
    setCardToDelete(card);
    setIsDeleteDialogOpen(true);
  };

  // Handle card deletion
  const handleDeleteCard = () => {
    if (cardToDelete) {
      deleteMutation.mutate(cardToDelete.id);
    }
  };

  // Status badge color mapping
  const statusColor: { [key: string]: string } = {
    active: 'bg-green-500',
    expired: 'bg-yellow-500',
    revoked: 'bg-red-500',
  };

  // Show loading spinner while auth status is being determined
  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Only render the component when we have a user
  if (!user) return null;

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-8 pl-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('memberCards.title')}</h1>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                {t('memberCards.generateCards')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsGeneratingCards(true)}>
                <Users className="mr-2 h-4 w-4" />
                <span>{t('memberCards.bySelectedMembers')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsFederationDialogOpen(true)}>
                <Building className="mr-2 h-4 w-4" />
                <span>{t('memberCards.byFederation')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => openCardForm()}>
            {t('memberCards.createCard')}
          </Button>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t('memberCards.searchCards')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Cards table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('memberCards.memberCardsList')}</CardTitle>
          <CardDescription>
            {t('memberCards.totalCards')}: {filteredCards.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCards || isLoadingMembers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? t('memberCards.noCardsFound') : t('memberCards.noCardsYet')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedMemberIds.length === filteredCards.length && filteredCards.length > 0}
                      onCheckedChange={toggleAllMembersSelection}
                    />
                  </TableHead>
                  <TableHead>{t('memberCards.cardNumber')}</TableHead>
                  <TableHead>{t('memberCards.memberName')}</TableHead>
                  <TableHead>{t('memberCards.issueDate')}</TableHead>
                  <TableHead>{t('memberCards.expiryDate')}</TableHead>
                  <TableHead>{t('memberCards.status')}</TableHead>
                  <TableHead>{t('memberCards.printCount')}</TableHead>
                  <TableHead className="text-right">{t('memberCards.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map((card: MemberCard) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedMemberIds.includes(card.memberId)}
                        onCheckedChange={() => toggleMemberSelection(card.memberId)}
                      />
                    </TableCell>
                    <TableCell>{card.cardNumber}</TableCell>
                    <TableCell>{getMemberName(card.memberId)}</TableCell>
                    <TableCell>{formatDate(card.issueDate)}</TableCell>
                    <TableCell>{formatDate(card.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge className={statusColor[card.status]}>
                        {card.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{card.printedCount}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t('memberCards.openMenu')}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCardForm(card.memberId)}>
                            {t('memberCards.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadCardPDF(card.id)}>
                            {t('memberCards.downloadPDF')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmDelete(card)}>
                            {t('memberCards.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Batch card generation dialog */}
      <Dialog open={isGeneratingCards} onOpenChange={setIsGeneratingCards}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('memberCards.generateMemberCards')}</DialogTitle>
            <DialogDescription>
              {t('memberCards.selectMembersForCards')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoadingMembers ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              members.map((member: Member) => (
                <div key={member.id} className="flex items-center space-x-2 py-2 border-b">
                  <Checkbox 
                    id={`member-${member.id}`}
                    checked={selectedMemberIds.includes(member.id)}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                  />
                  <Label htmlFor={`member-${member.id}`} className="flex-1">
                    {member.firstName} {member.lastName}
                  </Label>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratingCards(false)}>
              {t('memberCards.cancel')}
            </Button>
            <Button 
              onClick={generateBatchCards}
              disabled={selectedMemberIds.length === 0 || batchGenerateMutation.isPending}
            >
              {batchGenerateMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {t('memberCards.generateSelected')} ({selectedMemberIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card form dialog */}
      {isCardFormOpen && (
        <MemberCardForm 
          memberId={currentMemberId || undefined}
          onClose={() => setIsCardFormOpen(false)}
          onSuccess={() => {
            setIsCardFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ['/api/member-cards'] });
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('memberCards.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('memberCards.confirmDeleteCardMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('memberCards.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCard}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {t('memberCards.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Federation card generation dialog */}
      <Dialog open={isFederationDialogOpen} onOpenChange={setIsFederationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('memberCards.generateFederationCards')}</DialogTitle>
            <DialogDescription>
              {t('memberCards.selectFederationForCards')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {isLoadingFederations ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Select value={selectedFederation} onValueChange={setSelectedFederation}>
                <SelectTrigger>
                  <SelectValue placeholder={t('memberCards.selectFederation')} />
                </SelectTrigger>
                <SelectContent>
                  {federations.map((federation: any) => (
                    <SelectItem key={federation.id} value={federation.name}>
                      {federation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFederationDialogOpen(false)}>
              {t('memberCards.cancel')}
            </Button>
            <Button 
              onClick={generateFederationCards}
              disabled={!selectedFederation || federationBatchGenerateMutation.isPending}
            >
              {federationBatchGenerateMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {t('memberCards.generateForFederation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}