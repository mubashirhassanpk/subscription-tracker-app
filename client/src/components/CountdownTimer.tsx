import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  isActive?: boolean;
  isTrial?: boolean;
  className?: string;
  compact?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const total = targetDate.getTime() - Date.now();
  
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, total };
}

function getUrgencyLevel(timeRemaining: TimeRemaining): 'overdue' | 'urgent' | 'warning' | 'normal' {
  if (timeRemaining.total <= 0) return 'overdue';
  if (timeRemaining.days === 0) return 'urgent';
  if (timeRemaining.days <= 3) return 'warning';
  return 'normal';
}

function getUrgencyStyle(urgency: 'overdue' | 'urgent' | 'warning' | 'normal', isTrial: boolean) {
  switch (urgency) {
    case 'overdue':
      return isTrial 
        ? "text-red-600 dark:text-red-400" 
        : "text-red-600 dark:text-red-400";
    case 'urgent':
      return isTrial 
        ? "text-orange-600 dark:text-orange-400" 
        : "text-red-500 dark:text-red-400";
    case 'warning':
      return isTrial 
        ? "text-orange-500 dark:text-orange-400" 
        : "text-orange-500 dark:text-orange-400";
    default:
      return "text-muted-foreground";
  }
}

function getBadgeVariant(urgency: 'overdue' | 'urgent' | 'warning' | 'normal') {
  switch (urgency) {
    case 'overdue':
      return 'destructive';
    case 'urgent':
      return 'destructive';
    case 'warning':
      return 'default';
    default:
      return 'outline';
  }
}

export default function CountdownTimer({ 
  targetDate, 
  isActive = true, 
  isTrial = false, 
  className, 
  compact = false 
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const urgency = getUrgencyLevel(timeRemaining);
  const urgencyStyle = getUrgencyStyle(urgency, isTrial);

  // Don't show timer for inactive subscriptions
  if (!isActive) {
    return (
      <div className={cn("flex items-center gap-2 text-xs sm:text-sm text-muted-foreground", className)}>
        <Calendar className="h-4 w-4 flex-shrink-0" />
        <span>Paused</span>
      </div>
    );
  }

  // Overdue
  if (timeRemaining.total <= 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs sm:text-sm", urgencyStyle, className)}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">
          {isTrial ? 'Trial expired' : 'Payment overdue'}
        </span>
        <Badge variant="destructive" className="text-xs">
          {isTrial ? 'Expired' : 'Overdue'}
        </Badge>
      </div>
    );
  }

  // Compact display for mobile or tight spaces
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", urgencyStyle, className)}>
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span className="flex-1">
          {timeRemaining.days > 0 && `${timeRemaining.days}d `}
          {(timeRemaining.days > 0 || timeRemaining.hours > 0) && `${timeRemaining.hours}h `}
          {timeRemaining.days === 0 && `${timeRemaining.minutes}m`}
        </span>
        {(urgency === 'urgent' || urgency === 'warning') && (
          <Badge variant={getBadgeVariant(urgency)} className="text-xs px-1 py-0">
            {urgency === 'urgent' ? 'Today' : 'Soon'}
          </Badge>
        )}
      </div>
    );
  }

  // Full display
  return (
    <div className={cn("flex items-center gap-2 text-xs sm:text-sm", urgencyStyle, className)}>
      <Clock className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-medium">
            {isTrial ? 'Trial ends:' : 'Renews:'}
          </span>
          <span className="tabular-nums">
            {timeRemaining.days > 0 && (
              <span>{timeRemaining.days}d </span>
            )}
            {(timeRemaining.days > 0 || timeRemaining.hours > 0) && (
              <span>{timeRemaining.hours}h </span>
            )}
            <span>{timeRemaining.minutes}m</span>
          </span>
        </div>
        {urgency !== 'normal' && (
          <div className="text-xs">
            {targetDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>
      {(urgency === 'urgent' || urgency === 'warning') && (
        <Badge variant={getBadgeVariant(urgency)} className="text-xs">
          {urgency === 'urgent' ? (timeRemaining.days === 0 ? 'Today' : 'Tomorrow') : 'Soon'}
        </Badge>
      )}
    </div>
  );
}