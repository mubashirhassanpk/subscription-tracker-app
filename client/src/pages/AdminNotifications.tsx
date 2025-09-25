import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Send, Users, Filter, Plus, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  targetType: 'all' | 'users' | 'admins' | 'specific';
  targetUserIds?: string[];
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  sentAt?: string;
  createdBy: string;
  createdByName: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  title: string;
  message: string;
}

export default function AdminNotifications() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const { toast } = useToast();

  // Form state for creating notifications
  const [formData, setFormData] = useState({
    type: 'announcement',
    title: '',
    message: '',
    targetType: 'all' as 'all' | 'users' | 'admins' | 'specific',
    targetUserIds: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery<{ 
    success: boolean; 
    data: { 
      notifications: Notification[], 
      pagination: { page: number, limit: number, total: number, totalPages: number } 
    } 
  }>({
    queryKey: ['/api/admin/notifications', currentPage, filterType],
    queryFn: () => fetch(`/api/admin/notifications?page=${currentPage}&limit=10&type=${filterType}`).then(res => res.json())
  });

  // Fetch notification templates
  const { data: templatesData } = useQuery<{ success: boolean; data: NotificationTemplate[] }>({
    queryKey: ['/api/admin/notification-templates'],
    queryFn: () => fetch('/api/admin/notification-templates').then(res => res.json())
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: (notificationData: any) => fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationData)
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Notification sent successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send notification',
        variant: 'destructive'
      });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => fetch(`/api/admin/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      toast({
        title: 'Success',
        description: 'Notification deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete notification',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      type: 'announcement',
      title: '',
      message: '',
      targetType: 'all',
      targetUserIds: [],
      priority: 'medium'
    });
    setSelectedTemplate('');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templatesData?.data.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        type: template.type,
        title: template.title,
        message: template.message
      }));
    }
  };

  const handleSendNotification = () => {
    sendNotificationMutation.mutate(formData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTargetDescription = (notification: Notification) => {
    switch (notification.targetType) {
      case 'all':
        return 'All Users';
      case 'users':
        return 'Regular Users';
      case 'admins':
        return 'Administrators';
      case 'specific':
        return `${notification.targetUserIds?.length || 0} Specific Users`;
      default:
        return 'Unknown';
    }
  };

  const notifications = notificationsData?.data.notifications || [];
  const pagination = notificationsData?.data.pagination;

  return (
    <div className="min-h-screen bg-background" data-testid="admin-notifications">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
          <h1 className="ml-4 text-2xl font-semibold text-foreground">Notification Management</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notifications.filter(n => 
                  n.sentAt && new Date(n.sentAt).toDateString() === new Date().toDateString()
                ).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <Bell className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notifications.filter(n => n.priority === 'high').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templatesData?.data.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48" data-testid="select-filter-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="announcement">Announcements</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="update">Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-notification" onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send New Notification</DialogTitle>
                <DialogDescription>Create and send a notification to users</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Template Selection */}
                <div className="grid gap-2">
                  <Label htmlFor="template">Use Template (Optional)</Label>
                  <Select value={selectedTemplate} onValueChange={(value) => {
                    setSelectedTemplate(value);
                    if (value) handleTemplateSelect(value);
                  }}>
                    <SelectTrigger data-testid="select-notification-template">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Template</SelectItem>
                      {templatesData?.data.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger data-testid="select-notification-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setFormData(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger data-testid="select-notification-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="target">Target Audience</Label>
                  <Select
                    value={formData.targetType}
                    onValueChange={(value: 'all' | 'users' | 'admins' | 'specific') => 
                      setFormData(prev => ({ ...prev, targetType: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-notification-target">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="users">Regular Users</SelectItem>
                      <SelectItem value="admins">Administrators</SelectItem>
                      <SelectItem value="specific">Specific Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Notification title"
                    data-testid="input-notification-title"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Notification message"
                    rows={4}
                    data-testid="textarea-notification-message"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSendNotification}
                  disabled={sendNotificationMutation.isPending || !formData.title || !formData.message}
                  data-testid="button-send-notification"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Notifications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sent Notifications ({pagination?.total || 0})</CardTitle>
            <CardDescription>Manage all system notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Table data-testid="table-notifications">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{notification.title}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-48">
                            {notification.message}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getTargetDescription(notification)}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {notification.sentAt ? formatDate(notification.sentAt) : 'Not sent'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {notification.createdByName}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" data-testid={`button-view-${notification.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            disabled={deleteNotificationMutation.isPending}
                            data-testid={`button-delete-${notification.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {pagination && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total notifications)
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= (pagination.totalPages || 1)}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}