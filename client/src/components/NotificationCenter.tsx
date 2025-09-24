import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Check, AlertTriangle, Info, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

function getNotificationIcon(type: string, priority: string) {
  const iconClass = cn(
    "h-4 w-4",
    priority === "urgent" && "text-red-500",
    priority === "high" && "text-orange-500",
    priority === "normal" && "text-blue-500",
    priority === "low" && "text-gray-500"
  );

  switch (type) {
    case 'cost_alert':
    case 'cost_optimization':
      return <DollarSign className={iconClass} />;
    case 'renewal_warning':
    case 'subscription_reminder':
      return <Calendar className={iconClass} />;
    case 'spending_pattern':
    case 'category_analysis':
      return <TrendingUp className={iconClass} />;
    case 'ai_insight':
      return <Info className={iconClass} />;
    case 'chrome_sync':
      return <Info className={iconClass} />;
    default:
      return <Bell className={iconClass} />;
  }
}

function getPriorityBadgeVariant(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    case 'normal':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('POST', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const handleMarkAsRead = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0 min-w-[1rem] rounded-full border border-background z-10"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[65vw] sm:w-96 max-w-xs p-0 mx-8" 
        align="end"
        side="bottom"
        sideOffset={12}
        data-testid="popover-notifications"
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 px-2 py-1">
            <h3 className="font-semibold text-xs" data-testid="text-notifications-title">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                Mark all read
              </Button>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[30vh] sm:h-80 max-h-80">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex flex-col sm:flex-row items-start gap-1 p-1.5 hover-elevate transition-colors border-b border-border last:border-b-0",
                        !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
                      )}
                      data-testid={`notification-${notification.id}`}
                    >
                      {/* Mobile layout - stacked */}
                      <div className="flex items-start gap-1 w-full sm:hidden">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-0.5 mb-0.5">
                            <h4 className="text-xs font-medium leading-tight flex-1 pr-1 line-clamp-1">
                              {notification.title}
                            </h4>
                            <Badge
                              variant={getPriorityBadgeVariant(notification.priority)}
                              className="text-xs whitespace-nowrap flex-shrink-0"
                            >
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug mb-0.5 break-words line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                            <span className="capitalize flex-shrink-0 text-xs">{notification.type.replace('_', ' ')}</span>
                            <span className="text-right flex-shrink-0 ml-1 text-xs">
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 px-1.5"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                disabled={markAsReadMutation.isPending}
                                data-testid={`button-mark-read-${notification.id}`}
                              >
                                <Check className="h-2.5 w-2.5 mr-0.5" />
                                Read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-1.5"
                              onClick={(e) => handleDelete(notification.id, e)}
                              disabled={deleteNotificationMutation.isPending}
                              data-testid={`button-delete-${notification.id}`}
                            >
                              <X className="h-2.5 w-2.5 mr-0.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop layout - horizontal */}
                      <div className="hidden sm:flex items-start gap-3 w-full">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-medium leading-tight flex-1 pr-2">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge
                                variant={getPriorityBadgeVariant(notification.priority)}
                                className="text-xs whitespace-nowrap"
                              >
                                {notification.priority}
                              </Badge>
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 flex-shrink-0"
                                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                                  disabled={markAsReadMutation.isPending}
                                  data-testid={`button-mark-read-${notification.id}`}
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={(e) => handleDelete(notification.id, e)}
                                disabled={deleteNotificationMutation.isPending}
                                data-testid={`button-delete-${notification.id}`}
                                title="Delete notification"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-full break-words">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                            <span className="capitalize flex-shrink-0">{notification.type.replace('_', ' ')}</span>
                            <span className="text-right flex-shrink-0 ml-2">
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// AI Insights trigger component
export function AIInsightsButton() {
  const queryClient = useQueryClient();

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/notifications/insights/generate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => generateInsightsMutation.mutate()}
      disabled={generateInsightsMutation.isPending}
      data-testid="button-generate-insights"
      className="gap-2"
    >
      {generateInsightsMutation.isPending ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Analyzing...
        </>
      ) : (
        <>
          <TrendingUp className="h-4 w-4" />
          Get AI Insights
        </>
      )}
    </Button>
  );
}