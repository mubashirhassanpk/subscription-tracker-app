import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
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
      return `${action} for "${subscriptionName}"`;
  }
};

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const { data: history = [], isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ['/api/subscriptions/history/all'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter history entries
  const filteredHistory = history.filter((entry) => {
    const matchesSearch = searchTerm === '' || 
      entry.subscriptionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || entry.action.toLowerCase() === actionFilter;
    
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Subscription History</h1>
        <p className="text-muted-foreground">
          View all changes and events for your subscriptions
        </p>
      </div>

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

      {/* History Results */}
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
                                {entry.action.replace('_', ' ').toUpperCase()}
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

      {/* Summary Stats */}
      {filteredHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredHistory.filter(e => e.action.toLowerCase() === 'created').length}
                </div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredHistory.filter(e => e.action.toLowerCase() === 'updated').length}
                </div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {filteredHistory.filter(e => e.action.toLowerCase() === 'deleted').length}
                </div>
                <div className="text-xs text-muted-foreground">Deleted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {filteredHistory.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}