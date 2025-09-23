import { useState, useMemo } from "react";
import { type Subscription } from "@shared/schema";
import StatsCards from "./StatsCards";
import FilterBar from "./FilterBar";
import SubscriptionCard from "./SubscriptionCard";
import AddSubscriptionForm from "./AddSubscriptionForm";
import { ThemeToggle } from "./ThemeToggle";
import { AIInsightsButton } from "./NotificationCenter";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                Subscription Tracker
              </h1>
              <p className="text-muted-foreground">
                Manage and monitor your recurring subscriptions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AIInsightsButton />
              <AddSubscriptionForm 
                onSubmit={onAddSubscription} 
                isLoading={isLoading}
                currentSubscriptionCount={subscriptions.length}
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
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
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}