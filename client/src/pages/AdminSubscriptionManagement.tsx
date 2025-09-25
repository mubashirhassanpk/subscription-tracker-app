import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Search, Eye, DollarSign, Calendar, Plus } from 'lucide-react';
import { Link } from 'wouter';

interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingCycle: string;
  category: string;
  nextBillingDate: string;
  isActive: number;
  paymentStatus: string;
  createdAt: string;
  userId: string;
  userEmail: string;
  userName: string;
}

interface SubscriptionsResponse {
  success: boolean;
  data: {
    subscriptions: Subscription[];
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

export default function AdminSubscriptionManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all subscriptions
  const { data: subscriptionsData, isLoading } = useQuery<SubscriptionsResponse>({
    queryKey: ['/api/admin/subscriptions', currentPage, searchTerm],
    queryFn: () => fetch(`/api/admin/subscriptions?page=${currentPage}&limit=10&search=${searchTerm}`).then(res => res.json())
  });

  const subscriptions = subscriptionsData?.data.subscriptions || [];
  const pagination = subscriptionsData?.data.pagination;

  // Calculate summary stats
  const totalMonthlyRevenue = subscriptions.reduce((sum, sub) => {
    if (!sub.isActive) return sum;
    const cost = parseFloat(sub.cost.toString()) || 0;
    switch (sub.billingCycle) {
      case 'yearly':
        return sum + (cost / 12);
      case 'weekly':
        return sum + (cost * 52 / 12);
      default: // monthly
        return sum + cost;
    }
  }, 0);

  const activeSubscriptions = subscriptions.filter(sub => sub.isActive).length;
  const totalUsers = new Set(subscriptions.map(sub => sub.userId)).size;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-subscription-management">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
          <h1 className="ml-4 text-2xl font-semibold text-foreground">Plan Management</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card data-testid="stats-total-subscriptions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptions.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeSubscriptions} active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stats-monthly-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Estimated monthly recurring revenue
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stats-total-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users with Subscriptions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Unique users with active subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-subscriptions"
              />
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Subscriptions ({pagination?.total || 0})</CardTitle>
                <CardDescription>View and manage all user subscriptions</CardDescription>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-new-subscription"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Subscription
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Table data-testid="table-subscriptions">
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id} data-testid={`row-subscription-${subscription.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{subscription.name}</div>
                          <div className="text-xs text-muted-foreground">ID: {subscription.id.slice(0, 8)}...</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.userName || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{subscription.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(parseFloat(subscription.cost.toString()) || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {subscription.billingCycle}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {subscription.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <Badge variant={subscription.isActive ? 'default' : 'destructive'}>
                            {subscription.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant={
                            subscription.paymentStatus === 'paid' ? 'default' :
                            subscription.paymentStatus === 'pending' ? 'secondary' :
                            'destructive'
                          }>
                            {subscription.paymentStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(subscription.nextBillingDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-view-${subscription.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total subscriptions)
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

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Subscription distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4" data-testid="category-breakdown">
              {Object.entries(
                subscriptions.reduce((acc, sub) => {
                  acc[sub.category] = (acc[sub.category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([category, count]) => (
                <div key={category} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">{category}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Billing Cycle Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Cycle Analysis</CardTitle>
            <CardDescription>Revenue breakdown by billing frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3" data-testid="billing-analysis">
              {['monthly', 'yearly', 'weekly'].map(cycle => {
                const cycleSubs = subscriptions.filter(sub => sub.billingCycle === cycle && sub.isActive);
                const revenue = cycleSubs.reduce((sum, sub) => {
                  const cost = parseFloat(sub.cost.toString()) || 0;
                  switch (cycle) {
                    case 'yearly':
                      return sum + (cost / 12);
                    case 'weekly':
                      return sum + (cost * 52 / 12);
                    default:
                      return sum + cost;
                  }
                }, 0);

                return (
                  <div key={cycle} className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-semibold capitalize">{cycle}</div>
                    <div className="text-2xl font-bold">{cycleSubs.length}</div>
                    <div className="text-sm text-muted-foreground">subscriptions</div>
                    <div className="text-lg font-semibold text-green-600 mt-2">
                      {formatCurrency(revenue)}/mo
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}