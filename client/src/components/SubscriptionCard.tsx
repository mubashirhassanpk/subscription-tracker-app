import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MoreHorizontal, Calendar, DollarSign } from "lucide-react";
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
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base" data-testid={`text-subscription-name-${subscription.id}`}>
            {subscription.name}
          </h3>
          {!subscription.isActive && (
            <Badge variant="secondary" data-testid={`badge-inactive-${subscription.id}`}>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-bold" data-testid={`text-cost-${subscription.id}`}>
              ${subscription.cost}
            </span>
            <span className="text-sm text-muted-foreground">
              /{subscription.billingCycle}
            </span>
          </div>
          <Badge 
            className={categoryColors[subscription.category] || categoryColors.Other}
            variant="secondary"
            data-testid={`badge-category-${subscription.id}`}
          >
            {subscription.category}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span data-testid={`text-next-billing-${subscription.id}`}>
            Next billing: {format(nextBilling, 'MMM dd, yyyy')}
          </span>
          {isUpcomingSoon && (
            <Badge variant="destructive" className="ml-2">
              Soon
            </Badge>
          )}
        </div>

        {subscription.description && (
          <p className="text-sm text-muted-foreground" data-testid={`text-description-${subscription.id}`}>
            {subscription.description}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEdit}
            data-testid={`button-edit-${subscription.id}`}
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