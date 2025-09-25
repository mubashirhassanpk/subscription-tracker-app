import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CreditCard, Activity, Settings, UserCheck, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';

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

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: activityLogs } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/admin/activity-logs'],
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
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">User Management Interface</h3>
                  <p className="text-muted-foreground">Full user management interface coming up next...</p>
                  <Link href="/admin/users">
                    <Button className="mt-4" data-testid="button-manage-users">
                      Go to User Management
                    </Button>
                  </Link>
                </div>
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