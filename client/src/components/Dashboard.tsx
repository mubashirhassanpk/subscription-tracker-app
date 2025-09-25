import { useState, useMemo } from "react";
import { type Subscription } from "@shared/schema";
import StatsCards from "./StatsCards";
import FilterBar from "./FilterBar";
import SubscriptionCard from "./SubscriptionCard";
import AddSubscriptionForm from "./AddSubscriptionForm";
import AIInsightsDialog from "./AIInsightsDialog";
import SubscriptionDetailsDialog from "./SubscriptionDetailsDialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, RefreshCw, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSearch } from "../contexts/SearchContext";

interface DashboardProps {
  subscriptions: Subscription[];
  onAddSubscription: (data: any) => void;
  onEditSubscription: (subscription: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  isLoading?: boolean;
}

export default function Dashboard({
  subscriptions,
  onAddSubscription,
  onEditSubscription,
  onDeleteSubscription,
  isLoading = false
}: DashboardProps) {
  const { searchTerm, setSearchTerm } = useSearch();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const queryClient = useQueryClient();

  const handleRefreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      // Refresh all dashboard data
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // Trigger trial expiry check
      await apiRequest('POST', '/api/notifications/trials/check');
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewDetails = (subscription: Subscription) => {
    console.log('Opening details for subscription:', subscription.id);
    setSelectedSubscription(subscription);
    setDetailsDialogOpen(true);
  };

  const handleDuplicateSubscription = (subscription: Subscription) => {
    console.log('Duplicating subscription:', subscription.id);
    // Create a duplicate subscription with modified name
    const duplicateData = {
      ...subscription,
      name: `${subscription.name} (Copy)`,
      id: undefined, // Remove ID so a new one is generated
      createdAt: undefined, // Remove timestamp so a new one is generated
      // Convert null values to empty strings for validation
      cardLast4: subscription.cardLast4 || '',
      bankName: subscription.bankName || '',
    };
    onAddSubscription(duplicateData);
  };


  const handleTogglePause = async (id: string) => {
    console.log('Toggle pause for subscription:', id);
    try {
      const subscription = subscriptions.find(s => s.id === id);
      if (!subscription) return;
      
      // Toggle the isActive status (send integer: 1 for active, 0 for inactive)
      const updatedData = {
        isActive: subscription.isActive ? 0 : 1
      };
      
      await apiRequest('PUT', `/api/subscriptions/${id}`, updatedData);
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      
      // Show success feedback
      const newStatus = subscription.isActive ? 'paused' : 'resumed';
      console.log(`Subscription ${newStatus} successfully`);
    } catch (error) {
      console.error('Failed to toggle subscription status:', error);
      alert('Failed to update subscription status. Please try again.');
    }
  };

  const handleExportSubscription = (subscription: Subscription) => {
    console.log('Exporting subscription:', subscription.id);
    // Create a downloadable JSON file with subscription details
    const exportData = {
      name: subscription.name,
      cost: subscription.cost,
      billingCycle: subscription.billingCycle,
      category: subscription.category,
      nextBillingDate: subscription.nextBillingDate,
      description: subscription.description,
      isTrial: subscription.isTrial,
      trialDays: subscription.trialDays,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${subscription.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_subscription.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportAllData = async () => {
    try {
      const response = await fetch("/api/export/subscriptions/csv");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all_subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(subscription => {
      const matchesSearch = subscription.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          subscription.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || subscription.category === selectedCategory;
      
      const matchesActiveFilter = activeFilter === 'all' ||
                                (activeFilter === 'active' && subscription.isActive) ||
                                (activeFilter === 'inactive' && !subscription.isActive);
      
      return matchesSearch && matchesCategory && matchesActiveFilter;
    });
  }, [subscriptions, searchTerm, selectedCategory, activeFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
                Subscription Tracker
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
                Manage and monitor your recurring subscriptions
              </p>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-4">
              <AIInsightsDialog />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAllData}
                className="hidden sm:flex items-center gap-2"
                data-testid="button-export-all"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <AddSubscriptionForm 
                onSubmit={onAddSubscription} 
                isLoading={isLoading}
                currentSubscriptionCount={subscriptions.length}
              />
              <Button
                variant="outline"
                size="sm"
                className="sm:w-9 sm:h-9 sm:p-0"
                onClick={handleRefreshDashboard}
                disabled={isRefreshing}
                data-testid="button-refresh-dashboard"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Stats Cards */}
        <StatsCards subscriptions={subscriptions} />

        {/* Filters and View Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              activeFilter={activeFilter}
              onActiveFilterChange={setActiveFilter}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              data-testid="button-grid-view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-list-view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Subscriptions Grid/List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" data-testid="text-subscriptions-title">
              Your Subscriptions ({filteredSubscriptions.length})
            </h2>
          </div>

          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg" data-testid="text-no-subscriptions">
                {subscriptions.length === 0 
                  ? "No subscriptions added yet. Add your first subscription to get started!"
                  : "No subscriptions match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
              : "space-y-4"
            }>
              {filteredSubscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onEdit={onEditSubscription}
                  onDelete={onDeleteSubscription}
                  onViewDetails={handleViewDetails}
                  onDuplicate={handleDuplicateSubscription}
                  onTogglePause={handleTogglePause}
                  onExport={handleExportSubscription}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Subscription Details Dialog */}
      <SubscriptionDetailsDialog
        subscription={selectedSubscription}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onEdit={onEditSubscription}
        onDelete={onDeleteSubscription}
      />
    </div>
  );
}