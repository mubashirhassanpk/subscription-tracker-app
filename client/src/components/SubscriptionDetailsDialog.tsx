import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Tag, 
  FileText, 
  CreditCard, 
  Building2,
  Crown,
  Activity,
  Edit,
  Trash2
} from "lucide-react";
import { type Subscription } from "@shared/schema";
import { format, differenceInDays } from "date-fns";

interface SubscriptionDetailsDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (subscription: Subscription) => void;
  onDelete?: (id: string) => void;
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

export default function SubscriptionDetailsDialog({ 
  subscription, 
  open, 
  onOpenChange,
  onEdit,
  onDelete
}: SubscriptionDetailsDialogProps) {
  
  if (!subscription) return null;

  const nextBilling = new Date(subscription.nextBillingDate);
  const isUpcomingSoon = nextBilling.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days
  const daysUntilBilling = Math.max(0, differenceInDays(nextBilling, new Date()));

  const handleEdit = () => {
    onEdit?.(subscription);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete?.(subscription.id);
    onOpenChange(false);
  };

  // Calculate yearly cost regardless of billing cycle
  const yearlyValue = () => {
    const cost = parseFloat(subscription.cost);
    switch (subscription.billingCycle) {
      case 'weekly': return cost * 52;
      case 'monthly': return cost * 12;
      case 'yearly': return cost;
      default: return cost * 12;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {subscription.name}
              {!subscription.isActive && (
                <Badge variant="secondary" data-testid="badge-details-inactive">
                  Inactive
                </Badge>
              )}
            </div>
            <Badge 
              className={categoryColors[subscription.category] || categoryColors.Other}
              variant="secondary"
              data-testid="badge-details-category"
            >
              {subscription.category}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            
            {/* Main Cost Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Current Cost</p>
                    <p className="text-3xl font-bold text-primary" data-testid="text-details-cost">
                      ${subscription.cost}
                      <span className="text-lg font-normal text-muted-foreground ml-2">
                        / {subscription.billingCycle}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Annual Equivalent</p>
                    <p className="text-2xl font-semibold" data-testid="text-details-yearly-cost">
                      ${yearlyValue().toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground ml-2">/ year</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                    <p className="text-lg font-semibold" data-testid="text-details-next-billing">
                      {format(nextBilling, 'MMM dd, yyyy')}
                      {isUpcomingSoon && (
                        <Badge variant="destructive" className="ml-2">
                          Soon
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Days Until Billing</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold" data-testid="text-details-days-until">
                        {daysUntilBilling} {daysUntilBilling === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Service Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Active Status</span>
                  <Badge 
                    variant={subscription.isActive ? "default" : "secondary"}
                    data-testid="badge-details-status"
                  >
                    {subscription.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Trial Information */}
            {subscription.isTrial && (
              <Card className="border-dashed border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                    <Crown className="h-5 w-5" />
                    Free Trial Active
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {subscription.trialDays && (
                    <div className="flex justify-between">
                      <span className="font-medium">Trial Duration</span>
                      <span data-testid="text-details-trial-days">
                        {subscription.trialDays} days
                      </span>
                    </div>
                  )}
                  {subscription.trialStartDate && (
                    <div className="flex justify-between">
                      <span className="font-medium">Trial Started</span>
                      <span data-testid="text-details-trial-start">
                        {format(new Date(subscription.trialStartDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                  {subscription.trialEndDate && (
                    <div className="flex justify-between">
                      <span className="font-medium">Trial Ends</span>
                      <span data-testid="text-details-trial-end">
                        {format(new Date(subscription.trialEndDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Information */}
            {(subscription.cardLast4 || subscription.bankName) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subscription.cardLast4 && (
                    <div className="flex justify-between">
                      <span className="font-medium">Card Last 4 Digits</span>
                      <span className="font-mono" data-testid="text-details-card-last4">
                        •••• {subscription.cardLast4}
                      </span>
                    </div>
                  )}
                  {subscription.bankName && (
                    <div className="flex justify-between">
                      <span className="font-medium">Bank/Card Provider</span>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-details-bank-name">
                          {subscription.bankName}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {subscription.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-details-description">
                    {subscription.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Service Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Service Category</span>
                  <Badge 
                    className={categoryColors[subscription.category] || categoryColors.Other}
                    variant="secondary"
                  >
                    {subscription.category}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Billing Frequency</span>
                  <span className="capitalize" data-testid="text-details-billing-cycle">
                    {subscription.billingCycle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Added Date</span>
                  <span data-testid="text-details-created">
                    {format(new Date(subscription.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-6 py-4 border-t">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
            data-testid="button-details-close"
          >
            Close
          </Button>
          <Button 
            variant="outline" 
            onClick={handleEdit}
            data-testid="button-details-edit"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            data-testid="button-details-delete"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}