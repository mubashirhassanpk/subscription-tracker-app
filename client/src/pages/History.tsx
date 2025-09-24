import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar, Search, Filter, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Download, TrendingUp, Activity, BarChart3, FileText, Archive } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

interface HistoryEntry {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

const getActionIcon = (action: string) => {
  if (!action) return <Clock className="h-4 w-4 text-gray-500" />;
  switch (action.toLowerCase()) {
    case 'created':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'updated':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'deleted':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'payment_failed':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'payment_success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'cost_changed':
      return <DollarSign className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getActionColor = (action: string) => {
  if (!action) return 'bg-gray-50 text-gray-700 border-gray-200';
  switch (action.toLowerCase()) {
    case 'created':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'updated':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'deleted':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'payment_failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'payment_success':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'cost_changed':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const formatDateGroup = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return 'This Week';
  if (isThisMonth(date)) return 'This Month';
  return format(date, 'MMMM yyyy');
};

const formatActionDescription = (entry: HistoryEntry) => {
  const { action, oldValue, newValue, subscriptionName } = entry;
  
  if (!action) return `Activity for "${subscriptionName}"`;
  
  switch (action.toLowerCase()) {
    case 'created':
      return `Created subscription "${subscriptionName}"`;
    case 'updated':
      if (oldValue && newValue) {
        return `Updated "${subscriptionName}" from "${oldValue}" to "${newValue}"`;
      }
      return `Updated subscription "${subscriptionName}"`;
    case 'deleted':
      return `Deleted subscription "${subscriptionName}"`;
    case 'payment_failed':
      return `Payment failed for "${subscriptionName}"`;
    case 'payment_success':
      return `Payment successful for "${subscriptionName}"`;
    case 'cost_changed':
      return `Cost changed for "${subscriptionName}" from ${oldValue} to ${newValue}`;
    default:
      return `${action || 'Activity'} for "${subscriptionName}"`;
  }
};

// Enhanced analytics functions
const getActivityTrends = (history: HistoryEntry[]) => {
  const last30Days = history.filter(entry => {
    const entryDate = new Date(entry.createdAt);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return entryDate >= thirtyDaysAgo;
  });
  
  const activityByDay = last30Days.reduce((acc: { [key: string]: number }, entry) => {
    const day = format(new Date(entry.createdAt), 'yyyy-MM-dd');
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  
  return { last30Days: last30Days.length, dailyActivity: activityByDay };
};

const getMostActiveSubscriptions = (history: HistoryEntry[]) => {
  const subscriptionActivity = history.reduce((acc: { [key: string]: number }, entry) => {
    acc[entry.subscriptionName] = (acc[entry.subscriptionName] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(subscriptionActivity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
};

const exportHistoryData = (history: HistoryEntry[], exportFormat: 'csv' | 'json') => {
  if (exportFormat === 'csv') {
    const headers = ['Date', 'Subscription', 'Action', 'Description'];
    const csvData = history.map(entry => [
      format(new Date(entry.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      entry.subscriptionName,
      entry.action,
      formatActionDescription(entry)
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscription-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const jsonData = {
      exportDate: new Date().toISOString(),
      totalEntries: history.length,
      data: history
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscription-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'analytics' | 'summary'

  const { data: history = [], isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ['/api/subscriptions/history/all'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter history entries
  const filteredHistory = history.filter((entry) => {
    const matchesSearch = searchTerm === '' || 
      entry.subscriptionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.action && entry.action.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || (entry.action && entry.action.toLowerCase() === actionFilter);
    
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const entryDate = new Date(entry.createdAt);
      switch (timeFilter) {
        case 'today':
          matchesTime = isToday(entryDate);
          break;
        case 'week':
          matchesTime = isThisWeek(entryDate);
          break;
        case 'month':
          matchesTime = isThisMonth(entryDate);
          break;
      }
    }
    
    return matchesSearch && matchesAction && matchesTime;
  });

  // Group history by date
  const groupedHistory = filteredHistory.reduce((groups: { [key: string]: HistoryEntry[] }, entry) => {
    const date = new Date(entry.createdAt);
    const groupKey = formatDateGroup(date);
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(entry);
    
    return groups;
  }, {});

  // Sort groups by most recent first
  const sortedGroups = Object.entries(groupedHistory).sort((a, b) => {
    const aDate = new Date(a[1][0].createdAt);
    const bDate = new Date(b[1][0].createdAt);
    return bDate.getTime() - aDate.getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Subscription History</h1>
          <p className="text-muted-foreground">Loading your subscription history...</p>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activityTrends = getActivityTrends(filteredHistory);
  const mostActiveSubscriptions = getMostActiveSubscriptions(filteredHistory);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Enhanced Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Subscription History</h1>
          <p className="text-muted-foreground">
            View all changes and events for your subscriptions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => exportHistoryData(filteredHistory, 'csv')}
            disabled={filteredHistory.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportHistoryData(filteredHistory, 'json')}
            disabled={filteredHistory.length === 0}
            data-testid="button-export-json"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      {filteredHistory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{activityTrends.last30Days}</div>
                  <div className="text-xs text-muted-foreground">Activities (30d)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredHistory.filter(e => e.action && e.action.toLowerCase() === 'created').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Created</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredHistory.filter(e => e.action && e.action.toLowerCase() === 'updated').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {filteredHistory.filter(e => e.action && e.action.toLowerCase() === 'deleted').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Deleted</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter History
          </CardTitle>
          <CardDescription>
            Search and filter your subscription history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions or actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-history-search"
              />
            </div>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-action-filter">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="payment_failed">Payment Failed</SelectItem>
                <SelectItem value="payment_success">Payment Success</SelectItem>
                <SelectItem value="cost_changed">Cost Changed</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Filter */}
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-time-filter">
                <SelectValue placeholder="Filter by time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchTerm || actionFilter !== 'all' || timeFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setActionFilter('all');
                  setTimeFilter('all');
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary">
            <FileText className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-6">
          <div className="space-y-6">
            {filteredHistory.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No History Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || actionFilter !== 'all' || timeFilter !== 'all'
                      ? 'No history entries match your current filters.'
                      : 'You don\'t have any subscription history yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              sortedGroups.map(([groupName, entries]) => (
                <div key={groupName} className="space-y-3">
                  <h2 className="text-xl font-semibold text-muted-foreground border-b pb-2">
                    {groupName}
                  </h2>
                  <div className="space-y-3">
                    {entries
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((entry) => (
                        <Card key={entry.id} className="hover-elevate" data-testid={`history-entry-${entry.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 mt-1">
                                {getActionIcon(entry.action)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm mb-1">
                                      {formatActionDescription(entry)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(entry.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs border ${getActionColor(entry.action)} flex-shrink-0`}
                                  >
                                    {(entry.action || 'unknown').replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics" className="space-y-6">
          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
                <p className="text-muted-foreground">No history entries to analyze.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Activity Overview */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Activity Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Last 30 Days</span>
                        <span className="text-2xl font-bold">{activityTrends.last30Days}</span>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Daily Average</span>
                          <span className="font-medium">{Math.round(activityTrends.last30Days / 30)} events</span>
                        </div>
                        <Progress 
                          value={(activityTrends.last30Days / Math.max(filteredHistory.length, 1)) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Most Active Subscriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mostActiveSubscriptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No subscription activity data</p>
                      ) : (
                        mostActiveSubscriptions.map((sub, index) => (
                          <div key={sub.name} className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{sub.name}</div>
                              <div className="text-xs text-muted-foreground">{sub.count} events</div>
                            </div>
                            <Progress 
                              value={(sub.count / Math.max(...mostActiveSubscriptions.map(s => s.count))) * 100} 
                              className="w-16 h-2" 
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Action Breakdown</CardTitle>
                  <CardDescription>Distribution of different types of subscription events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {['created', 'updated', 'deleted', 'payment_failed', 'payment_success', 'cost_changed'].map(action => {
                      const count = filteredHistory.filter(e => e.action && e.action.toLowerCase() === action).length;
                      const percentage = filteredHistory.length > 0 ? (count / filteredHistory.length) * 100 : 0;
                      return (
                        <div key={action} className="text-center space-y-2">
                          <div className="mx-auto mb-2">{getActionIcon(action)}</div>
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {action.replace('_', ' ')}
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Summary View */}
        <TabsContent value="summary" className="space-y-6">
          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Summary Data</h3>
                <p className="text-muted-foreground">No history entries to summarize.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                  <CardDescription>Overview of your subscription management activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-primary">{filteredHistory.length}</div>
                      <div className="text-sm text-muted-foreground">Total Events</div>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-green-600">
                        {filteredHistory.filter(e => e.action.toLowerCase() === 'created').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Subscriptions Created</div>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-blue-600">
                        {filteredHistory.filter(e => e.action.toLowerCase() === 'updated').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Updates Made</div>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-red-600">
                        {filteredHistory.filter(e => e.action.toLowerCase() === 'deleted').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Subscriptions Deleted</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest subscription changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredHistory.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="flex-shrink-0">
                          {getActionIcon(entry.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{formatActionDescription(entry)}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-xs border ${getActionColor(entry.action)}`}>
                          {(entry.action || 'unknown').replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                    {filteredHistory.length > 5 && (
                      <div className="text-center pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setViewMode('timeline')}
                          data-testid="button-view-all"
                        >
                          View All {filteredHistory.length} Events
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}