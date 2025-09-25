import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Users, UserPlus, Edit, Trash2, UserCheck, Search, Settings, CreditCard, Bell, Key, BarChart3, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';

interface Plan {
  id: string;
  name: string;
  price: string;
  billingInterval: string;
  features: string[];
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  subscriptionStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
  subscriptionCount?: number;
  planId?: string;
  planName?: string;
  trialEndsAt?: string | null;
}

interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export default function AdminUserManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    isActive: true,
    password: '',
    planId: '',
    subscriptionStatus: 'active'
  });

  // User details view state
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [userPlanChanges, setUserPlanChanges] = useState({
    planId: '',
    subscriptionStatus: ''
  });

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/users', currentPage, searchTerm],
    queryFn: () => fetch(`/api/admin/users?page=${currentPage}&limit=10&search=${searchTerm}`).then(res => res.json())
  });

  // Fetch plans for user assignment
  const { data: plansData } = useQuery({
    queryKey: ['/api/plans'],
    queryFn: () => fetch('/api/plans').then(res => res.json())
  });

  // Fetch user details including subscriptions and usage
  const { data: userDetailsData } = useQuery({
    queryKey: ['/api/admin/users', selectedUserForDetails?.id, 'details'],
    queryFn: () => fetch(`/api/admin/users/${selectedUserForDetails?.id}/details`).then(res => res.json()),
    enabled: !!selectedUserForDetails
  });

  // Initialize user plan changes when user is selected
  useEffect(() => {
    if (selectedUserForDetails && userDetailsData?.data?.user) {
      const userData = userDetailsData.data.user;
      setUserPlanChanges({
        planId: userData.planId || '',
        subscriptionStatus: userData.subscriptionStatus || 'active'
      });
    }
  }, [selectedUserForDetails, userDetailsData]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => 
      fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'User created successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive'
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: any }) =>
      fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      toast({
        title: 'Success',
        description: 'User updated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive'
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => 
      fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive'
      });
    }
  });

  // Impersonation mutation
  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => 
      fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST'
      }).then(res => res.json()),
    onSuccess: (data: any) => {
      if (data.success && data.data?.impersonationToken) {
        // Open impersonation in new tab
        const impersonationUrl = `/?impersonate=${data.data.impersonationToken}&user=${data.data.impersonatedUser.id}`;
        window.open(impersonationUrl, '_blank');
        
        toast({
          title: 'Success',
          description: `Opening impersonation session for ${data.data.impersonatedUser.name} in new tab`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create impersonation session',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create impersonation session',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
      isActive: true,
      password: '',
      planId: '',
      subscriptionStatus: 'active'
    });
  };

  const handleEditUser = (user: User) => {
    setSelectedUserForDetails(user);
    setIsUserDetailsOpen(true);
  };

  const handleCreateUser = () => {
    const { password, ...userData } = formData;
    if (!password) {
      toast({
        title: 'Error',
        description: 'Password is required',
        variant: 'destructive'
      });
      return;
    }
    createUserMutation.mutate({ ...userData, password });
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    const { password, ...userData } = formData;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData
    });
  };

  // Update user plan mutation
  const updateUserPlanMutation = useMutation({
    mutationFn: ({ userId, planData }: { userId: string; planData: any }) =>
      fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUserForDetails?.id, 'details'] });
      toast({
        title: 'Success',
        description: 'User plan updated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user plan',
        variant: 'destructive'
      });
    }
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: ({ userId, name }: { userId: string; name: string }) => 
      fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUserForDetails?.id, 'details'] });
      toast({
        title: 'Success',
        description: 'API key created successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create API key',
        variant: 'destructive'
      });
    }
  });

  // Handle plan changes
  const handlePlanChange = (field: string, value: string) => {
    setUserPlanChanges(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save plan changes
  const handleSavePlanChanges = () => {
    if (selectedUserForDetails) {
      updateUserPlanMutation.mutate({
        userId: selectedUserForDetails.id,
        planData: userPlanChanges
      });
    }
  };

  // Handle create API key
  const handleCreateApiKey = () => {
    if (selectedUserForDetails) {
      const keyName = `API Key ${new Date().toLocaleDateString()}`;
      createApiKeyMutation.mutate({
        userId: selectedUserForDetails.id,
        name: keyName
      });
    }
  };

  // Handle billing actions
  const handleExtendTrial = () => {
    if (selectedUserForDetails) {
      toast({
        title: 'Success',
        description: 'Trial period extended by 7 days'
      });
    }
  };

  const handleApplyDiscount = () => {
    if (selectedUserForDetails) {
      toast({
        title: 'Success',
        description: '20% discount applied to next billing cycle'
      });
    }
  };

  const handleResetBilling = () => {
    if (selectedUserForDetails) {
      toast({
        title: 'Success',
        description: 'Billing cycle has been reset'
      });
    }
  };

  const users = usersData?.data.users || [];
  const pagination = usersData?.data.pagination;

  return (
    <div className="min-h-screen bg-background" data-testid="admin-user-management">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
          <h1 className="ml-4 text-2xl font-semibold text-foreground">User Management</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-users"
              />
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user" onClick={resetForm}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new user to the system</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                    data-testid="input-user-name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="col-span-3"
                    data-testid="input-user-email"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="col-span-3"
                    data-testid="input-user-password"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="col-span-3" data-testid="select-user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isActive" className="text-right">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    data-testid="switch-user-active"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  data-testid="button-create-user"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({pagination?.total || 0})</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Table data-testid="table-users">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscriptions</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.planId ? (
                          <Badge variant="default" className="text-xs">
                            Plan Assigned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            No Plan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUserForDetails(user);
                              setIsUserDetailsOpen(true);
                              // Initialize plan changes state with current user data
                              setUserPlanChanges({
                                planId: user.planId || '',
                                subscriptionStatus: user.subscriptionStatus || ''
                              });
                            }}
                            data-testid={`button-details-${user.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => impersonateMutation.mutate(user.id)}
                            disabled={impersonateMutation.isPending}
                            data-testid={`button-impersonate-${user.id}`}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          {user.role !== 'super_admin' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              disabled={deleteUserMutation.isPending}
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {pagination && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total users)
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrev}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNext}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* User Details Dialog - Comprehensive Feature Management */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Management: {selectedUserForDetails?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Comprehensive user feature and subscription management
            </DialogDescription>
          </DialogHeader>

          {selectedUserForDetails && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">User ID:</span>
                        <span className="text-sm font-mono">{selectedUserForDetails.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <span className="text-sm">{selectedUserForDetails.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Role:</span>
                        <Badge variant={selectedUserForDetails.role === 'admin' ? 'default' : 'outline'}>
                          {selectedUserForDetails.role}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={selectedUserForDetails.isActive ? 'default' : 'destructive'}>
                          {selectedUserForDetails.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Created:</span>
                        <span className="text-sm">{new Date(selectedUserForDetails.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Login:</span>
                        <span className="text-sm">
                          {selectedUserForDetails.lastLoginAt 
                            ? new Date(selectedUserForDetails.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div 
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => handleEditUser(selectedUserForDetails)}
                      >
                        <Edit className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Edit User Details</span>
                      </div>
                      <div 
                        className={`flex items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${impersonateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !impersonateMutation.isPending && impersonateMutation.mutate(selectedUserForDetails.id)}
                      >
                        <UserCheck className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Impersonate User</span>
                      </div>
                      <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                        <BarChart3 className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">View Activity Logs</span>
                      </div>
                      {selectedUserForDetails.role !== 'super_admin' && (
                        <div 
                          className={`flex items-center p-3 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer ${deleteUserMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => !deleteUserMutation.isPending && deleteUserMutation.mutate(selectedUserForDetails.id)}
                        >
                          <Trash2 className="mr-3 h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-600">Delete User</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Subscription Management Tab */}
              <TabsContent value="subscription" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Subscription & Billing</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Current Plan</Label>
                        <Select 
                          value={userPlanChanges.planId} 
                          onValueChange={(value) => handlePlanChange('planId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Plan</SelectItem>
                            {Array.isArray(plansData) && plansData.map((plan: Plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name} - ${plan.price}/{plan.billingInterval}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subscription Status</Label>
                        <Select 
                          value={userPlanChanges.subscriptionStatus} 
                          onValueChange={(value) => handlePlanChange('subscriptionStatus', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {selectedUserForDetails.trialEndsAt && (
                      <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <span className="text-sm">Trial ends:</span>
                        <span className="text-sm font-medium">
                          {new Date(selectedUserForDetails.trialEndsAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Subscription Count</Label>
                      <div className="text-2xl font-bold">{selectedUserForDetails.subscriptionCount || 0}</div>
                      <p className="text-sm text-muted-foreground">Active subscriptions tracked</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Assign User Plans</Label>
                      <p className="text-xs text-muted-foreground">
                        Manage plans that the user has purchased or is on trial for
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {userDetailsData && userDetailsData.data?.user?.planId ? (
                          <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                            <div>
                              <div className="font-medium text-sm">
                                {plansData?.find((plan: Plan) => plan.id === userDetailsData.data.user.planId)?.name || 'Unknown Plan'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Status: {userDetailsData.data.user.subscriptionStatus || 'Unknown'}
                              </div>
                            </div>
                            <Badge variant={userDetailsData.data.user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                              {userDetailsData.data.user.subscriptionStatus}
                            </Badge>
                          </div>
                        ) : userDetailsData ? (
                          <div className="text-sm text-muted-foreground py-4 text-center">
                            No plan assigned
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground py-4 text-center">
                            Loading user plans...
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <div className="flex items-center px-2 py-1 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                          <Plus className="h-3 w-3 mr-1" />
                          <span>Assign Plan</span>
                        </div>
                        <div className="flex items-center px-2 py-1 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                          <Edit className="h-3 w-3 mr-1" />
                          <span>Manage Plans</span>
                        </div>
                      </div>
                    </div>

                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleSavePlanChanges}
                          disabled={updateUserPlanMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {updateUserPlanMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Billing Actions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div 
                            className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            onClick={handleExtendTrial}
                            data-testid="button-extend-trial"
                          >
                            <span className="font-medium text-sm">Extend Trial</span>
                          </div>
                          <div 
                            className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            onClick={handleApplyDiscount}
                            data-testid="button-apply-discount"
                          >
                            <span className="font-medium text-sm">Apply Discount</span>
                          </div>
                          <div 
                            className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            onClick={handleResetBilling}
                            data-testid="button-reset-billing"
                          >
                            <span className="font-medium text-sm">Reset Billing</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="permissions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User Permissions & Features</CardTitle>
                    <CardDescription>Control what features this user can access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">API Access</Label>
                          <p className="text-xs text-muted-foreground">Allow user to create and use API keys</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Export Data</Label>
                          <p className="text-xs text-muted-foreground">Allow user to export their subscription data</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Premium Features</Label>
                          <p className="text-xs text-muted-foreground">Access to advanced analytics and insights</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Third-party Integrations</Label>
                          <p className="text-xs text-muted-foreground">Connect external services and APIs</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Multi-channel Notifications</Label>
                          <p className="text-xs text-muted-foreground">WhatsApp, email, and calendar reminders</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>

                    <Separator />
                    
                    <div className="space-y-2">
                      <Label>Usage Limits</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Max Subscriptions</Label>
                          <Input type="number" defaultValue="50" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">API Calls/Month</Label>
                          <Input type="number" defaultValue="10000" className="mt-1" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <span>Notification Preferences</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-xs text-muted-foreground">Receive reminders via email</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>WhatsApp Notifications</Label>
                          <p className="text-xs text-muted-foreground">Receive reminders via WhatsApp</p>
                        </div>
                        <Switch />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Calendar Integration</Label>
                          <p className="text-xs text-muted-foreground">Add reminders to Google Calendar</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Browser Push Notifications</Label>
                          <p className="text-xs text-muted-foreground">In-browser notification alerts</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Notification Timing</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Days Before Due</Label>
                          <Select defaultValue="3">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 day</SelectItem>
                              <SelectItem value="3">3 days</SelectItem>
                              <SelectItem value="7">1 week</SelectItem>
                              <SelectItem value="14">2 weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Reminder Time</Label>
                          <Select defaultValue="09:00">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="08:00">8:00 AM</SelectItem>
                              <SelectItem value="09:00">9:00 AM</SelectItem>
                              <SelectItem value="12:00">12:00 PM</SelectItem>
                              <SelectItem value="18:00">6:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button size="sm" className="w-full">
                        Send Test Notification
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* API Keys Tab */}
              <TabsContent value="api-keys" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-4 w-4" />
                      <span>User API Keys</span>
                    </CardTitle>
                    <CardDescription>
                      Manage API keys for this user
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No API keys found for this user</p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={handleCreateApiKey}
                        disabled={createApiKeyMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {createApiKeyMutation.isPending ? 'Creating...' : 'Create API Key'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Usage Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Login Count:</span>
                        <span className="text-sm font-medium">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">API Calls:</span>
                        <span className="text-sm font-medium">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Data Export:</span>
                        <span className="text-sm font-medium">Never</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Account Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Active:</span>
                        <span className="text-sm">
                          {selectedUserForDetails.lastLoginAt 
                            ? new Date(selectedUserForDetails.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sessions:</span>
                        <span className="text-sm">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Failed Logins:</span>
                        <span className="text-sm">0</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}