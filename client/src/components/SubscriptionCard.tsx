import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MoreHorizontal, Calendar, DollarSign, Crown } from "lucide-react";
import { type Subscription } from "@shared/schema";
import { format } from "date-fns";

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit?: (subscription: Subscription) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (subscription: Subscription) => void;
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

export default function SubscriptionCard({ subscription, onEdit, onDelete, onViewDetails }: SubscriptionCardProps) {
  const nextBilling = new Date(subscription.nextBillingDate);
  const isUpcomingSoon = nextBilling.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

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
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            console.log('More options for:', subscription.id);
          }}
          data-testid={`button-more-${subscription.id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
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

        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span data-testid={`text-next-billing-${subscription.id}`} className="flex-1">
            {subscription.isTrial ? 'Trial ends:' : 'Next billing:'} {format(nextBilling, 'MMM dd, yyyy')}
          </span>
          {isUpcomingSoon && (
            <Badge variant="destructive" className="text-xs">
              Soon
            </Badge>
          )}
        </div>

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
    </Card>
  );
}