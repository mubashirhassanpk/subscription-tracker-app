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
  Save
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

  // Fetch user account info
  const { data: userStatus } = useQuery({
    queryKey: ['/api/account'],
    refetchOnWindowFocus: false,
  });

  // Mock API Keys status check
  const { data: apiKeysStatus } = useQuery({
    queryKey: ['/api/api-keys/status'],
    queryFn: async () => {
      // In a real app, this would check environment variables
      return {
        geminiConfigured: !!import.meta.env.VITE_GEMINI_API_KEY,
        stripeConfigured: !!(import.meta.env.VITE_STRIPE_PUBLIC_KEY && import.meta.env.STRIPE_SECRET_KEY),
      };
    },
    refetchOnWindowFocus: false,
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
                Manage API keys for external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Gemini AI</h4>
                    <p className="text-sm text-muted-foreground">
                      Required for AI-powered subscription insights
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {apiKeysStatus?.geminiConfigured ? (
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Stripe</h4>
                    <p className="text-sm text-muted-foreground">
                      Required for payment processing
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
              </div>

              <Button onClick={openApiKeysPage} variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage API Keys
              </Button>
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