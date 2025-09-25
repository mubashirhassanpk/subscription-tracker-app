import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { UserPlus, ArrowLeft, Shield, User, CreditCard, Bell, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link, useLocation } from 'wouter';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
}

export default function AdminCreateUser() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'super_admin',
    planId: '',
    isActive: true,
    subscriptionStatus: 'trial' as 'active' | 'cancelled' | 'expired' | 'trial',
    sendWelcomeEmail: true,
    generateApiKey: false,
    initialSubscriptions: [] as string[], // Array of subscription IDs to assign
    notificationPreferences: {
      email: true,
      whatsapp: false,
      calendar: true,
      push: true
    }
  });

  // Get available plans
  const { data: plansData } = useQuery({
    queryKey: ['/api/plans'],
  });

  // Get available subscriptions for assignment
  const { data: subscriptionsData } = useQuery({
    queryKey: ['/api/subscriptions', 'all'],
    queryFn: () => fetch('/api/subscriptions?limit=100').then(res => res.json())
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      return await response.json();
    },
    onSuccess: (response) => {
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      navigate('/admin/users');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name, email, and password are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    createUserMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [field]: value
      }
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/users">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <UserPlus className="h-8 w-8" />
            <span>Create New User</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Add a new user to the system with customizable settings
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>Essential user account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  data-testid="input-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="user@example.com"
                  data-testid="input-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter secure password"
                  data-testid="input-password"
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  data-testid="switch-active"
                />
                <Label htmlFor="isActive">Active Account</Label>
              </div>
            </CardContent>
          </Card>

          {/* Role & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Role & Permissions</span>
              </CardTitle>
              <CardDescription>User access level and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'user' | 'admin' | 'super_admin') => handleInputChange('role', value)}
                >
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Additional Options</Label>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sendWelcomeEmail"
                    checked={formData.sendWelcomeEmail}
                    onCheckedChange={(checked) => handleInputChange('sendWelcomeEmail', checked)}
                    data-testid="switch-welcome-email"
                  />
                  <Label htmlFor="sendWelcomeEmail" className="text-sm">Send welcome email</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="generateApiKey"
                    checked={formData.generateApiKey}
                    onCheckedChange={(checked) => handleInputChange('generateApiKey', checked)}
                    data-testid="switch-api-key"
                  />
                  <Label htmlFor="generateApiKey" className="text-sm">Generate API key</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription & Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Subscription & Billing</span>
              </CardTitle>
              <CardDescription>Plan assignment and subscription settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select
                  value={formData.planId}
                  onValueChange={(value) => handleInputChange('planId', value)}
                >
                  <SelectTrigger data-testid="select-plan">
                    <SelectValue placeholder="Select plan (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Plan</SelectItem>
                    {Array.isArray(plansData) && plansData.map((plan: Plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price}/{plan.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Initial Status</Label>
                <Select
                  value={formData.subscriptionStatus}
                  onValueChange={(value: 'active' | 'cancelled' | 'expired' | 'trial') => 
                    handleInputChange('subscriptionStatus', value)
                  }
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Assign User Plans</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {subscriptionsData?.data && subscriptionsData.data.length > 0 ? (
                    subscriptionsData.data.map((subscription: any) => (
                      <div key={subscription.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`subscription-${subscription.id}`}
                          checked={formData.initialSubscriptions.includes(subscription.id)}
                          onChange={(e) => {
                            const subscriptionId = subscription.id;
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                initialSubscriptions: [...prev.initialSubscriptions, subscriptionId]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                initialSubscriptions: prev.initialSubscriptions.filter(id => id !== subscriptionId)
                              }));
                            }
                          }}
                          className="h-4 w-4"
                          data-testid={`checkbox-subscription-${subscription.id}`}
                        />
                        <label 
                          htmlFor={`subscription-${subscription.id}`} 
                          className="text-sm flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{subscription.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ${subscription.cost}/{subscription.billingCycle} • {subscription.category}
                          </div>
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      No user plans available to assign
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assign plans that the user has purchased or is on trial for
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>Default notification settings for the user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Subscription reminders via email</p>
                  </div>
                  <Switch
                    checked={formData.notificationPreferences.email}
                    onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    data-testid="switch-email-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">WhatsApp Notifications</Label>
                    <p className="text-xs text-muted-foreground">Reminders via WhatsApp</p>
                  </div>
                  <Switch
                    checked={formData.notificationPreferences.whatsapp}
                    onCheckedChange={(checked) => handleNotificationChange('whatsapp', checked)}
                    data-testid="switch-whatsapp-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Calendar Integration</Label>
                    <p className="text-xs text-muted-foreground">Add to Google Calendar</p>
                  </div>
                  <Switch
                    checked={formData.notificationPreferences.calendar}
                    onCheckedChange={(checked) => handleNotificationChange('calendar', checked)}
                    data-testid="switch-calendar-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch
                    checked={formData.notificationPreferences.push}
                    onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                    data-testid="switch-push-notifications"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Link href="/admin/users">
            <Button variant="outline" type="button" data-testid="button-cancel">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={createUserMutation.isPending}
            data-testid="button-create-user"
          >
            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
}