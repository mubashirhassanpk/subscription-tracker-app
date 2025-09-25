import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  PieChart,
  ArrowUp,
  ArrowDown,
  Target
} from "lucide-react";

export default function Analytics() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("12months");

  // Fetch category analytics
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ["/api/analytics/categories"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/categories");
      if (!response.ok) throw new Error("Failed to fetch category analytics");
      return response.json();
    }
  });

  // Fetch peak months data
  const { data: peakMonthsData, isLoading: peakMonthsLoading } = useQuery({
    queryKey: ["/api/analytics/peak-months"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/peak-months");
      if (!response.ok) throw new Error("Failed to fetch peak months data");
      return response.json();
    }
  });

  // Fetch spending trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/analytics/trends"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/trends");
      if (!response.ok) throw new Error("Failed to fetch spending trends");
      return response.json();
    }
  });

  const handleExportAnalytics = async () => {
    try {
      const response = await fetch("/api/export/analytics/csv");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscription_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  if (categoryLoading || peakMonthsLoading || trendsLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Subscription Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Analyze your spending patterns and peak payment months
            </p>
          </div>
          <Button 
            onClick={handleExportAnalytics}
            className="mt-4 lg:mt-0"
            data-testid="button-export-analytics"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Analytics
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-categories">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Categories</p>
                  <p className="text-2xl font-bold">{categoryData?.summary?.totalCategories || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <PieChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-monthly-spending">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Spending</p>
                  <p className="text-2xl font-bold">${categoryData?.summary?.totalMonthlyCost?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-yearly-projection">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Yearly Projection</p>
                  <p className="text-2xl font-bold">${categoryData?.summary?.totalYearlyCost?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-peak-month">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Peak Month</p>
                  <p className="text-2xl font-bold">${peakMonthsData?.summary?.highestMonth?.totalAmount?.toFixed(2) || "0.00"}</p>
                  <p className="text-xs text-gray-500">{peakMonthsData?.summary?.highestMonth?.monthName}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <ArrowUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics */}
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="peak-months" data-testid="tab-peak-months">Peak Months</TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Spending by Category
                </CardTitle>
                <CardDescription>
                  Your subscription costs broken down by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData?.categories?.map((category: any, index: number) => {
                    const percentage = (category.totalMonthlyCost / categoryData.summary.totalMonthlyCost) * 100;
                    return (
                      <div key={category.category} className="space-y-2" data-testid={`category-${index}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">{category.category}</div>
                            <Badge variant="secondary">{category.count} subscriptions</Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${category.totalMonthlyCost.toFixed(2)}/month</div>
                            <div className="text-sm text-gray-500">${category.totalYearlyCost.toFixed(2)}/year</div>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}% of total spending</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Peak Months Tab */}
          <TabsContent value="peak-months" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Peak Payment Months
                </CardTitle>
                <CardDescription>
                  Months with the highest subscription charges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Top Peak Months */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {peakMonthsData?.peakMonths?.slice(0, 3).map((month: any, index: number) => (
                      <Card key={month.month} className={index === 0 ? "ring-2 ring-red-500" : ""} data-testid={`peak-month-${index}`}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">
                              {index === 0 ? "Highest" : index === 1 ? "Second" : "Third"}
                            </div>
                            <div className="text-lg font-bold">{month.monthName}</div>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                              ${month.totalAmount.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                              {month.payments.length} payments
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Monthly Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">12-Month Projection</h3>
                    {peakMonthsData?.monthlyPayments?.map((month: any, index: number) => (
                      <div key={month.month} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800" data-testid={`month-projection-${index}`}>
                        <div>
                          <div className="font-medium">{month.monthName}</div>
                          <div className="text-sm text-gray-500">{month.payments.length} payments due</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${month.totalAmount.toFixed(2)}</div>
                          {month.totalAmount > peakMonthsData.summary.averageMonthly && (
                            <Badge variant="destructive" className="text-xs">Above Average</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Spending Trends
                </CardTitle>
                <CardDescription>
                  Historical spending patterns and activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${trendsData?.summary?.totalSpent?.toFixed(2) || "0.00"}
                      </div>
                      <div className="text-sm text-gray-500">Total Historical Spend</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${trendsData?.summary?.averageMonthlySpend?.toFixed(2) || "0.00"}
                      </div>
                      <div className="text-sm text-gray-500">Average Monthly</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {trendsData?.summary?.totalMonths || 0}
                      </div>
                      <div className="text-sm text-gray-500">Months Tracked</div>
                    </div>
                  </div>

                  {/* Monthly Trend List */}
                  <div className="space-y-3">
                    {trendsData?.trends?.map((trend: any, index: number) => (
                      <div key={trend.month} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`trend-${index}`}>
                        <div>
                          <div className="font-medium">{trend.monthName}</div>
                          <div className="text-sm text-gray-500">
                            {trend.renewals} renewals • {trend.cancelledSubscriptions} cancelled
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${trend.totalSpent.toFixed(2)}</div>
                          <div className="text-sm text-gray-500">{trend.events.length} events</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}