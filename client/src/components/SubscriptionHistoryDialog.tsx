import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Play, 
  Pause, 
  Crown, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionHistory, Subscription } from "@shared/schema";

interface SubscriptionHistoryDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'payment':
      return <DollarSign className="h-4 w-4" />;
    case 'renewal':
      return <RefreshCw className="h-4 w-4" />;
    case 'trial_start':
    case 'trial_end':
      return <Crown className="h-4 w-4" />;
    case 'pause':
      return <Pause className="h-4 w-4" />;
    case 'resume':
      return <Play className="h-4 w-4" />;
    case 'cancel':
      return <X className="h-4 w-4" />;
    case 'refund':
      return <RefreshCw className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
}

function getEventColor(eventType: string, paymentStatus?: string | null) {
  if (eventType === 'payment') {
    switch (paymentStatus) {
      case 'paid':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'refunded':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  switch (eventType) {
    case 'renewal':
      return 'text-green-600 dark:text-green-400';
    case 'cancel':
      return 'text-red-600 dark:text-red-400';
    case 'pause':
      return 'text-orange-600 dark:text-orange-400';
    case 'resume':
      return 'text-green-600 dark:text-green-400';
    case 'trial_start':
      return 'text-purple-600 dark:text-purple-400';
    case 'trial_end':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

function getStatusBadge(eventType: string, paymentStatus?: string | null) {
  if (eventType === 'payment' && paymentStatus) {
    const variants = {
      paid: 'default',
      failed: 'destructive', 
      pending: 'secondary',
      refunded: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[paymentStatus as keyof typeof variants] || 'outline'} className="text-xs">
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      {eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}

export default function SubscriptionHistoryDialog({ 
  subscription, 
  open, 
  onOpenChange 
}: SubscriptionHistoryDialogProps) {
  const { data: history, isLoading } = useQuery<SubscriptionHistory[]>({
    queryKey: ['/api/subscriptions', subscription?.id, 'history'],
    enabled: open && !!subscription?.id,
  });

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            History for {subscription.name}
          </DialogTitle>
          <DialogDescription>
            View all payment events and subscription changes for this service
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                <p className="text-sm text-muted-foreground">Loading history...</p>
              </div>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-medium text-sm">No History Found</h3>
                  <p className="text-xs text-muted-foreground">
                    No payment or subscription events have been recorded yet.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <Card key={entry.id} className="border-l-4 border-l-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn(
                          "p-2 rounded-full bg-muted mt-0.5",
                          getEventColor(entry.eventType, entry.paymentStatus)
                        )}>
                          {getEventIcon(entry.eventType)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm leading-none">
                              {entry.description}
                            </h4>
                            {getStatusBadge(entry.eventType, entry.paymentStatus)}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(entry.eventDate), 'MMM dd, yyyy HH:mm')}
                            </div>
                            
                            {entry.amount && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ${entry.amount} {entry.currency || 'USD'}
                              </div>
                            )}
                            
                            {entry.paymentMethod && (
                              <div className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {entry.paymentMethod.charAt(0).toUpperCase() + entry.paymentMethod.slice(1)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  {index < history.length - 1 && <Separator />}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}