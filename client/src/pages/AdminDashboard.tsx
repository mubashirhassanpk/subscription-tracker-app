import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, CreditCard, Activity, Settings, UserCheck, AlertCircle, Bell, Key, Search, Edit, UserPlus, Eye } from 'lucide-react';
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
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: activityLogs } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/admin/activity-logs'],
  });

  // Fetch users for the users tab
  const { data: usersData, isLoading: isUsersLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users', { search: searchTerm, limit: 10 }],
    queryFn: () => 
      fetch(`/api/admin/users?limit=10${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`).then(res => res.json())
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
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
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
                <CardContent className="space-y-2">
                  <Link href="/admin/users/create">
                    <Button className="w-full justify-start" variant="outline" data-testid="button-create-user">
                      <Users className="mr-2 h-4 w-4" />
                      Create New User
                    </Button>
                  </Link>
                  <Link href="/admin/settings">
                    <Button className="w-full justify-start" variant="outline" data-testid="button-settings">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Button>
                  </Link>
                  <Link href="/admin/notifications">
                    <Button className="w-full justify-start" variant="outline" data-testid="button-notifications">
                      <Bell className="mr-2 h-4 w-4" />
                      Send Notifications
                    </Button>
                  </Link>
                  <Link href="/admin/api-keys">
                    <Button className="w-full justify-start" variant="outline" data-testid="button-api-keys">
                      <Key className="mr-2 h-4 w-4" />
                      Manage API Keys
                    </Button>
                  </Link>
                  <Button className="w-full justify-start" variant="outline" data-testid="button-impersonate">
                    <UserCheck className="mr-2 h-4 w-4" />
                    User Impersonation
                  </Button>
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
                      <Button size="sm" data-testid="button-create-user">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User
                      </Button>
                    </Link>
                    <Link href="/admin/users">
                      <Button size="sm" variant="outline" data-testid="button-full-management">
                        <Settings className="h-4 w-4 mr-2" />
                        Full Management
                      </Button>
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
                                  <Link href={`/admin/users/${user.id}`}>
                                    <Button size="sm" variant="ghost" data-testid={`button-view-${user.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
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
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>View and manage all user subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Subscription Management</h3>
                  <p className="text-muted-foreground">Complete subscription oversight and management...</p>
                  <Link href="/admin/subscriptions">
                    <Button className="mt-4" data-testid="button-manage-subscriptions">
                      Go to Subscription Management
                    </Button>
                  </Link>
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
    </div>
  );
}