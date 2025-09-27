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
  Zap,
  Info,
  BookOpen,
  Key,
  Link2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const reminderSettingsSchema = z.object({
  // Email settings
  emailEnabled: z.boolean(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  emailProvider: z.enum(['resend', 'smtp']),
  emailTemplate: z.enum(['professional', 'casual', 'minimal']),
  resendApiKey: z.string().optional(),
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
    queryKey: ['/api/reminders/preferences']
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
      emailProvider: 'resend',
      emailTemplate: 'professional',
      resendApiKey: '',
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
    if (preferences && (preferences as any)?.preferences) {
      const prefs = (preferences as any).preferences;
      form.reset({
        emailEnabled: prefs.emailEnabled || false,
        emailAddress: prefs.emailAddress || '',
        emailProvider: prefs.emailProvider || 'resend',
        emailTemplate: prefs.emailTemplate || 'professional',
        resendApiKey: '', // Don't populate encrypted API key for security
        smtpHost: prefs.smtpHost || '',
        smtpPort: prefs.smtpPort || 587,
        smtpUsername: prefs.smtpUsername || '',
        
        googleCalendarEnabled: prefs.googleCalendarEnabled || false,
        googleCalendarId: prefs.googleCalendarId || '',
        
        whatsappEnabled: prefs.whatsappEnabled || false,
        whatsappNumber: prefs.whatsappNumber || '',
        whatsappBusinessAccountId: prefs.whatsappBusinessAccountId || '',
        whatsappPhoneNumberId: prefs.whatsappPhoneNumberId || '',
        
        reminderDaysBefore: prefs.reminderDaysBefore || [7, 3, 1],
        reminderTime: prefs.reminderTime || '09:00',
        timezone: prefs.timezone || 'UTC',
        includeSpendingSummary: prefs.includeSpendingSummary !== false,
        includeActionButtons: prefs.includeActionButtons !== false
      });
    }
  }, [preferences, form]);

  // Update connection statuses based on preferences
  useEffect(() => {
    if (preferences && (preferences as any)?.preferences) {
      const prefs = (preferences as any).preferences;
      const statuses: ConnectionStatus[] = [
        {
          service: 'Email',
          connected: prefs.emailEnabled && !!prefs.emailAddress,
          error: !prefs.emailAddress && prefs.emailEnabled ? 'Email address not configured' : undefined
        },
        {
          service: 'Google Calendar',
          connected: prefs.googleCalendarEnabled && !!prefs.googleAccessToken,
          error: !prefs.googleAccessToken && prefs.googleCalendarEnabled ? 'Not connected to Google Calendar' : undefined
        },
        {
          service: 'WhatsApp',
          connected: prefs.whatsappEnabled && !!prefs.whatsappAccessTokenEncrypted,
          error: !prefs.whatsappAccessTokenEncrypted && prefs.whatsappEnabled ? 'WhatsApp Business API not configured' : undefined
        }
      ];
      setConnectionStatuses(statuses);
    }
  }, [preferences]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: ReminderSettingsForm) => {
      return apiRequest('PUT', '/api/reminders/preferences', data);
    },
    onSuccess: () => {
      toast({
        title: 'Settings saved',
        description: 'Your reminder preferences have been updated.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/preferences'] });
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
      const response = await apiRequest('POST', `/api/test-connection/${service.toLowerCase()}`, settings);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Connection test failed');
      }
      
      return data;
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
    mutationFn: () => apiRequest('GET', '/api/auth/google/calendar'),
    onSuccess: (data: any) => {
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=500,height=600');
      }
      // Poll for completion
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/reminders/preferences'] });
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
          emailEnabled: true,
          emailAddress: formData.emailAddress,
          emailProvider: formData.emailProvider,
          resendApiKey: formData.resendApiKey,
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
                    {/* API Keys Notice */}
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">📧 Email Setup Required</p>
                          <p className="text-sm">
                            To send email reminders, you need to configure your Resend API key first.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('/settings?tab=api-keys', '_blank')}
                              className="flex items-center gap-1"
                            >
                              <Key className="h-3 w-3" />
                              Configure API Keys
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>

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
                          <SelectItem value="resend">Resend (Recommended)</SelectItem>
                          <SelectItem value="smtp">Custom SMTP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.watch('emailProvider') === 'resend' && (
                      <div>
                        <Label htmlFor="resendApiKey">Resend API Key</Label>
                        <Input
                          id="resendApiKey"
                          type="password"
                          placeholder="Enter your Resend API key (starts with re_...)"
                          value={form.watch('resendApiKey') || ''}
                          onChange={(e) => form.setValue('resendApiKey', e.target.value)}
                          data-testid="input-resend-api-key"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          🔒 Your API key will be encrypted and stored securely
                        </p>
                      </div>
                    )}

                    {form.watch('emailProvider') === 'smtp' && (
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">SMTP Configuration</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open('https://www.gmass.co/blog/gmail-smtp/', '_blank')}
                            className="flex items-center gap-1 text-xs"
                          >
                            <BookOpen className="h-3 w-3" />
                            SMTP Guide
                          </Button>
                        </div>
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
                {/* Google Calendar Setup Guide */}
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">📅 Google Calendar Setup Guide:</p>
                      
                      <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Info className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="ml-2">
                            <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              🔧 Administrator Setup Required
                            </h5>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              The app administrator needs to configure Google OAuth credentials first.
                            </p>
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm font-medium hover:text-blue-800 dark:hover:text-blue-200">
                                📋 Administrator Setup Instructions
                              </summary>
                              <div className="mt-2 space-y-2 text-xs">
                                <div>
                                  <p><strong>Step 1: Go to Google Cloud Console</strong></p>
                                  <p>→ <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">https://console.cloud.google.com/apis/credentials</a></p>
                                </div>
                                
                                <div>
                                  <p><strong>Step 2: Create OAuth 2.0 Credentials</strong></p>
                                  <p>→ Click "Create Credentials" → "OAuth 2.0 Client IDs"</p>
                                  <p>→ Application type: "Web application"</p>
                                </div>
                                
                                <div>
                                  <p><strong>Step 3: Configure Redirect URIs</strong></p>
                                  <p>→ Add: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">https://subtacker.uk/api/auth/google/callback</code></p>
                                  <p>→ Add: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">http://localhost:5000/api/auth/google/callback</code></p>
                                </div>
                                
                                <div>
                                  <p><strong>Step 4: Add to Replit Secrets</strong></p>
                                  <p>→ Go to Replit project → Secrets tab (🔒)</p>
                                  <p>→ Add: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">GOOGLE_CLIENT_ID</code></p>
                                  <p>→ Add: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">GOOGLE_CLIENT_SECRET</code></p>
                                </div>
                                
                                <div>
                                  <p><strong>Step 5: Enable Google Calendar API</strong></p>
                                  <p>→ <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">Enable Calendar API</a></p>
                                </div>
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">👤 For Users:</p>
                      <ol className="text-sm space-y-1 ml-4">
                        <li>1. Enable Google Calendar sync below</li>
                        <li>2. Click "Connect Google Calendar" to authorize your personal account</li>
                        <li>3. Choose which calendar to sync (optional)</li>
                        <li>4. Test the connection to ensure it's working</li>
                      </ol>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://support.google.com/calendar/answer/37100', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <BookOpen className="h-3 w-3" />
                          Calendar Help
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://calendar.google.com/calendar/u/0/settings/export', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Calendar Settings
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

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
                    {!(preferences as any)?.preferences?.googleAccessToken ? (
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
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-500">
                          Specify a calendar ID to create events in a specific calendar
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open('https://support.google.com/calendar/answer/37103', '_blank')}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Info className="h-3 w-3" />
                          Find Calendar ID
                        </Button>
                      </div>
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
                {/* WhatsApp Setup Guide */}
                <Alert>
                  <MessageSquare className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">📱 WhatsApp Business API Setup Guide:</p>
                      <ol className="text-sm space-y-1 ml-4">
                        <li>1. Create a Meta Business account at <strong>business.facebook.com</strong></li>
                        <li>2. Set up WhatsApp Business API in Meta Business Manager</li>
                        <li>3. Get your Phone Number ID and Access Token from the dashboard</li>
                        <li>4. Add your phone number and credentials below</li>
                        <li>5. Test the connection to ensure messages can be sent</li>
                      </ol>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://business.whatsapp.com/products/business-api', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          WhatsApp Business API
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/getting-started', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <BookOpen className="h-3 w-3" />
                          Developer Guide
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://business.facebook.com/', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <Key className="h-3 w-3" />
                          Meta Business
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

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
            {/* Browser & Mobile Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Browser & Mobile
                </CardTitle>
                <CardDescription>
                  Push notifications and browser extensions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Chrome Extension Setup Guide */}
                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">🧩 Chrome Extension Setup Guide:</p>
                      <ol className="text-sm space-y-1 ml-4">
                        <li>1. Download the Subscription Tracker extension from the Chrome Web Store</li>
                        <li>2. Install and pin the extension to your browser toolbar</li>
                        <li>3. Click the extension icon and enter your app URL and API key</li>
                        <li>4. Enable sync to see your subscriptions in the extension popup</li>
                        <li>5. Test the connection to ensure data syncs properly</li>
                      </ol>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('chrome-extension://popup/popup.html', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open Extension
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('/api-keys', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <Key className="h-3 w-3" />
                          Get API Key
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <Label htmlFor="browserNotifications">Browser Notifications</Label>
                  <Switch 
                    id="browserNotifications"
                    checked={true}
                    onCheckedChange={() => {}}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="chromeExtensionSync">Chrome Extension Sync</Label>
                  <Switch 
                    id="chromeExtensionSync"
                    checked={true}
                    onCheckedChange={() => {}}
                  />
                </div>
              </CardContent>
            </Card>

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
                {/* Timing Settings Guide */}
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">⏰ Timing Settings Guide:</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• <strong>Reminder Time:</strong> Daily time for notifications (e.g., 9:00 AM)</li>
                        <li>• <strong>Timezone:</strong> Your local timezone for accurate timing</li>
                        <li>• <strong>Days Before:</strong> How many days before renewal to remind you</li>
                        <li>• <strong>Multiple Alerts:</strong> Get reminded 7, 3, and 1 day before renewal</li>
                      </ul>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://www.timeanddate.com/worldclock/', '_blank')}
                          className="flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          World Clock
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
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