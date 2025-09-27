import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  Bell, 
  Shield, 
  Palette, 
  Key,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Mail,
  MessageSquare,
  TestTube,
  Clock,
  XCircle,
  Info,
  BookOpen,
  Link2,
  Smartphone,
  Globe,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const reminderSettingsSchema = z.object({
  // Email settings
  emailEnabled: z.boolean(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  emailProvider: z.enum(['resend', 'smtp']),
  emailDomain: z.enum(['custom', 'default']),
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

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    browser: boolean;
    reminders: boolean;
  };
  privacy: {
    dataCollection: boolean;
    analytics: boolean;
  };
}

interface StripeSettings {
  configured: boolean;
  publicKey: string;
  testMode: boolean;
}

interface UserExternalApiKey {
  id: string;
  service: string;
  keyValue: string;
  hasKey: boolean;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get initial tab from URL parameters
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'general';
  });
  
  const [userSettings, setUserSettings] = useState<UserSettings>({
    theme: 'system',
    notifications: {
      email: true,
      browser: true,
      reminders: true,
    },
    privacy: {
      dataCollection: false,
      analytics: false,
    }
  });

  // API Key form states
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isShowingGeminiKey, setIsShowingGeminiKey] = useState(false);
  const [resendApiKey, setResendApiKey] = useState('');
  const [isShowingResendKey, setIsShowingResendKey] = useState(false);

  // Reminder settings state
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === 'general') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', activeTab);
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  // Fetch user account info
  const { data: userStatus } = useQuery({
    queryKey: ['/api/account'],
    refetchOnWindowFocus: false,
  });

  // Fetch user's external API keys
  const { data: userApiKeys, refetch: refetchApiKeys } = useQuery({
    queryKey: ['/api/user-external-api-keys'],
    refetchOnWindowFocus: false,
  });

  // Fetch configuration status from server
  const { data: apiKeysStatus } = useQuery({
    queryKey: ['/api/config/status'],
    refetchOnWindowFocus: false,
  });

  // Fetch current notification preferences for reminders
  const { data: reminderPreferences, isLoading: isLoadingReminders } = useQuery({
    queryKey: ['/api/reminders/preferences']
  });

  // Fetch available timezones
  const { data: timezones } = useQuery({
    queryKey: ['/api/timezones']
  });

  // Form setup for reminders
  const reminderForm = useForm<ReminderSettingsForm>({
    resolver: zodResolver(reminderSettingsSchema),
    defaultValues: {
      emailEnabled: true,
      emailProvider: 'resend',
      emailDomain: 'custom',
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

  // Effects for reminder settings
  useEffect(() => {
    if (reminderPreferences && (reminderPreferences as any)?.preferences) {
      const prefs = (reminderPreferences as any).preferences;
      reminderForm.reset({
        emailEnabled: prefs.emailEnabled || false,
        emailAddress: prefs.emailAddress || '',
        emailProvider: prefs.emailProvider || 'resend',
        emailDomain: prefs.emailDomain || 'custom',
        emailTemplate: prefs.emailTemplate || 'professional',
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
  }, [reminderPreferences, reminderForm]);

  // Update connection statuses based on preferences and API keys
  useEffect(() => {
    if (reminderPreferences && (reminderPreferences as any)?.preferences) {
      const prefs = (reminderPreferences as any).preferences;
      
      // Check if Resend API key is configured
      const resendApiKey = (userApiKeys as any)?.find((key: any) => key.service === 'resend');
      const hasResendKey = resendApiKey?.hasKey || false;
      
      // Determine email connection status
      let emailConnected = false;
      let emailError = undefined;
      
      if (prefs.emailEnabled) {
        if (!prefs.emailAddress) {
          emailError = 'Email address not configured';
        } else if (prefs.emailProvider === 'resend' && !hasResendKey) {
          emailError = 'Resend API key not configured';
        } else if (prefs.emailProvider === 'smtp' && (!prefs.smtpHost || !prefs.smtpUsername)) {
          emailError = 'SMTP settings not configured';
        } else {
          emailConnected = true;
        }
      }
      
      const statuses: ConnectionStatus[] = [
        {
          service: 'Email',
          connected: emailConnected,
          error: emailError
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
  }, [reminderPreferences, userApiKeys]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: UserSettings) => {
      // In a real app, this would save to backend
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    },
  });

  // Save reminder settings mutation
  const saveReminderSettingsMutation = useMutation({
    mutationFn: async (data: ReminderSettingsForm) => {
      return apiRequest('PUT', '/api/reminders/preferences', data);
    },
    onSuccess: () => {
      toast({
        title: 'Reminder settings saved',
        description: 'Your reminder preferences have been updated.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/preferences'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving reminder settings',
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
      // Parse and clean the error message
      let cleanErrorMessage = error.message;
      
      // Extract meaningful message from JSON error responses
      if (error.message && error.message.includes('{"success":false')) {
        try {
          const match = error.message.match(/"message":"([^"]+)"/);
          if (match && match[1]) {
            cleanErrorMessage = match[1];
          }
        } catch (e) {
          // If parsing fails, extract after the colon
          const colonIndex = error.message.indexOf(':');
          if (colonIndex > -1) {
            cleanErrorMessage = error.message.substring(colonIndex + 1).trim();
          }
        }
      }
      
      // Check if this is a Resend API key not configured error
      const isApiKeyError = cleanErrorMessage && cleanErrorMessage.includes('API key not configured');
      
      if (isApiKeyError && service === 'Email') {
        toast({
          title: "🔑 API Key Required",
          description: "To test email functionality, you need to configure your Resend API key first. Go to Settings → API Keys to set it up.",
          variant: 'default'
        });
        
        // Automatically open the API keys page for convenience
        setTimeout(() => {
          setActiveTab('api-keys');
        }, 2000);
        
        // Set a clean error message for display
        cleanErrorMessage = "Resend API key not configured";
      } else {
        toast({
          title: `${service} connection failed`,
          description: cleanErrorMessage,
          variant: 'destructive'
        });
      }
      
      // Update connection status with clean error message
      setConnectionStatuses(prev => 
        prev.map(status => 
          status.service === service 
            ? { ...status, connected: false, error: cleanErrorMessage }
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

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(userSettings);
  };

  const onSubmitReminders = (data: ReminderSettingsForm) => {
    saveReminderSettingsMutation.mutate(data);
  };

  const handleTestConnection = (service: string) => {
    const formData = reminderForm.getValues();
    setIsTestingConnection(service);
    
    let settings: any = {};
    
    switch (service) {
      case 'Email':
        settings = {
          emailEnabled: true,
          emailAddress: formData.emailAddress,
          emailProvider: formData.emailProvider,
          emailDomain: formData.emailDomain,
          emailTemplate: formData.emailTemplate,
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

  const openApiKeysPage = () => {
    window.open('/api-keys', '_blank');
  };

  // Save API Key mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async ({ service, keyValue }: { service: string; keyValue: string }) => {
      return apiRequest('POST', '/api/user-external-api-keys', { service, keyValue, isActive: true });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "API Key saved",
        description: `Your ${variables.service} API key has been saved successfully.`,
      });
      refetchApiKeys();
      queryClient.invalidateQueries({ queryKey: ['/api/config/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-external-api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/preferences'] });
      // Clear the input field
      if (variables.service === 'gemini') {
        setGeminiApiKey('');
        setIsShowingGeminiKey(false);
      } else if (variables.service === 'resend') {
        setResendApiKey('');
        setIsShowingResendKey(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error saving API key",
        description: error.message || "Failed to save the API key. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete API Key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (service: string) => {
      return apiRequest('DELETE', `/api/user-external-api-keys/${service}`);
    },
    onSuccess: (data, service) => {
      toast({
        title: "API Key removed",
        description: `Your ${service} API key has been removed.`,
      });
      refetchApiKeys();
      queryClient.invalidateQueries({ queryKey: ['/api/config/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-external-api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/preferences'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing API key",
        description: error.message || "Failed to remove the API key. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveGeminiKey = () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "Invalid API key",
        description: "Please enter a valid Gemini API key.",
        variant: "destructive",
      });
      return;
    }
    saveApiKeyMutation.mutate({ service: 'gemini', keyValue: geminiApiKey.trim() });
  };

  const handleDeleteGeminiKey = () => {
    deleteApiKeyMutation.mutate('gemini');
  };

  const handleSaveResendKey = () => {
    if (!resendApiKey.trim()) {
      toast({
        title: "Invalid API key",
        description: "Please enter a valid Resend API key.",
        variant: "destructive",
      });
      return;
    }
    saveApiKeyMutation.mutate({ service: 'resend', keyValue: resendApiKey.trim() });
  };

  const handleDeleteResendKey = () => {
    deleteApiKeyMutation.mutate('resend');
  };

  const getGeminiApiKey = () => {
    return (userApiKeys as UserExternalApiKey[])?.find((key: UserExternalApiKey) => key.service === 'gemini');
  };

  const getResendApiKey = () => {
    return (userApiKeys as UserExternalApiKey[])?.find((key: UserExternalApiKey) => key.service === 'resend');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select 
                  value={userSettings.theme} 
                  onValueChange={(value: 'light' | 'dark' | 'system') => 
                    setUserSettings(prev => ({ ...prev, theme: value }))
                  }
                >
                  <SelectTrigger data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive subscription reminders via email
                  </p>
                </div>
                <Switch
                  checked={userSettings.notifications.email}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({ 
                      ...prev, 
                      notifications: { ...prev.notifications, email: checked }
                    }))
                  }
                  data-testid="switch-email-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Browser notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show browser notifications for important updates
                  </p>
                </div>
                <Switch
                  checked={userSettings.notifications.browser}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({ 
                      ...prev, 
                      notifications: { ...prev.notifications, browser: checked }
                    }))
                  }
                  data-testid="switch-browser-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Renewal reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified before subscriptions renew
                  </p>
                </div>
                <Switch
                  checked={userSettings.notifications.reminders}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({ 
                      ...prev, 
                      notifications: { ...prev.notifications, reminders: checked }
                    }))
                  }
                  data-testid="switch-renewal-reminders"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminders Settings */}
        <TabsContent value="reminders" className="space-y-6">
          {/* Connection Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
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

          <form onSubmit={reminderForm.handleSubmit(onSubmitReminders)} className="space-y-6">
            <Tabs defaultValue="email" className="space-y-6">
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
                        {...reminderForm.register('emailEnabled')}
                        checked={reminderForm.watch('emailEnabled')}
                        onCheckedChange={(checked) => reminderForm.setValue('emailEnabled', checked)}
                      />
                    </div>

                    {reminderForm.watch('emailEnabled') && (
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
                                  onClick={() => setActiveTab('api-keys')}
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
                            {...reminderForm.register('emailAddress')}
                            data-testid="input-email-address"
                          />
                        </div>

                        <div>
                          <Label htmlFor="emailProvider">Email Provider</Label>
                          <Select 
                            value={reminderForm.watch('emailProvider')} 
                            onValueChange={(value: any) => reminderForm.setValue('emailProvider', value)}
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

                        {reminderForm.watch('emailProvider') === 'resend' && (
                          <div>
                            <Label htmlFor="emailDomain">Sender Domain</Label>
                            <Select 
                              value={reminderForm.watch('emailDomain')} 
                              onValueChange={(value: any) => reminderForm.setValue('emailDomain', value)}
                            >
                              <SelectTrigger data-testid="select-email-domain">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="custom">Custom Domain (subtracker.uk)</SelectItem>
                                <SelectItem value="default">Default Resend Domain</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                              Custom domain provides professional branding, default domain uses Resend's domain
                            </p>
                          </div>
                        )}

                        {reminderForm.watch('emailProvider') === 'smtp' && (
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
                                  {...reminderForm.register('smtpHost')}
                                  data-testid="input-smtp-host"
                                />
                              </div>
                              <div>
                                <Label htmlFor="smtpPort">SMTP Port</Label>
                                <Input
                                  id="smtpPort"
                                  type="number"
                                  placeholder="587"
                                  {...reminderForm.register('smtpPort', { valueAsNumber: true })}
                                  data-testid="input-smtp-port"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="smtpUsername">Username</Label>
                              <Input
                                id="smtpUsername"
                                placeholder="username"
                                {...reminderForm.register('smtpUsername')}
                                data-testid="input-smtp-username"
                              />
                            </div>
                            <div>
                              <Label htmlFor="smtpPassword">Password</Label>
                              <Input
                                id="smtpPassword"
                                type="password"
                                placeholder="app password or regular password"
                                {...reminderForm.register('smtpPassword')}
                                data-testid="input-smtp-password"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="emailTemplate">Email Template Style</Label>
                          <Select 
                            value={reminderForm.watch('emailTemplate')} 
                            onValueChange={(value: any) => reminderForm.setValue('emailTemplate', value)}
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
                            disabled={testConnectionMutation.isPending || isTestingConnection === 'Email'}
                            data-testid="button-test-email"
                          >
                            {isTestingConnection === 'Email' ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <TestTube className="h-4 w-4 mr-2" />
                                Test Email
                              </>
                            )}
                          </Button>
                        </div>
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
                      Configure when and how you receive reminders
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reminderTime">Daily reminder time</Label>
                      <Input
                        id="reminderTime"
                        type="time"
                        {...reminderForm.register('reminderTime')}
                        data-testid="input-reminder-time"
                      />
                    </div>

                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select 
                        value={reminderForm.watch('timezone')} 
                        onValueChange={(value) => reminderForm.setValue('timezone', value)}
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
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Reminder days before renewal</Label>
                      <div className="mt-2 space-y-2">
                        {[1, 3, 7, 14, 30].map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`day-${day}`}
                              checked={reminderForm.watch('reminderDaysBefore').includes(day)}
                              onChange={(e) => {
                                const current = reminderForm.watch('reminderDaysBefore');
                                if (e.target.checked) {
                                  reminderForm.setValue('reminderDaysBefore', [...current, day].sort((a, b) => b - a));
                                } else {
                                  reminderForm.setValue('reminderDaysBefore', current.filter(d => d !== day));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={`day-${day}`}>{day} day{day !== 1 ? 's' : ''} before</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Include spending summary</Label>
                        <p className="text-sm text-muted-foreground">
                          Add total subscription costs to reminders
                        </p>
                      </div>
                      <Switch
                        checked={reminderForm.watch('includeSpendingSummary')}
                        onCheckedChange={(checked) => reminderForm.setValue('includeSpendingSummary', checked)}
                        data-testid="switch-include-spending"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Include action buttons</Label>
                        <p className="text-sm text-muted-foreground">
                          Add quick action buttons in emails
                        </p>
                      </div>
                      <Switch
                        checked={reminderForm.watch('includeActionButtons')}
                        onCheckedChange={(checked) => reminderForm.setValue('includeActionButtons', checked)}
                        data-testid="switch-include-actions"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Save Button for Reminders */}
            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={saveReminderSettingsMutation.isPending}
                data-testid="button-save-reminder-settings"
              >
                {saveReminderSettingsMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Reminder Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Payments Settings */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your payment methods and billing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Payment method management will be available in a future update. Currently, subscription tracking is free for all users.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Current Plan</h4>
                    <p className="text-sm text-muted-foreground">
                      {(userStatus as any)?.plan?.name || "Free Trial"}
                    </p>
                  </div>
                  <Badge variant={(userStatus as any)?.subscriptionStatus === 'trial' ? "secondary" : "default"}>
                    {(userStatus as any)?.plan?.name || "Trial"}
                  </Badge>
                </div>
                
                {(userStatus as any)?.subscriptionStatus === 'trial' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your trial will expire soon. Upgrade to continue using all features.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stripe Integration</CardTitle>
              <CardDescription>
                Configure Stripe for payment processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Stripe Status</h4>
                  <p className="text-sm text-muted-foreground">
                    {(apiKeysStatus as any)?.stripeConfigured ? 'Configured and ready' : 'Not configured'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(apiKeysStatus as any)?.stripeConfigured ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
              
              {!(apiKeysStatus as any)?.stripeConfigured && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>Stripe is not configured. To enable payment processing:</p>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>Get your API keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" className="text-blue-600 hover:underline">Stripe Dashboard</a></li>
                        <li>Add VITE_STRIPE_PUBLIC_KEY and STRIPE_SECRET_KEY to your environment</li>
                        <li>Restart the application</li>
                      </ol>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Settings */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Manage API keys for external services. Your keys are securely stored and encrypted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gemini AI API Key */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Gemini AI API Key</h4>
                    <p className="text-sm text-muted-foreground">
                      Required for AI-powered subscription insights and recommendations
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getGeminiApiKey()?.hasKey ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Missing
                      </Badge>
                    )}
                  </div>
                </div>

                {getGeminiApiKey()?.hasKey ? (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">API Key configured</p>
                      <p className="text-xs text-green-600">
                        Last updated: {getGeminiApiKey()?.createdAt ? new Date(getGeminiApiKey()!.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteGeminiKey}
                      disabled={deleteApiKeyMutation.isPending}
                      data-testid="button-delete-gemini-key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type={isShowingGeminiKey ? "text" : "password"}
                          placeholder="Enter your Gemini API key"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          data-testid="input-gemini-api-key"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setIsShowingGeminiKey(!isShowingGeminiKey)}
                        >
                          {isShowingGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        onClick={handleSaveGeminiKey}
                        disabled={saveApiKeyMutation.isPending || !geminiApiKey.trim()}
                        data-testid="button-save-gemini-key"
                      >
                        {saveApiKeyMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>To get your Gemini API key:</p>
                          <ol className="list-decimal list-inside text-sm space-y-1">
                            <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline" rel="noopener noreferrer">Google AI Studio</a></li>
                            <li>Create a new API key</li>
                            <li>Copy and paste it above</li>
                          </ol>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <Separator />

              {/* Resend API Key */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Resend API Key</h4>
                    <p className="text-sm text-muted-foreground">
                      Required for sending email notifications and reminders
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getResendApiKey()?.hasKey ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Missing
                      </Badge>
                    )}
                  </div>
                </div>

                {getResendApiKey()?.hasKey ? (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">API Key configured</p>
                      <p className="text-xs text-green-600">
                        Last updated: {getResendApiKey()?.createdAt ? new Date(getResendApiKey()!.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteResendKey}
                      disabled={deleteApiKeyMutation.isPending}
                      data-testid="button-delete-resend-key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type={isShowingResendKey ? "text" : "password"}
                          placeholder="Enter your Resend API key"
                          value={resendApiKey}
                          onChange={(e) => setResendApiKey(e.target.value)}
                          data-testid="input-resend-api-key"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setIsShowingResendKey(!isShowingResendKey)}
                        >
                          {isShowingResendKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        onClick={handleSaveResendKey}
                        disabled={saveApiKeyMutation.isPending || !resendApiKey.trim()}
                        data-testid="button-save-resend-key"
                      >
                        {saveApiKeyMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        <div className="space-y-3">
                          <p className="font-medium text-green-800 dark:text-green-200">📧 Easy Email Setup with Resend:</p>
                          
                          <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-3">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              </div>
                              <div className="ml-2">
                                <h5 className="text-sm font-medium text-green-800 dark:text-green-200">
                                  ✨ Resend API - Free & Reliable
                                </h5>
                                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                  Get <strong>3,000 free emails per month</strong> - perfect for subscription reminders!
                                </p>
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-sm font-medium hover:text-green-800 dark:hover:text-green-200">
                                    📋 Quick Setup Instructions
                                  </summary>
                                  <div className="mt-2 space-y-2 text-xs">
                                    <div>
                                      <p><strong>Step 1: Create Free Account</strong></p>
                                      <p>→ <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline text-green-600 hover:text-green-800">Sign up at resend.com</a></p>
                                    </div>
                                    
                                    <div>
                                      <p><strong>Step 2: Get API Key</strong></p>
                                      <p>→ Go to <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-green-600 hover:text-green-800">API Keys</a> section</p>
                                      <p>→ Click "Create API Key"</p>
                                      <p>→ Copy your key (starts with <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">re_</code>)</p>
                                    </div>
                                    
                                    <div>
                                      <p><strong>Step 3: Enter API Key Above</strong></p>
                                      <p>→ Paste your API key in the field above</p>
                                      <p>→ Your key will be securely encrypted and stored</p>
                                    </div>
                                    
                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                                      <p><strong>💡 Why Resend?</strong></p>
                                      <p>→ No complex SMTP setup</p>
                                      <p>→ 99.9% delivery rate</p>
                                      <p>→ Free: 3,000 emails/month</p>
                                    </div>
                                  </div>
                                </details>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('https://resend.com', '_blank')}
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Create Resend Account
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('https://resend.com/api-keys', '_blank')}
                              className="flex items-center gap-1"
                            >
                              <Key className="h-3 w-3" />
                              Get API Key
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
              <CardDescription>
                Control how your data is used and stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data collection</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow collection of usage data to improve the service
                  </p>
                </div>
                <Switch
                  checked={userSettings.privacy.dataCollection}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({ 
                      ...prev, 
                      privacy: { ...prev.privacy, dataCollection: checked }
                    }))
                  }
                  data-testid="switch-data-collection"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable analytics to help us understand how you use the app
                  </p>
                </div>
                <Switch
                  checked={userSettings.privacy.analytics}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({ 
                      ...prev, 
                      privacy: { ...prev.privacy, analytics: checked }
                    }))
                  }
                  data-testid="switch-analytics"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings} 
          disabled={saveSettingsMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveSettingsMutation.isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}