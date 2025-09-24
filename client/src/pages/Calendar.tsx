import { useQuery } from '@tanstack/react-query';
import { type Subscription } from '@shared/schema';
import CalendarView from '../components/CalendarView';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function Calendar() {
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Renewal Calendar</h1>
          <p className="text-muted-foreground">Loading your subscription calendar...</p>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Renewal Calendar</h1>
          <p className="text-muted-foreground">
            View your subscriptions organized by their renewal dates
          </p>
        </div>
        
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Subscriptions Yet</h3>
            <p className="text-muted-foreground">
              Add subscriptions to see them displayed on your renewal calendar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Renewal Calendar</h1>
        <p className="text-muted-foreground">
          View your subscriptions organized by their renewal dates
        </p>
      </div>

      {/* Calendar Component */}
      <CalendarView
        subscriptions={subscriptions}
        onSelectSubscription={(subscription) => {
          console.log('Selected subscription:', subscription);
          // Could open a detailed view or edit modal here
        }}
      />
    </div>
  );
}