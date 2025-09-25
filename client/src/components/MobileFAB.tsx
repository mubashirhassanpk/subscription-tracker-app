import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Settings, Bell, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import AddSubscriptionForm from "./AddSubscriptionForm";

interface MobileFABProps {
  onAddSubscription: (data: any) => void;
  subscriptionCount: number;
  isLoading?: boolean;
}

export function MobileFAB({ onAddSubscription, subscriptionCount, isLoading }: MobileFABProps) {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isDashboardPage = location === '/dashboard';
  const isMarketingPage = location === '/' || location === '/features' || location === '/pricing';
  
  if (isMarketingPage) {
    return null; // Don't show FAB on marketing pages
  }

  const handleExportAll = async () => {
    try {
      const response = await fetch("/api/export/subscriptions/csv");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExpanded(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  if (!isDashboardPage) {
    // Show simple action button for non-dashboard pages
    return (
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <Button
          size="lg"
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          data-testid="mobile-fab-simple"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      {/* Expanded menu items */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 pb-2">
          <Button
            size="sm"
            variant="secondary"
            className="w-12 h-12 rounded-full shadow-md"
            onClick={handleExportAll}
            data-testid="mobile-fab-export"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <AddSubscriptionForm
            onSubmit={onAddSubscription}
            isLoading={isLoading}
            currentSubscriptionCount={subscriptionCount}
          />
        </div>
      )}
      
      {/* Main FAB button */}
      <Button
        size="lg"
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${
          isExpanded ? 'rotate-45' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="mobile-fab-main"
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      {/* Overlay to close expanded menu */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
          data-testid="mobile-fab-overlay"
        />
      )}
    </div>
  );
}