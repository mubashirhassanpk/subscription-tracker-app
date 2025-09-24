import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripeProductId?: string;
  stripePriceId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  planId?: string;
}

export default function Plans() {
  const { toast } = useToast();

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['/api/plans'],
  });

  const { data: user } = useQuery<User>({
    queryKey: ['/api/account'],
  });

  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/plans/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upgrade plan');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      toast({
        title: "Plan upgraded successfully!",
        description: "Your subscription has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade failed",
        description: error.message || "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/plans/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string) => {
    upgradeMutation.mutate(planId);
  };

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  const isCurrentPlan = (planId: string) => user?.planId === planId;
  const isTrialUser = user?.subscriptionStatus === 'trial';
  const isActiveUser = user?.subscriptionStatus === 'active';

  if (plansLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4" data-testid="text-plans-title">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground" data-testid="text-plans-description">
          Select the perfect plan for your subscription tracking needs
        </p>
        {user && (
          <div className="mt-4" data-testid="text-current-status">
            <Badge variant={isActiveUser ? "default" : "secondary"}>
              Current Status: {user.subscriptionStatus}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${isCurrentPlan(plan.id) ? 'ring-2 ring-primary' : ''}`}
            data-testid={`card-plan-${plan.id}`}
          >
            {isCurrentPlan(plan.id) && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2" data-testid={`badge-current-plan-${plan.id}`}>
                Current Plan
              </Badge>
            )}
            
            <CardHeader>
              <CardTitle data-testid={`text-plan-name-${plan.id}`}>{plan.name}</CardTitle>
              <CardDescription data-testid={`text-plan-description-${plan.id}`}>
                {plan.description}
              </CardDescription>
              <div className="text-3xl font-bold" data-testid={`text-plan-price-${plan.id}`}>
                ${plan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center" data-testid={`text-plan-feature-${plan.id}-${index}`}>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {isCurrentPlan(plan.id) ? (
                <div className="w-full space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled
                    data-testid={`button-current-plan-${plan.id}`}
                  >
                    Current Plan
                  </Button>
                  {isActiveUser && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="w-full"
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      data-testid={`button-cancel-plan-${plan.id}`}
                    >
                      {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgradeMutation.isPending}
                  data-testid={`button-upgrade-plan-${plan.id}`}
                >
                  {upgradeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {isTrialUser ? 'Upgrade to' : 'Switch to'} {plan.name}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12" data-testid="text-no-plans">
          <p className="text-muted-foreground">No plans available at the moment.</p>
        </div>
      )}
    </div>
  );
}