import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, TrendingUp, CreditCard } from "lucide-react";
import { type Subscription } from "@shared/schema";

interface StatsCardsProps {
  subscriptions: Subscription[];
}

export default function StatsCards({ subscriptions }: StatsCardsProps) {
  const activeSubscriptions = subscriptions.filter(sub => sub.isActive);
  
  const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
    const cost = parseFloat(sub.cost);
    switch (sub.billingCycle) {
      case 'monthly':
        return total + cost;
      case 'yearly':
        return total + (cost / 12);
      case 'weekly':
        return total + (cost * 4.33); // Average weeks per month
      default:
        return total + cost;
    }
  }, 0);

  const yearlyTotal = monthlyTotal * 12;
  
  const upcomingRenewals = activeSubscriptions.filter(sub => {
    const nextBilling = new Date(sub.nextBillingDate);
    const daysUntil = (nextBilling.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 7 && daysUntil >= 0;
  }).length;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card data-testid="card-monthly-total">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-monthly-total">
            ${monthlyTotal.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            +2.1% from last month
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-yearly-total">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Yearly Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-yearly-total">
            ${yearlyTotal.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Projected annual spending
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-active-subscriptions">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-active-count">
            {activeSubscriptions.length}
          </div>
          <p className="text-xs text-muted-foreground">
            {subscriptions.length - activeSubscriptions.length} inactive
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-upcoming-renewals">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-upcoming-count">
            {upcomingRenewals}
          </div>
          <p className="text-xs text-muted-foreground">
            Next 7 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}