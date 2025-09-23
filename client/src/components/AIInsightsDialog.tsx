import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  AlertTriangle, 
  DollarSign, 
  BarChart3, 
  RefreshCw,
  Sparkles,
  Target,
  Clock
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

interface SubscriptionInsight {
  type: 'cost_optimization' | 'renewal_reminder' | 'category_analysis' | 'spending_pattern';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subscriptionIds?: string[];
  data?: any;
}

interface AIInsightsResponse {
  message: string;
  insights: number;
  notifications: any[];
  summary: {
    totalCost: number;
    activeSubscriptions: number;
    upcomingRenewals: number;
    categoryCosts: Record<string, number>;
  };
  rawInsights: SubscriptionInsight[];
}

function getInsightIcon(type: SubscriptionInsight['type'], priority: SubscriptionInsight['priority']) {
  const iconClasses = priority === 'urgent' ? 'text-red-500' : 
                     priority === 'high' ? 'text-orange-500' : 
                     priority === 'normal' ? 'text-blue-500' : 'text-gray-500';

  switch (type) {
    case 'cost_optimization':
      return <DollarSign className={`h-4 w-4 ${iconClasses}`} />;
    case 'renewal_reminder':
      return <Calendar className={`h-4 w-4 ${iconClasses}`} />;
    case 'category_analysis':
      return <BarChart3 className={`h-4 w-4 ${iconClasses}`} />;
    case 'spending_pattern':
      return <TrendingUp className={`h-4 w-4 ${iconClasses}`} />;
    default:
      return <Sparkles className={`h-4 w-4 ${iconClasses}`} />;
  }
}

function getPriorityBadgeVariant(priority: SubscriptionInsight['priority']) {
  switch (priority) {
    case 'urgent':
      return 'destructive' as const;
    case 'high':
      return 'secondary' as const;
    case 'normal':
      return 'default' as const;
    case 'low':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

export default function AIInsightsDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch existing insights
  const { data: insightsData, isLoading, refetch } = useQuery<AIInsightsResponse>({
    queryKey: ['/api/notifications/insights/latest'],
    enabled: open,
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/notifications/insights/generate');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/insights/latest'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      refetch();
    }
  });

  const handleGenerateInsights = () => {
    generateInsightsMutation.mutate();
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    
    // Also trigger trial expiry check when refreshing
    apiRequest('POST', '/api/notifications/trials/check').catch(console.error);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-ai-insights-dialog"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Insights
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Subscription Insights
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                data-testid="button-refresh-insights"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateInsights}
                disabled={generateInsightsMutation.isPending}
                data-testid="button-generate-new-insights"
              >
                {generateInsightsMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    Generate New
                  </>
                )}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading insights...
              </div>
            </div>
          ) : !insightsData ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="font-medium">No insights available</h3>
                <p className="text-sm text-muted-foreground">
                  Generate AI-powered insights about your subscriptions
                </p>
                <Button onClick={handleGenerateInsights} disabled={generateInsightsMutation.isPending}>
                  {generateInsightsMutation.isPending ? 'Analyzing...' : 'Generate Insights'}
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                {/* Summary Cards */}
                {insightsData.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium">Total Cost</p>
                            <p className="text-lg font-bold">
                              {formatCurrency(insightsData.summary.totalCost)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">Active</p>
                            <p className="text-lg font-bold">
                              {insightsData.summary.activeSubscriptions}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium">Renewals</p>
                            <p className="text-lg font-bold">
                              {insightsData.summary.upcomingRenewals}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="text-sm font-medium">Insights</p>
                            <p className="text-lg font-bold">
                              {insightsData.rawInsights?.length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Separator />

                {/* Insights List */}
                {insightsData.rawInsights && insightsData.rawInsights.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI-Generated Insights
                    </h3>
                    <div className="space-y-3">
                      {insightsData.rawInsights.map((insight, index) => (
                        <Alert key={index} data-testid={`insight-${index}`}>
                          <div className="flex items-start gap-3 w-full">
                            {getInsightIcon(insight.type, insight.priority)}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm">
                                  {insight.title}
                                </h4>
                                <Badge variant={getPriorityBadgeVariant(insight.priority)}>
                                  {insight.priority}
                                </Badge>
                              </div>
                              <AlertDescription>
                                {insight.message}
                              </AlertDescription>
                              {insight.subscriptionIds && insight.subscriptionIds.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Affects {insight.subscriptionIds.length} subscription(s)
                                </div>
                              )}
                            </div>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No insights generated yet</p>
                  </div>
                )}

                {/* Category Breakdown */}
                {insightsData.summary?.categoryCosts && Object.keys(insightsData.summary.categoryCosts).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Spending by Category
                      </h3>
                      <div className="grid gap-2">
                        {Object.entries(insightsData.summary.categoryCosts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([category, cost]) => (
                            <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <span className="font-medium">{category}</span>
                              <span className="text-lg font-bold">{formatCurrency(cost)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}