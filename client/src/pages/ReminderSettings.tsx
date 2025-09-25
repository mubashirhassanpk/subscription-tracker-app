import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Mail, 
  MessageSquare, 
  Settings, 
  TestTube, 
  Shield, 
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Smartphone,
  Globe,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const reminderSettingsSchema = z.object({
  // Email settings
  emailEnabled: z.boolean(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  emailProvider: z.enum(['gmail', 'outlook', 'smtp']),
  emailTemplate: z.enum(['professional', 'casual', 'minimal']),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),

  // Google Calendar settings
  googleCalendarEnabled: z.boolean(),
  googleCalendarId: z.string().optional(),

  // WhatsApp settings
  whatsappEnabled: z.boolean(),
  whatsappNumber: z.string().optional(),
  whatsappBusinessAccountId: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),

  // General reminder settings
  reminderDaysBefore: z.array(z.number()),
  reminderTime: z.string(),
  timezone: z.string(),
  includeSpendingSummary: z.boolean(),
  includeActionButtons: z.boolean()
});

type ReminderSettingsForm = z.infer<typeof reminderSettingsSchema>;

interface ConnectionStatus {
  service: string;
  connected: boolean;
  lastTested?: Date;
  error?: string;
}

export default function ReminderSettings() {
  const [activeTab, setActiveTab] = useState('email');
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/notification-preferences']
  });

  // Fetch available timezones
  const { data: timezones } = useQuery({
    queryKey: ['/api/timezones']
  });

  // Form setup
  const form = useForm<ReminderSettingsForm>({
    resolver: zodResolver(reminderSettingsSchema),
    defaultValues: {
      emailEnabled: true,
      emailProvider: 'gmail',
      emailTemplate: 'professional',
      googleCalendarEnabled: false,
      whatsappEnabled: false,
      reminderDaysBefore: [7, 3, 1],
      reminderTime: '09:00',
      timezone: 'UTC',
      includeSpendingSummary: true,
      includeActionButtons: true
    }
  });

  // Update form when preferences are loaded
  useEffect(() => {
    if (preferences) {
      form.reset({
        emailEnabled: preferences.emailEnabled,
        emailAddress: preferences.emailAddress || '',
        emailProvider: preferences.emailProvider || 'gmail',
        emailTemplate: preferences.emailTemplate || 'professional',
        smtpHost: preferences.smtpHost || '',
        smtpPort: preferences.smtpPort || 587,
        smtpUsername: preferences.smtpUsername || '',
        
        googleCalendarEnabled: preferences.googleCalendarEnabled,
        googleCalendarId: preferences.googleCalendarId || '',
        
        whatsappEnabled: preferences.whatsappEnabled,
        whatsappNumber: preferences.whatsappNumber || '',
        whatsappBusinessAccountId: preferences.whatsappBusinessAccountId || '',
        whatsappPhoneNumberId: preferences.whatsappPhoneNumberId || '',
        
        reminderDaysBefore: preferences.reminderDaysBefore || [7, 3, 1],
        reminderTime: preferences.reminderTime || '09:00',
        timezone: preferences.timezone || 'UTC',
        includeSpendingSummary: preferences.includeSpendingSummary !== false,
        includeActionButtons: preferences.includeActionButtons !== false
      });
    }
  }, [preferences, form]);

  // Update connection statuses based on preferences
  useEffect(() => {
    if (preferences) {
      const statuses: ConnectionStatus[] = [
        {
          service: 'Email',
          connected: preferences.emailEnabled && !!preferences.emailAddress,
          error: !preferences.emailAddress && preferences.emailEnabled ? 'Email address not configured' : undefined
        },
        {
          service: 'Google Calendar',
          connected: preferences.googleCalendarEnabled && !!preferences.googleAccessToken,
          error: !preferences.googleAccessToken && preferences.googleCalendarEnabled ? 'Not connected to Google Calendar' : undefined
        },
        {
          service: 'WhatsApp',
          connected: preferences.whatsappEnabled && !!preferences.whatsappAccessTokenEncrypted,
          error: !preferences.whatsappAccessTokenEncrypted && preferences.whatsappEnabled ? 'WhatsApp Business API not configured' : undefined
        }
      ];
      setConnectionStatuses(statuses);
    }
  }, [preferences]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: ReminderSettingsForm) => {
      return apiRequest('/api/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings saved',
        description: 'Your reminder preferences have been updated.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async ({ service, settings }: { service: string; settings: any }) => {
      return apiRequest(`/api/test-connection/${service.toLowerCase()}`, {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    },
    onSuccess: (data, { service }) => {
      toast({
        title: `${service} connection successful`,
        description: 'Test message sent successfully!'
      });
      // Update connection status
      setConnectionStatuses(prev => 
        prev.map(status => 
          status.service === service 
            ? { ...status, connected: true, lastTested: new Date(), error: undefined }
            : status
        )
      );
    },
    onError: (error: any, { service }) => {
      toast({
        title: `${service} connection failed`,
        description: error.message,
        variant: 'destructive'
      });
      // Update connection status
      setConnectionStatuses(prev => 
        prev.map(status => 
          status.service === service 
            ? { ...status, connected: false, error: error.message }
            : status
        )
      );
    },
    onSettled: () => {
      setIsTestingConnection(null);
    }
  });

  // Google Calendar OAuth initiation
  const initiateGoogleOAuth = useMutation({
    mutationFn: () => apiRequest('/api/auth/google/calendar', { method: 'GET' }),
    onSuccess: (data) => {
      window.open(data.authUrl, '_blank', 'width=500,height=600');
      // Poll for completion
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      }, 2000);
      
      setTimeout(() => clearInterval(pollInterval), 30000); // Stop polling after 30 seconds
    }
  });

  const onSubmit = (data: ReminderSettingsForm) => {
    saveSettingsMutation.mutate(data);
  };

  const handleTestConnection = (service: string) => {
    const formData = form.getValues();
    setIsTestingConnection(service);
    
    let settings: any = {};
    
    switch (service) {
      case 'Email':
        settings = {
          emailAddress: formData.emailAddress,
          emailProvider: formData.emailProvider,
          smtpHost: formData.smtpHost,
          smtpPort: formData.smtpPort,
          smtpUsername: formData.smtpUsername,
          smtpPassword: formData.smtpPassword
        };
        break;
      case 'WhatsApp':
        settings = {
          whatsappNumber: formData.whatsappNumber,
          whatsappBusinessAccountId: formData.whatsappBusinessAccountId,
          whatsappPhoneNumberId: formData.whatsappPhoneNumberId,
          whatsappAccessToken: formData.whatsappAccessToken
        };
        break;
    }
    
    testConnectionMutation.mutate({ service, settings });
  };

  const getConnectionIcon = (connected: boolean, error?: string) => {
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (connected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reminder Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure how and when you want to receive subscription renewal reminders
        </p>
      </div>

      {/* Connection Status Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Integration Status
          </CardTitle>
          <CardDescription>
            Overview of your connected notification services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {connectionStatuses.map((status) => (
              <div key={status.service} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getConnectionIcon(status.connected, status.error)}
                  <div>
                    <div className="font-medium">{status.service}</div>
                    {status.error && (
                      <div className="text-sm text-red-500">{status.error}</div>
                    )}
                    {status.connected && !status.error && (
                      <div className="text-sm text-green-600">Connected</div>
                    )}
                  </div>
                </div>
                <Badge variant={status.connected ? "default" : "secondary"}>
                  {status.connected ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              General
            </TabsTrigger>
          </TabsList>

          {/* Email Settings Tab */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Configure email reminders with professional templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailEnabled">Enable email notifications</Label>
                  <Switch 
                    id="emailEnabled"
                    {...form.register('emailEnabled')}
                    checked={form.watch('emailEnabled')}
                    onCheckedChange={(checked) => form.setValue('emailEnabled', checked)}
                  />
                </div>

                {form.watch('emailEnabled') && (
                  <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                    <div>
                      <Label htmlFor="emailAddress">Email Address</Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        placeholder="your@email.com"
                        {...form.register('emailAddress')}
                        data-testid="input-email-address"
                      />
                    </div>

                    <div>
                      <Label htmlFor="emailProvider">Email Provider</Label>
                      <Select 
                        value={form.watch('emailProvider')} 
                        onValueChange={(value: any) => form.setValue('emailProvider', value)}
                      >
                        <SelectTrigger data-testid="select-email-provider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                          <SelectItem value="smtp">Custom SMTP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.watch('emailProvider') === 'smtp' && (
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <h4 className="font-medium">SMTP Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                              id="smtpHost"
                              placeholder="smtp.example.com"
                              {...form.register('smtpHost')}
                              data-testid="input-smtp-host"
                            />
                          </div>
                          <div>
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                              id="smtpPort"
                              type="number"
                              placeholder="587"
                              {...form.register('smtpPort', { valueAsNumber: true })}
                              data-testid="input-smtp-port"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="smtpUsername">Username</Label>
                          <Input
                            id="smtpUsername"
                            placeholder="username"
                            {...form.register('smtpUsername')}
                            data-testid="input-smtp-username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtpPassword">Password</Label>
                          <Input
                            id="smtpPassword"
                            type="password"
                            placeholder="app password or regular password"
                            {...form.register('smtpPassword')}
                            data-testid="input-smtp-password"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="emailTemplate">Email Template Style</Label>
                      <Select 
                        value={form.watch('emailTemplate')} 
                        onValueChange={(value: any) => form.setValue('emailTemplate', value)}
                      >
                        <SelectTrigger data-testid="select-email-template">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleTestConnection('Email')}
                        disabled={!form.watch('emailAddress') || isTestingConnection === 'Email'}
                        className="flex items-center gap-2"
                        data-testid="button-test-email"
                      >
                        <TestTube className="h-4 w-4" />
                        {isTestingConnection === 'Email' ? 'Testing...' : 'Test Email'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Google Calendar Integration
                </CardTitle>
                <CardDescription>
                  Automatically create calendar events for subscription renewals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="googleCalendarEnabled">Enable Google Calendar sync</Label>
                  <Switch 
                    id="googleCalendarEnabled"
                    checked={form.watch('googleCalendarEnabled')}
                    onCheckedChange={(checked) => form.setValue('googleCalendarEnabled', checked)}
                  />
                </div>

                {form.watch('googleCalendarEnabled') && (
                  <div className="space-y-4 pl-6 border-l-2 border-green-200">
                    {!preferences?.googleAccessToken ? (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>Connect your Google account to enable calendar sync</span>
                          <Button
                            type="button"
                            onClick={() => initiateGoogleOAuth.mutate()}
                            className="flex items-center gap-2"
                            data-testid="button-connect-google"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Connect Google Calendar
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Google Calendar is connected and ready to create reminder events
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <Label htmlFor="googleCalendarId">Calendar (Optional)</Label>
                      <Input
                        id="googleCalendarId"
                        placeholder="Leave empty to use primary calendar"
                        {...form.register('googleCalendarId')}
                        data-testid="input-calendar-id"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Specify a calendar ID to create events in a specific calendar
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  WhatsApp Business Notifications
                </CardTitle>
                <CardDescription>
                  Send subscription reminders via WhatsApp Business API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="whatsappEnabled">Enable WhatsApp notifications</Label>
                  <Switch 
                    id="whatsappEnabled"
                    checked={form.watch('whatsappEnabled')}
                    onCheckedChange={(checked) => form.setValue('whatsappEnabled', checked)}
                  />
                </div>

                {form.watch('whatsappEnabled') && (
                  <div className="space-y-4 pl-6 border-l-2 border-green-200">
                    <Alert>
                      <Smartphone className="h-4 w-4" />
                      <AlertDescription>
                        WhatsApp Business API requires a Meta Business account. 
                        <a 
                          href="https://business.whatsapp.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          Set up here <ExternalLink className="h-3 w-3 inline" />
                        </a>
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label htmlFor="whatsappNumber">Your WhatsApp Number</Label>
                      <Input
                        id="whatsappNumber"
                        placeholder="+1234567890"
                        {...form.register('whatsappNumber')}
                        data-testid="input-whatsapp-number"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Include country code (e.g., +1 for US)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="whatsappBusinessAccountId">Business Account ID</Label>
                      <Input
                        id="whatsappBusinessAccountId"
                        placeholder="Your Meta Business Account ID"
                        {...form.register('whatsappBusinessAccountId')}
                        data-testid="input-business-account-id"
                      />
                    </div>

                    <div>
                      <Label htmlFor="whatsappPhoneNumberId">Phone Number ID</Label>
                      <Input
                        id="whatsappPhoneNumberId"
                        placeholder="WhatsApp Business Phone Number ID"
                        {...form.register('whatsappPhoneNumberId')}
                        data-testid="input-phone-number-id"
                      />
                    </div>

                    <div>
                      <Label htmlFor="whatsappAccessToken">Access Token</Label>
                      <Input
                        id="whatsappAccessToken"
                        type="password"
                        placeholder="Your WhatsApp Business API access token"
                        {...form.register('whatsappAccessToken')}
                        data-testid="input-whatsapp-token"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Get this from your Meta Business account dashboard
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestConnection('WhatsApp')}
                      disabled={!form.watch('whatsappNumber') || isTestingConnection === 'WhatsApp'}
                      className="flex items-center gap-2"
                      data-testid="button-test-whatsapp"
                    >
                      <TestTube className="h-4 w-4" />
                      {isTestingConnection === 'WhatsApp' ? 'Testing...' : 'Test WhatsApp'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Reminder Timing
                </CardTitle>
                <CardDescription>
                  Configure when and how often you want to be reminded
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reminderTime">Reminder Time</Label>
                  <Input
                    id="reminderTime"
                    type="time"
                    {...form.register('reminderTime')}
                    data-testid="input-reminder-time"
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={form.watch('timezone')} 
                    onValueChange={(value) => form.setValue('timezone', value)}
                  >
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label>Reminder Days Before Renewal</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[1, 3, 7, 14, 30].map((days) => (
                      <Label key={days} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.watch('reminderDaysBefore').includes(days)}
                          onChange={(e) => {
                            const current = form.watch('reminderDaysBefore');
                            if (e.target.checked) {
                              form.setValue('reminderDaysBefore', [...current, days].sort((a, b) => b - a));
                            } else {
                              form.setValue('reminderDaysBefore', current.filter(d => d !== days));
                            }
                          }}
                          data-testid={`checkbox-reminder-${days}`}
                        />
                        <span>{days} day{days > 1 ? 's' : ''}</span>
                      </Label>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Email Content Options</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="includeSpendingSummary">Include spending summary</Label>
                      <p className="text-sm text-gray-500">Show monthly total and subscription count in emails</p>
                    </div>
                    <Switch 
                      id="includeSpendingSummary"
                      checked={form.watch('includeSpendingSummary')}
                      onCheckedChange={(checked) => form.setValue('includeSpendingSummary', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="includeActionButtons">Include action buttons</Label>
                      <p className="text-sm text-gray-500">Add quick action buttons to manage subscriptions</p>
                    </div>
                    <Switch 
                      id="includeActionButtons"
                      checked={form.watch('includeActionButtons')}
                      onCheckedChange={(checked) => form.setValue('includeActionButtons', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={saveSettingsMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-save-settings"
          >
            <Zap className="h-4 w-4" />
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}