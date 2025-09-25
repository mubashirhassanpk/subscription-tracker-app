import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CreditCard, Activity, Settings, UserCheck, AlertCircle, Bell, Key, Search, Edit, UserPlus, Eye, Plus } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  recentActivity: {
    action: string;
    createdAt: string;
    adminUserName: string;
  }[];
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

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateSubscriptionOpen, setIsCreateSubscriptionOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [userPlanFormData, setUserPlanFormData] = useState({
    userId: '',
    planId: '',
    subscriptionStatus: 'active'
  });
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: activityLogs } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/admin/activity-logs'],
  });

  // Fetch available plans for assignment
  const { data: plansData } = useQuery({
    queryKey: ['/api/plans'],
    queryFn: () => 
      fetch('/api/plans', {
        credentials: 'include'
      }).then(res => {
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
  });

  // Fetch users for the users tab
  const { data: usersData, isLoading: isUsersLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users', { search: searchTerm, limit: 10 }],
    queryFn: () => 
      fetch(`/api/admin/users?limit=10${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`, {
        credentials: 'include'
      }).then(res => {
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
  });

  // Fetch user details when selected
  const { data: userDetailsData } = useQuery({
    queryKey: ['/api/admin/users', selectedUserForDetails?.id, 'details'],
    queryFn: () => 
      fetch(`/api/admin/users/${selectedUserForDetails?.id}/details`, {
        credentials: 'include'
      }).then(res => {
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      }),
    enabled: !!selectedUserForDetails
  });

  // Impersonation mutation
  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => 
      fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
        credentials: 'include'
      }).then(res => {
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      }),
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

  // Assign user plan mutation
  const assignUserPlanMutation = useMutation({
    mutationFn: (planData: typeof userPlanFormData) =>
      fetch(`/api/admin/users/${planData.userId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: planData.planId,
          subscriptionStatus: planData.subscriptionStatus
        })
      }).then(res => {
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      }),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userPlanFormData.userId, 'details'] });
        setIsCreateSubscriptionOpen(false);
        setUserPlanFormData({
          userId: '',
          planId: '',
          subscriptionStatus: 'active'
        });
        toast({
          title: 'Success',
          description: 'User plan assigned successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to assign user plan',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign user plan',
        variant: 'destructive'
      });
    }
  });

  const handleAssignUserPlan = () => {
    if (!userPlanFormData.userId || !userPlanFormData.planId) {
      toast({
        title: 'Error',
        description: 'Please select both a user and a plan',
        variant: 'destructive'
      });
      return;
    }
    assignUserPlanMutation.mutate(userPlanFormData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-dashboard">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const dashboardData = stats?.data;

  return (
    <div className="min-h-screen bg-background" data-testid="admin-dashboard">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <div className="ml-auto flex items-center space-x-4">
            <Badge variant="secondary">Super Admin</Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="stats-total-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.activeUsers || 0} active users
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stats-total-subscriptions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalSubscriptions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.activeSubscriptions || 0} active
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stats-activity">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.recentActivity?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Admin actions today
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stats-alerts">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <AlertCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Healthy</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList data-testid="admin-nav-tabs">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Plans</TabsTrigger>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common admin tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/admin/users/create" className="block">
                    <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-create-user">
                      <Users className="mr-3 h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Create New User</span>
                    </div>
                  </Link>
                  <Link href="/admin/settings" className="block">
                    <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-settings">
                      <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">System Settings</span>
                    </div>
                  </Link>
                  <Link href="/admin/notifications" className="block">
                    <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-notifications">
                      <Bell className="mr-3 h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Send Notifications</span>
                    </div>
                  </Link>
                  <Link href="/admin/api-keys" className="block">
                    <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-api-keys">
                      <Key className="mr-3 h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Manage API Keys</span>
                    </div>
                  </Link>
                  <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-impersonate">
                    <UserCheck className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">User Impersonation</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Admin Activity</CardTitle>
                  <CardDescription>Latest actions by administrators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2" data-testid="recent-activity-list">
                    {dashboardData?.recentActivity?.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Badge variant="outline">{activity.action}</Badge>
                        <span className="text-muted-foreground">by {activity.adminUserName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(activity.createdAt).toLocaleString()}
                        </span>
                      </div>
                    )) || (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>User Management</span>
                  <div className="flex items-center space-x-2">
                    <Link href="/admin/users/create">
                      <div className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-create-user">
                        <UserPlus className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Create User</span>
                      </div>
                    </Link>
                    <Link href="/admin/users">
                      <div className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-full-management">
                        <Settings className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Full Management</span>
                      </div>
                    </Link>
                  </div>
                </CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1 max-w-sm">
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

                {/* Users Table */}
                {isUsersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subscriptions</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData?.data?.users && usersData.data.users.length > 0 ? (
                          usersData.data.users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                                    {user.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                                    {user.email}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} data-testid={`badge-role-${user.id}`}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.isActive ? 'default' : 'destructive'} data-testid={`badge-status-${user.id}`}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`text-subscription-count-${user.id}`}>
                                <div className="flex items-center">
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  {user.subscriptionCount || 0}
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-last-login-${user.id}`}>
                                {user.lastLoginAt 
                                  ? new Date(user.lastLoginAt).toLocaleDateString()
                                  : 'Never'
                                }
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => {
                                      setSelectedUserForDetails(user);
                                      setIsUserDetailsOpen(true);
                                    }}
                                    data-testid={`button-view-${user.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => impersonateMutation.mutate(user.id)}
                                    disabled={impersonateMutation.isPending}
                                    data-testid={`button-impersonate-${user.id}`}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="text-muted-foreground">
                                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Show total count if there are more users */}
                {usersData?.data?.pagination && usersData.data.pagination.total > 10 && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Showing 10 of {usersData.data.pagination.total} users.{' '}
                    <Link href="/admin/users">
                      <Button variant="ghost" className="h-auto p-0 text-sm underline">
                        View all users
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Plan Management</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => setIsCreateSubscriptionOpen(true)}
                      data-testid="button-create-subscription"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Add User Plan</span>
                    </div>
                    <Link href="/admin/subscriptions">
                      <div className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid="button-full-subscription-management">
                        <Settings className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Full Management</span>
                      </div>
                    </Link>
                  </div>
                </CardTitle>
                <CardDescription>Manage user plans - purchased subscriptions and trials</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Plan Management Stats */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">Total User Plans</div>
                      <div className="text-2xl font-bold" data-testid="stat-total-subscriptions">
                        {dashboardData?.totalSubscriptions || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm font-medium">Active Plans</div>
                      <div className="text-2xl font-bold" data-testid="stat-active-subscriptions">
                        {dashboardData?.activeSubscriptions || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-sm font-medium">Monthly Revenue</div>
                      <div className="text-2xl font-bold">$0.00</div>
                    </div>
                  </div>
                </div>

                {/* Recent User Plans */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Recent User Plans</h4>
                  
                  {dashboardData?.totalSubscriptions && dashboardData.totalSubscriptions > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Next Billing</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="text-muted-foreground">
                                No user plans found. Click "Add User Plan" to assign one.
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-lg">
                      <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">No User Plans Yet</h3>
                      <p className="text-muted-foreground mb-4">Start by assigning the first plan to a user.</p>
                      <div 
                        className="inline-flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => setIsCreateSubscriptionOpen(true)}
                        data-testid="button-add-first-subscription"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="font-medium">Add First User Plan</span>
                      </div>
                    </div>
                  )}

                  {/* Link to full management if there are subscriptions */}
                  {dashboardData?.totalSubscriptions && dashboardData.totalSubscriptions > 0 && (
                    <div className="text-center">
                      <Link href="/admin/subscriptions">
                        <Button variant="ghost" className="text-sm underline">
                          View all {dashboardData.totalSubscriptions} subscriptions
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Admin Activity Logs</CardTitle>
                <CardDescription>Audit trail of all administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="activity-logs">
                  {activityLogs?.data?.logs?.map((log: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <Badge variant="outline">{log.action}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          By {log.adminUserName} • {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.ipAddress}
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No activity logs available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Details Dialog */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about {selectedUserForDetails?.name}
            </DialogDescription>
          </DialogHeader>
          {userDetailsData?.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <div className="mt-1 text-sm">{userDetailsData.data.name}</div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="mt-1 text-sm">{userDetailsData.data.email}</div>
                </div>
                <div>
                  <Label>Role</Label>
                  <div className="mt-1">
                    <Badge variant={userDetailsData.data.role === 'admin' ? 'default' : 'secondary'}>
                      {userDetailsData.data.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={userDetailsData.data.isActive ? 'default' : 'destructive'}>
                      {userDetailsData.data.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Subscriptions</Label>
                  <div className="mt-1 text-sm flex items-center">
                    <CreditCard className="h-4 w-4 mr-1" />
                    {userDetailsData.data.subscriptionCount || 0}
                  </div>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <div className="mt-1 text-sm">
                    {userDetailsData.data.lastLoginAt 
                      ? new Date(userDetailsData.data.lastLoginAt).toLocaleString()
                      : 'Never'
                    }
                  </div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div className="mt-1 text-sm">
                    {new Date(userDetailsData.data.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label>Plan</Label>
                  <div className="mt-1 text-sm">
                    {userDetailsData.data.planId || 'No plan assigned'}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <Link href="/admin/users">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Full Management
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    if (selectedUserForDetails) {
                      impersonateMutation.mutate(selectedUserForDetails.id);
                      setIsUserDetailsOpen(false);
                    }
                  }}
                  disabled={impersonateMutation.isPending}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Impersonate User
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Plan Dialog */}
      <Dialog open={isCreateSubscriptionOpen} onOpenChange={setIsCreateSubscriptionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User Plan</DialogTitle>
            <DialogDescription>
              Assign a plan to a user (purchased subscription or trial)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="user">Select User *</Label>
                <Select 
                  value={userPlanFormData.userId} 
                  onValueChange={(value) => setUserPlanFormData(prev => ({ ...prev, userId: value }))}
                >
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Choose a user to assign plan to" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersData?.data?.users?.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="plan">Select Plan *</Label>
                <Select 
                  value={userPlanFormData.planId} 
                  onValueChange={(value) => setUserPlanFormData(prev => ({ ...prev, planId: value }))}
                >
                  <SelectTrigger data-testid="select-plan">
                    <SelectValue placeholder="Choose a plan to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {plansData?.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price}/{plan.billingInterval}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Subscription Status</Label>
                <Select 
                  value={userPlanFormData.subscriptionStatus} 
                  onValueChange={(value) => setUserPlanFormData(prev => ({ ...prev, subscriptionStatus: value }))}
                >
                  <SelectTrigger data-testid="select-subscription-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateSubscriptionOpen(false)}
              data-testid="button-cancel-subscription"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignUserPlan}
              disabled={assignUserPlanMutation.isPending}
              data-testid="button-assign-plan"
            >
              {assignUserPlanMutation.isPending ? 'Assigning...' : 'Assign Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}