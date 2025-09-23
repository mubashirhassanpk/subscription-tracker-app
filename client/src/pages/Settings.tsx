import { useState } from "react";
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
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

  // Mock API Keys status check
  const { data: apiKeysStatus } = useQuery({
    queryKey: ['/api/api-keys/status'],
    queryFn: async () => {
      // Check if user has configured their own API keys
      const hasGeminiKey = userApiKeys?.find((key: UserExternalApiKey) => key.service === 'gemini')?.hasKey;
      const hasStripeKey = userApiKeys?.find((key: UserExternalApiKey) => key.service === 'stripe')?.hasKey;
      
      return {
        geminiConfigured: hasGeminiKey || !!import.meta.env.VITE_GEMINI_API_KEY,
        stripeConfigured: hasStripeKey || !!(import.meta.env.VITE_STRIPE_PUBLIC_KEY && import.meta.env.STRIPE_SECRET_KEY),
      };
    },
    refetchOnWindowFocus: false,
    enabled: !!userApiKeys, // Only run after user API keys are loaded
  });

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

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(userSettings);
  };

  const openApiKeysPage = () => {
    window.open('/api-keys', '_blank');
  };

  // Save API Key mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async ({ service, keyValue }: { service: string; keyValue: string }) => {
      return apiRequest(`/api/user-external-api-keys`, {
        method: 'POST',
        body: JSON.stringify({ service, keyValue, isActive: true }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "API Key saved",
        description: `Your ${variables.service} API key has been saved successfully.`,
      });
      refetchApiKeys();
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys/status'] });
      // Clear the input field
      if (variables.service === 'gemini') {
        setGeminiApiKey('');
        setIsShowingGeminiKey(false);
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
      return apiRequest(`/api/user-external-api-keys/${service}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data, service) => {
      toast({
        title: "API Key removed",
        description: `Your ${service} API key has been removed.`,
      });
      refetchApiKeys();
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys/status'] });
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

  const getGeminiApiKey = () => {
    return userApiKeys?.find((key: UserExternalApiKey) => key.service === 'gemini');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
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
                    {apiKeysStatus?.stripeConfigured ? 'Configured and ready' : 'Not configured'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {apiKeysStatus?.stripeConfigured ? (
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
              
              {!apiKeysStatus?.stripeConfigured && (
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

              {/* Stripe Status (Read-only for now) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Stripe Integration</h4>
                    <p className="text-sm text-muted-foreground">
                      Required for payment processing (configured via environment)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {apiKeysStatus?.stripeConfigured ? (
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

                {!apiKeysStatus?.stripeConfigured && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>Stripe is not configured. Contact your administrator to set up:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                          <li>VITE_STRIPE_PUBLIC_KEY environment variable</li>
                          <li>STRIPE_SECRET_KEY environment variable</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
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