import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Subscription } from '@shared/schema';

interface CalendarViewProps {
  subscriptions: Subscription[];
  onSelectSubscription?: (subscription: Subscription) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  subscriptions: Subscription[];
}

const formatCurrency = (amount: string) => {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

const getPaymentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'overdue':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function CalendarView({ subscriptions, onSelectSubscription }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Generate calendar days (including previous/next month days for complete grid)
  const calendarDays = useMemo(() => {
    // Start from the first day of the week containing the first day of the month
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
    
    // End at the last day of the week containing the last day of the month
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(date => {
      const daySubscriptions = subscriptions.filter(sub => {
        try {
          const subDate = new Date(sub.nextBillingDate);
          return isSameDay(subDate, date);
        } catch (error) {
          console.warn('Invalid date format for subscription:', sub.id, sub.nextBillingDate);
          return false;
        }
      });

      return {
        date,
        isCurrentMonth: isSameMonth(date, currentDate),
        subscriptions: daySubscriptions,
      };
    });
  }, [currentDate, subscriptions, monthStart, monthEnd]);

  // Group calendar days into weeks
  const weeks = useMemo(() => {
    const weeksArray = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarDays]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
  };

  const selectedDaySubscriptions = selectedDate 
    ? subscriptions.filter(sub => {
        try {
          const subDate = new Date(sub.nextBillingDate);
          return isSameDay(subDate, selectedDate);
        } catch (error) {
          return false;
        }
      })
    : [];

  const monthlyTotal = useMemo(() => {
    const monthSubs = subscriptions.filter(sub => {
      try {
        const subDate = new Date(sub.nextBillingDate);
        return isSameMonth(subDate, currentDate);
      } catch (error) {
        return false;
      }
    });
    
    return monthSubs.reduce((total, sub) => total + parseFloat(sub.cost), 0);
  }, [subscriptions, currentDate]);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Renewal Calendar
              </CardTitle>
              <Badge variant="secondary" className="font-mono">
                {format(currentDate, 'MMMM yyyy')}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground hidden sm:block">
                Monthly Total: <span className="font-medium text-foreground">{formatCurrency(monthlyTotal.toString())}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                data-testid="button-today"
              >
                Today
              </Button>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Calendar Grid */}
          <div className="space-y-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div 
                  key={day} 
                  className="text-center text-sm font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day) => (
                    <div
                      key={day.date.toISOString()}
                      className={cn(
                        "min-h-24 p-1 border rounded-lg cursor-pointer transition-all hover-elevate relative",
                        day.isCurrentMonth 
                          ? "bg-background border-border" 
                          : "bg-muted/30 border-muted text-muted-foreground",
                        isToday(day.date) && "bg-primary/5 border-primary/20",
                        selectedDate && isSameDay(day.date, selectedDate) && "bg-primary/10 border-primary/40"
                      )}
                      onClick={() => handleDayClick(day)}
                      data-testid={`calendar-day-${format(day.date, 'yyyy-MM-dd')}`}
                    >
                      {/* Date Number */}
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        !day.isCurrentMonth && "text-muted-foreground/60",
                        isToday(day.date) && "text-primary font-semibold"
                      )}>
                        {format(day.date, 'd')}
                      </div>

                      {/* Subscription Indicators */}
                      <div className="space-y-1">
                        {day.subscriptions.slice(0, 2).map((subscription) => (
                          <div
                            key={subscription.id}
                            className={cn(
                              "text-xs px-1 py-0.5 rounded border text-center truncate font-medium",
                              getPaymentStatusColor(subscription.paymentStatus || 'paid')
                            )}
                            title={`${subscription.name} - ${formatCurrency(subscription.cost)}`}
                          >
                            {subscription.name}
                          </div>
                        ))}
                        {day.subscriptions.length > 2 && (
                          <div className="text-xs text-center text-muted-foreground">
                            +{day.subscriptions.length - 2} more
                          </div>
                        )}
                      </div>

                      {/* Daily Total */}
                      {day.subscriptions.length > 0 && (
                        <div className="absolute bottom-1 right-1 text-xs font-mono text-muted-foreground">
                          {formatCurrency(
                            day.subscriptions
                              .reduce((sum, sub) => sum + parseFloat(sub.cost), 0)
                              .toString()
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && selectedDaySubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Renewals on {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedDaySubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => onSelectSubscription?.(subscription)}
                  data-testid={`selected-subscription-${subscription.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">{subscription.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {subscription.category} • {subscription.billingCycle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary"
                      className={getPaymentStatusColor(subscription.paymentStatus || 'paid')}
                    >
                      {subscription.paymentStatus || 'paid'}
                    </Badge>
                    <div className="text-right">
                      <div className="font-medium flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(subscription.cost)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Day Total:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(
                      selectedDaySubscriptions
                        .reduce((sum, sub) => sum + parseFloat(sub.cost), 0)
                        .toString()
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}