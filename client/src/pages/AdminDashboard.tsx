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
import { Users, CreditCard, Activity, Settings, UserCheck, AlertCircle, Bell, Key, Search, Edit, UserPlus, Eye, Plus, ExternalLink, User, Copy } from 'lucide-react';
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
  recentUserPlans?: {
    id: string;
    name: string;
    email: string;
    planId: string;
    subscriptionStatus: string;
    createdAt: string;
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
                                    onClick={() => {
                                      setSelectedUserForDetails(user);
                                      setIsUserDetailsOpen(true);
                                    }}
                                    data-testid={`button-edit-${user.id}`}
                                  >
                                    <Settings className="h-4 w-4" />
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
                  
                  {dashboardData?.recentUserPlans && dashboardData.recentUserPlans.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Plan ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboardData.recentUserPlans.map((userPlan) => (
                            <TableRow key={userPlan.id}>
                              <TableCell className="font-medium">
                                {userPlan.name}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {userPlan.email}
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {userPlan.planId?.slice(0, 8)}...
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={userPlan.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                                  data-testid={`status-${userPlan.subscriptionStatus}`}
                                >
                                  {userPlan.subscriptionStatus}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(userPlan.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Link href="/admin/users">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`button-view-user-${userPlan.id}`}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
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

      {/* Comprehensive User Management Dialog */}
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
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6 gap-1 h-auto p-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center space-x-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="subscription" 
                className="flex items-center space-x-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
              >
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Subscription</span>
              </TabsTrigger>
              <TabsTrigger 
                value="permissions" 
                className="flex items-center space-x-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Permissions</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="flex items-center space-x-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger 
                value="api-keys" 
                className="flex items-center space-x-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
              >
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center space-x-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Account Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Account Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetailsData?.data?.user && (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">User ID</Label>
                            <div className="text-sm font-mono text-foreground">
                              {userDetailsData.data.user.id}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(userDetailsData.data.user.id)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                              <div className="text-sm font-medium">{userDetailsData.data.user.email}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Role</Label>
                              <div className="mt-1">
                                <Badge variant={userDetailsData.data.user.role === 'admin' ? 'default' : 'secondary'}>
                                  {userDetailsData.data.user.role}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                              <div className="mt-1">
                                <Badge variant={userDetailsData.data.user.isActive ? 'default' : 'destructive'}>
                                  {userDetailsData.data.user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Created</Label>
                              <div className="text-sm">
                                {new Date(userDetailsData.data.user.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</Label>
                              <div className="text-sm">
                                {userDetailsData.data.user.lastLoginAt 
                                  ? new Date(userDetailsData.data.user.lastLoginAt).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })
                                  : 'Never'
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>Quick Actions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-12"
                        data-testid="action-edit-user"
                      >
                        <Edit className="mr-3 h-4 w-4" />
                        <span>Edit User Details</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-12"
                        onClick={() => {
                          if (selectedUserForDetails) {
                            impersonateMutation.mutate(selectedUserForDetails.id);
                            setIsUserDetailsOpen(false);
                          }
                        }}
                        disabled={impersonateMutation.isPending}
                        data-testid="action-impersonate"
                      >
                        <UserCheck className="mr-3 h-4 w-4" />
                        <span>Impersonate User</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-12"
                        data-testid="action-view-logs"
                      >
                        <Activity className="mr-3 h-4 w-4" />
                        <span>View Activity Logs</span>
                      </Button>
                      
                      <div className="pt-2 border-t">
                        <Button 
                          variant="destructive" 
                          className="w-full justify-start h-12"
                          data-testid="action-delete-user"
                        >
                          <AlertCircle className="mr-3 h-4 w-4" />
                          <span>Delete User</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Subscription Management</span>
                  </CardTitle>
                  <CardDescription>
                    Manage user's subscription plan and billing status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userDetailsData?.data?.user && (
                    <div className="space-y-6">
                      {/* Current Subscription Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Current Plan</Label>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            {userDetailsData.data.user.planId ? (
                              <div className="space-y-2">
                                <Badge variant="default">Plan Assigned</Badge>
                                <div className="text-sm text-muted-foreground">
                                  Plan ID: {userDetailsData.data.user.planId}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Badge variant="secondary">No Plan</Badge>
                                <div className="text-sm text-muted-foreground">
                                  User has no assigned plan
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Status</Label>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <Badge 
                              variant={userDetailsData.data.user.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                              className="mb-2"
                            >
                              {userDetailsData.data.user.subscriptionStatus || 'active'}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              {userDetailsData.data.user.subscriptionStatus === 'active' ? 
                                'Subscription is currently active' : 
                                'Subscription requires attention'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Plan Management */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-medium mb-4">Update Subscription</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Assign New Plan</Label>
                            <Select value={userDetailsData.data.user.planId || 'no_plan'}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select a plan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no_plan">No Plan</SelectItem>
                                {plansData?.map((plan: any) => (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.name} - ${plan.price}/{plan.billingInterval}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Subscription Status</Label>
                            <Select value={userDetailsData.data.user.subscriptionStatus || 'active'}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-6">
                          <Button variant="outline">Cancel</Button>
                          <Button>Save Changes</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>User Permissions</span>
                  </CardTitle>
                  <CardDescription>
                    Manage user access permissions and feature access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Role & Access</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">Admin Access</div>
                              <div className="text-sm text-muted-foreground">Full system administration</div>
                            </div>
                            <Badge variant={userDetailsData?.data?.user?.role === 'admin' ? 'default' : 'secondary'}>
                              {userDetailsData?.data?.user?.role === 'admin' ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">Dashboard Access</div>
                              <div className="text-sm text-muted-foreground">User dashboard and analytics</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">API Access</div>
                              <div className="text-sm text-muted-foreground">REST API and integrations</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Feature Access</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">Subscription Management</div>
                              <div className="text-sm text-muted-foreground">Manage subscriptions</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">Notifications</div>
                              <div className="text-sm text-muted-foreground">Email and app notifications</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">Calendar Integration</div>
                              <div className="text-sm text-muted-foreground">Google Calendar sync</div>
                            </div>
                            <Badge variant="secondary">Limited</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Configure notification preferences for this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Email Notifications</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Subscription Reminders</div>
                              <div className="text-sm text-muted-foreground">7 days before renewal</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Payment Notifications</div>
                              <div className="text-sm text-muted-foreground">Success and failure alerts</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Weekly Summary</div>
                              <div className="text-sm text-muted-foreground">Activity digest</div>
                            </div>
                            <Badge variant="secondary">Disabled</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Other Channels</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">WhatsApp Notifications</div>
                              <div className="text-sm text-muted-foreground">Important updates only</div>
                            </div>
                            <Badge variant="secondary">Disabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Calendar Events</div>
                              <div className="text-sm text-muted-foreground">Google Calendar sync</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Browser Push</div>
                              <div className="text-sm text-muted-foreground">Real-time alerts</div>
                            </div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>API Keys</span>
                  </CardTitle>
                  <CardDescription>
                    Manage API keys for this user account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">Active API Keys</h4>
                        <p className="text-sm text-muted-foreground">API keys for external integrations</p>
                      </div>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Generate New Key
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium">Production API Key</div>
                          <div className="text-sm text-muted-foreground font-mono">sk_prod_••••••••••••3a2f</div>
                          <div className="text-xs text-muted-foreground">Created: Sep 15, 2025 • Last used: 2 hours ago</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="default">Active</Badge>
                          <Button variant="ghost" size="sm">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium">Development API Key</div>
                          <div className="text-sm text-muted-foreground font-mono">sk_dev_••••••••••••8b4d</div>
                          <div className="text-xs text-muted-foreground">Created: Sep 10, 2025 • Last used: Never</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">Inactive</Badge>
                          <Button variant="ghost" size="sm">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3">API Usage Limits</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">1,245</div>
                          <div className="text-sm text-muted-foreground">Requests Today</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">5,000</div>
                          <div className="text-sm text-muted-foreground">Daily Limit</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">24.9%</div>
                          <div className="text-sm text-muted-foreground">Usage</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>User Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    View usage statistics and analytics for this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">42</div>
                        <div className="text-sm text-muted-foreground">Total Logins</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">7</div>
                        <div className="text-sm text-muted-foreground">Subscriptions</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">156</div>
                        <div className="text-sm text-muted-foreground">API Calls</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">23d</div>
                        <div className="text-sm text-muted-foreground">Account Age</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Recent Activity</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">Dashboard Login</div>
                              <div className="text-sm text-muted-foreground">2 hours ago</div>
                            </div>
                            <Badge variant="outline">Login</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">Subscription Updated</div>
                              <div className="text-sm text-muted-foreground">1 day ago</div>
                            </div>
                            <Badge variant="outline">Update</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">API Key Generated</div>
                              <div className="text-sm text-muted-foreground">3 days ago</div>
                            </div>
                            <Badge variant="outline">API</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Usage Trends</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>API Usage</span>
                              <span>67%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{width: '67%'}}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Dashboard Activity</span>
                              <span>89%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{width: '89%'}}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Feature Usage</span>
                              <span>34%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-orange-500 h-2 rounded-full" style={{width: '34%'}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
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