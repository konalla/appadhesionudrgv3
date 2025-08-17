import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Pencil, Trash2, Search, Eye } from "lucide-react";
import AdminForm from "./AdminForm";
import { useTranslation } from "react-i18next";

export default function AdminList() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<any>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch admin users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Delete admin mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/users/${userId}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('admins.successDelete'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      // Check for specific error message about System Admin access required
      if (error.message && error.message.includes("System Admin access required")) {
        toast({
          title: t('common.error'),
          description: t('admins.sysAdminRequired'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: error.message || t('admins.errorDelete'),
          variant: "destructive",
        });
      }
    },
  });

  // Handle delete
  const handleDelete = () => {
    if (deleteUserId) {
      deleteMutation.mutate(deleteUserId);
    }
  };

  // Filter users by search term
  const filteredUsers = Array.isArray(users) ? users.filter((user: any) => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  }) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-primary">{t('admins.adminUsers')}</h2>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-blue-700 text-white font-bold px-6 py-2 text-md shadow-lg rounded-md">
              <UserPlus className="h-5 w-5 mr-2" />
              {t('admins.addAdmin')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{t('admins.addAdminUser')}</DialogTitle>
            </DialogHeader>
            <AdminForm onSuccess={() => setAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder={t('admins.searchAdminUsers')}
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Admin Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">{t('admins.adminUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admins.name')}</TableHead>
                    <TableHead>{t('admins.username')}</TableHead>
                    <TableHead>{t('admins.email')}</TableHead>
                    <TableHead>{t('admins.form.phone') || 'Téléphone'}</TableHead>
                    <TableHead>{t('admins.role')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {t('admins.noAdminUsers')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.role === 'system_admin'
                              ? 'bg-red-100 text-red-800'
                              : user.role === 'sysadmin' 
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'system_admin' 
                              ? t('admins.roles.system_admin') 
                              : user.role === 'sysadmin' 
                                ? t('admins.roles.sysadmin') 
                                : t('admins.roles.admin')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-1">
                          <Dialog open={viewDialogOpen && viewUser?.id === user.id} onOpenChange={(open) => {
                            setViewDialogOpen(open);
                            if (!open) setViewUser(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-blue-500 hover:text-blue-700"
                                onClick={() => {
                                  setViewUser(user);
                                  setViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>{t('admins.viewAdminUser')}</DialogTitle>
                              </DialogHeader>
                              {viewUser && (
                                <div className="space-y-4 py-4">
                                  {/* Photo de profil (si disponible) */}
                                  {viewUser.photoId && (
                                    <div className="flex justify-center mb-4">
                                      <div className="relative w-32 h-32 overflow-hidden rounded-md border border-gray-300">
                                        <img 
                                          src={viewUser.photoId} 
                                          alt={t('admins.form.photoAlt') || 'Photo de profil'} 
                                          className="object-cover w-full h-full"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                
                                  <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <div className="font-semibold">{t('admins.name')}:</div>
                                    <div>{viewUser.name}</div>
                                    
                                    <div className="font-semibold">{t('admins.username')}:</div>
                                    <div>{viewUser.username}</div>
                                    
                                    <div className="font-semibold">{t('admins.email')}:</div>
                                    <div>{viewUser.email}</div>
                                    
                                    <div className="font-semibold">{t('admins.form.phone') || 'Téléphone'}:</div>
                                    <div>{viewUser.phone || '-'}</div>
                                    
                                    <div className="font-semibold">{t('admins.form.address') || 'Adresse'}:</div>
                                    <div>{viewUser.address || '-'}</div>
                                    
                                    <div className="font-semibold">{t('admins.role')}:</div>
                                    <div>
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        viewUser.role === 'system_admin'
                                          ? 'bg-red-100 text-red-800'
                                          : viewUser.role === 'sysadmin' 
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {viewUser.role === 'system_admin' 
                                          ? t('admins.roles.system_admin') 
                                          : viewUser.role === 'sysadmin' 
                                            ? t('admins.roles.sysadmin') 
                                            : t('admins.roles.admin')}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="pt-4 flex justify-end">
                                    <Button 
                                      onClick={() => setViewDialogOpen(false)}
                                      variant="outline"
                                    >
                                      {i18n.language === 'fr' ? 'Fermer' : 'Close'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Dialog open={editDialogOpen && editUser?.id === user.id} onOpenChange={(open) => {
                            setEditDialogOpen(open);
                            if (!open) setEditUser(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditUser(user);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[550px]">
                              <DialogHeader>
                                <DialogTitle>{t('admins.editAdminUser')}</DialogTitle>
                              </DialogHeader>
                              {editUser && (
                                <AdminForm 
                                  userId={editUser.id} 
                                  defaultValues={editUser} 
                                  isEdit={true} 
                                  onSuccess={() => {
                                    setEditDialogOpen(false);
                                    setEditUser(null);
                                  }} 
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <AlertDialog open={deleteDialogOpen && deleteUserId === user.id} onOpenChange={(open) => {
                            setDeleteDialogOpen(open);
                            if (!open) setDeleteUserId(null);
                          }}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700"
                                onClick={() => {
                                  setDeleteUserId(user.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('admins.deleteAdminUser')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('admins.confirmDeleteUser')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{i18n.language === 'fr' ? 'Annuler' : 'Cancel'}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleDelete}
                                  className="bg-red-500 hover:bg-red-700 text-white"
                                >
                                  {i18n.language === 'fr' ? 'Supprimer' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
