import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Settings, Key, Mail, Database, Globe, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';

interface AdminSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  maintenanceMode: boolean;
  registrationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  maxUsersPerPlan: number;
  sessionTimeoutMinutes: number;
  apiRateLimit: number;
  backupFrequencyHours: number;
}

interface SystemHealth {
  databaseStatus: 'healthy' | 'warning' | 'error';
  apiKeysStatus: 'configured' | 'missing' | 'error';
  emailServiceStatus: 'active' | 'inactive' | 'error';
  diskUsagePercentage: number;
  memoryUsagePercentage: number;
  uptime: string;
  lastBackup: string | null;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  // Fetch current admin settings
  const { data: settingsData, isLoading: loadingSettings } = useQuery<{ success: boolean; data: AdminSettings }>({
    queryKey: ['/api/admin/settings'],
    queryFn: () => fetch('/api/admin/settings').then(res => res.json())
  });

  // Fetch system health
  const { data: healthData, isLoading: loadingHealth } = useQuery<{ success: boolean; data: SystemHealth }>({
    queryKey: ['/api/admin/system-health'],
    queryFn: () => fetch('/api/admin/system-health').then(res => res.json()),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Form state
  const [formData, setFormData] = useState<AdminSettings>({
    siteName: '',
    siteDescription: '',
    supportEmail: '',
    maintenanceMode: false,
    registrationsEnabled: true,
    emailNotificationsEnabled: true,
    maxUsersPerPlan: 1000,
    sessionTimeoutMinutes: 60,
    apiRateLimit: 1000,
    backupFrequencyHours: 24
  });

  // Update form data when settings are loaded
  if (settingsData?.data && formData.siteName === '') {
    setFormData(settingsData.data);
  }

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: AdminSettings) => apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: 'Success',
        description: 'Settings updated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive'
      });
    }
  });

  // System actions
  const performSystemAction = useMutation({
    mutationFn: (action: string) => apiRequest(`/api/admin/system/${action}`, {
      method: 'POST'
    }),
    onSuccess: (data, action) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-health'] });
      toast({
        title: 'Success',
        description: `${action} completed successfully`
      });
    },
    onError: (error: any, action) => {
      toast({
        title: 'Error',
        description: `Failed to ${action}: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'configured':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning':
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'error':
      case 'missing':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-admin-settings">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="admin-settings">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
          <h1 className="ml-4 text-2xl font-semibold text-foreground">Admin Settings</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList data-testid="settings-nav-tabs">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Configure basic application settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={formData.siteName}
                      onChange={(e) => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                      data-testid="input-site-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, supportEmail: e.target.value }))}
                      data-testid="input-support-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={formData.siteDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteDescription: e.target.value }))}
                    rows={3}
                    data-testid="textarea-site-description"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxUsers">Max Users Per Plan</Label>
                    <Input
                      id="maxUsers"
                      type="number"
                      value={formData.maxUsersPerPlan}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUsersPerPlan: parseInt(e.target.value) }))}
                      data-testid="input-max-users"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={formData.sessionTimeoutMinutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) }))}
                      data-testid="input-session-timeout"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="registrations">Allow User Registrations</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register for accounts
                    </p>
                  </div>
                  <Switch
                    id="registrations"
                    checked={formData.registrationsEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, registrationsEnabled: checked }))}
                    data-testid="switch-registrations"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable system email notifications
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={formData.emailNotificationsEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailNotificationsEnabled: checked }))}
                    data-testid="switch-email-notifications"
                  />
                </div>

                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>Monitor system status and performance</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHealth ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : healthData?.data ? (
                  <div className="grid gap-4 md:grid-cols-2" data-testid="system-health-grid">
                    <div className="space-y-2">
                      <Label>Database Status</Label>
                      <Badge className={getStatusColor(healthData.data.databaseStatus)}>
                        {healthData.data.databaseStatus}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>API Keys Status</Label>
                      <Badge className={getStatusColor(healthData.data.apiKeysStatus)}>
                        {healthData.data.apiKeysStatus}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label>Email Service</Label>
                      <Badge className={getStatusColor(healthData.data.emailServiceStatus)}>
                        {healthData.data.emailServiceStatus}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label>Uptime</Label>
                      <p className="text-sm font-mono">{healthData.data.uptime}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Disk Usage</Label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${healthData.data.diskUsagePercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{healthData.data.diskUsagePercentage}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Memory Usage</Label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${healthData.data.memoryUsagePercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{healthData.data.memoryUsagePercentage}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>System Health Unavailable</AlertTitle>
                    <AlertDescription>
                      Unable to fetch system health information. Please check your connection.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => performSystemAction.mutate('backup')}
                    disabled={performSystemAction.isPending}
                    data-testid="button-backup-system"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Create Backup
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => performSystemAction.mutate('cleanup')}
                    disabled={performSystemAction.isPending}
                    data-testid="button-cleanup-system"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    System Cleanup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Configure security and API settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiRateLimit">API Rate Limit (requests per hour)</Label>
                  <Input
                    id="apiRateLimit"
                    type="number"
                    value={formData.apiRateLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiRateLimit: parseInt(e.target.value) }))}
                    data-testid="input-api-rate-limit"
                  />
                </div>

                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertTitle>API Keys Management</AlertTitle>
                  <AlertDescription>
                    System-level API keys are managed through environment variables and the API keys page.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-security-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Security Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Maintenance Mode
                </CardTitle>
                <CardDescription>Control system maintenance and emergency settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable user access to the application
                    </p>
                  </div>
                  <Switch
                    id="maintenanceMode"
                    checked={formData.maintenanceMode}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, maintenanceMode: checked }))}
                    data-testid="switch-maintenance-mode"
                  />
                </div>

                {formData.maintenanceMode && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Maintenance Mode Active</AlertTitle>
                    <AlertDescription>
                      When maintenance mode is enabled, regular users will see a maintenance page and cannot access the application.
                      Only administrators can still log in.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency (hours)</Label>
                  <Input
                    id="backupFrequency"
                    type="number"
                    value={formData.backupFrequencyHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, backupFrequencyHours: parseInt(e.target.value) }))}
                    data-testid="input-backup-frequency"
                  />
                </div>

                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-maintenance-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Maintenance Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}