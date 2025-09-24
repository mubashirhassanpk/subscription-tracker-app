import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, DollarSign, Crown, Copy, Heart, Pause, Play, FileText, ExternalLink, History } from "lucide-react";
import { type Subscription } from "@shared/schema";
import { format } from "date-fns";
import CountdownTimer from "./CountdownTimer";
import SubscriptionHistoryDialog from "./SubscriptionHistoryDialog";
import { useState } from "react";

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit?: (subscription: Subscription) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (subscription: Subscription) => void;
  onDuplicate?: (subscription: Subscription) => void;
  onTogglePause?: (id: string) => void;
  onExport?: (subscription: Subscription) => void;
}

const categoryColors: Record<string, string> = {
  Entertainment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Productivity: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
  Health: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Education: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Gaming: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  News: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

export default function SubscriptionCard({ subscription, onEdit, onDelete, onViewDetails, onDuplicate, onTogglePause, onExport }: SubscriptionCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const nextBilling = new Date(subscription.nextBillingDate);
  const isUpcomingSoon = nextBilling.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days
  const paymentStatus = (subscription as any).paymentStatus || 'paid';
  const email = (subscription as any).email || '';

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Edit subscription:', subscription.id);
    onEdit?.(subscription);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete subscription:', subscription.id);
    onDelete?.(subscription.id);
  };

  const handleViewDetails = () => {
    console.log('View details for subscription:', subscription.id);
    onViewDetails?.(subscription);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Duplicate subscription:', subscription.id);
    onDuplicate?.(subscription);
  };


  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Toggle pause for:', subscription.id);
    onTogglePause?.(subscription.id);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Export subscription:', subscription.id);
    onExport?.(subscription);
  };

  const handleOpenWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Try to construct a website URL from the subscription name
    const searchQuery = encodeURIComponent(subscription.name + ' subscription');
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  };

  return (
    <Card 
      className="hover-elevate cursor-pointer transition-all"
      onClick={handleViewDetails}
      data-testid={`card-subscription-${subscription.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm sm:text-base truncate" data-testid={`text-subscription-name-${subscription.id}`}>
            {subscription.name}
          </h3>
          {subscription.isTrial && (
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200" data-testid={`badge-trial-${subscription.id}`}>
              <Crown className="h-3 w-3 mr-1" />
              Trial
            </Badge>
          )}
          {!subscription.isActive && (
            <Badge variant="secondary" className="text-xs" data-testid={`badge-inactive-${subscription.id}`}>
              Inactive
            </Badge>
          )}
          {paymentStatus !== 'paid' && (
            <Badge 
              variant={paymentStatus === 'overdue' || paymentStatus === 'failed' ? 'destructive' : 'default'}
              className="text-xs"
              data-testid={`badge-payment-status-${subscription.id}`}
            >
              {paymentStatus === 'pending' ? 'Pending' : paymentStatus === 'failed' ? 'Failed' : paymentStatus === 'overdue' ? 'Overdue' : paymentStatus}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => e.stopPropagation()}
              data-testid={`button-more-${subscription.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleDuplicate} data-testid={`menu-duplicate-${subscription.id}`}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Duplicate</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleTogglePause} data-testid={`menu-pause-${subscription.id}`}>
              {subscription.isActive ? (
                <><Pause className="mr-2 h-4 w-4" /><span>Pause subscription</span></>
              ) : (
                <><Play className="mr-2 h-4 w-4" /><span>Resume subscription</span></>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExport} data-testid={`menu-export-${subscription.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Export details</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenWebsite} data-testid={`menu-website-${subscription.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>Find website</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowHistory(true); }} data-testid={`menu-history-${subscription.id}`}>
              <History className="mr-2 h-4 w-4" />
              <span>View history</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold" data-testid={`text-cost-${subscription.id}`}>
                ${subscription.cost}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                /{subscription.billingCycle}
              </span>
              {subscription.isTrial && subscription.trialDays && (
                <span className="text-xs text-orange-600 ml-1">
                  ({subscription.trialDays} day trial)
                </span>
              )}
            </div>
          </div>
          <Badge 
            className={`${categoryColors[subscription.category] || categoryColors.Other} text-xs flex-shrink-0`}
            variant="secondary"
            data-testid={`badge-category-${subscription.id}`}
          >
            {subscription.category}
          </Badge>
        </div>

        <CountdownTimer
          targetDate={nextBilling}
          isActive={Boolean(subscription.isActive)}
          isTrial={subscription.isTrial}
          data-testid={`countdown-${subscription.id}`}
        />

        {subscription.description && (
          <p className="text-sm text-muted-foreground" data-testid={`text-description-${subscription.id}`}>
            {subscription.description}
          </p>
        )}

        <div className="flex gap-2 pt-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEdit}
            data-testid={`button-edit-${subscription.id}`}
            className="text-xs sm:text-sm"
          >
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDelete}
            data-testid={`button-delete-${subscription.id}`}
          >
            Delete
          </Button>
        </div>
      </CardContent>

      <SubscriptionHistoryDialog
        subscription={subscription}
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </Card>
  );
}