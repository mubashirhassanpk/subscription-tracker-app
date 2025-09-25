import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Calendar,
  Mail,
  MessageSquare,
  Chrome,
  Smartphone,
  Settings,
  Save,
  Plus,
  Trash2,
  Clock,
  Globe
} from "lucide-react";

export default function Reminders() {
  const { toast } = useToast();
  const [preferencesChanged, setPreferencesChanged] = useState(false);

  // Fetch notification preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/reminders/preferences"],
    queryFn: async () => {
      const response = await fetch("/api/reminders/preferences");
      if (!response.ok) throw new Error("Failed to fetch preferences");
      return response.json();
    }
  });

  // Fetch upcoming reminders
  const { data: upcomingReminders, isLoading: remindersLoading } = useQuery({
    queryKey: ["/api/reminders/upcoming"],
    queryFn: async () => {
      const response = await fetch("/api/reminders/upcoming");
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    }
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch("/api/reminders/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/preferences"] });
      setPreferencesChanged(false);
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Failed to update preferences",
        variant: "destructive"
      });
    }
  });

  // Cancel reminder mutation
  const cancelReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to cancel reminder");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      toast({
        title: "Reminder Cancelled",
        description: "The reminder has been cancelled successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel reminder",
        variant: "destructive"
      });
    }
  });

  const handlePreferenceChange = (field: string, value: any) => {
    setPreferencesChanged(true);
    // Update local state if needed
  };

  const handleSavePreferences = () => {
    // Get form data and submit
    const formData = new FormData(document.getElementById("preferences-form") as HTMLFormElement);
    const updates = {
      emailEnabled: formData.get("emailEnabled") === "on",
      emailAddress: formData.get("emailAddress"),
      googleCalendarEnabled: formData.get("googleCalendarEnabled") === "on",
      googleCalendarId: formData.get("googleCalendarId"),
      appleCalendarEnabled: formData.get("appleCalendarEnabled") === "on",
      chromeExtensionEnabled: formData.get("chromeExtensionEnabled") === "on",
      browserNotificationEnabled: formData.get("browserNotificationEnabled") === "on",
      whatsappEnabled: formData.get("whatsappEnabled") === "on",
      whatsappNumber: formData.get("whatsappNumber"),
      reminderDaysBefore: [7, 3, 1], // Default values
      reminderTime: formData.get("reminderTime") || "09:00",
      timezone: formData.get("timezone") || "UTC"
    };
    
    updatePreferencesMutation.mutate(updates);
  };

  if (preferencesLoading || remindersLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading reminders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reminder Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure flexible reminders and never miss a payment again
            </p>
          </div>
          <Button 
            onClick={handleSavePreferences}
            disabled={!preferencesChanged || updatePreferencesMutation.isPending}
            data-testid="button-save-preferences"
          >
            <Save className="mr-2 h-4 w-4" />
            {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preferences" data-testid="tab-preferences">Notification Preferences</TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming Reminders</TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <form id="preferences-form" className="space-y-6">
              {/* Email Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Receive email reminders for upcoming charges
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailEnabled">Enable Email Notifications</Label>
                    <Switch 
                      id="emailEnabled"
                      name="emailEnabled"
                      defaultChecked={preferences?.preferences?.emailEnabled}
                      onCheckedChange={(checked) => handlePreferenceChange("emailEnabled", checked)}
                      data-testid="switch-email-enabled"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailAddress">Email Address</Label>
                    <Input 
                      id="emailAddress"
                      name="emailAddress"
                      type="email"
                      placeholder="your@email.com"
                      defaultValue={preferences?.preferences?.emailAddress || ""}
                      onChange={() => setPreferencesChanged(true)}
                      data-testid="input-email-address"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Calendar Sync */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Calendar Integration
                  </CardTitle>
                  <CardDescription>
                    Sync reminders with your calendar applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="googleCalendarEnabled">Google Calendar</Label>
                    <Switch 
                      id="googleCalendarEnabled"
                      name="googleCalendarEnabled"
                      defaultChecked={preferences?.preferences?.googleCalendarEnabled}
                      onCheckedChange={(checked) => handlePreferenceChange("googleCalendarEnabled", checked)}
                      data-testid="switch-google-calendar"
                    />
                  </div>
                  <div>
                    <Label htmlFor="googleCalendarId">Google Calendar ID (optional)</Label>
                    <Input 
                      id="googleCalendarId"
                      name="googleCalendarId"
                      placeholder="your-calendar-id@group.calendar.google.com"
                      defaultValue={preferences?.preferences?.googleCalendarId || ""}
                      onChange={() => setPreferencesChanged(true)}
                      data-testid="input-google-calendar-id"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="appleCalendarEnabled">Apple Calendar</Label>
                    <Switch 
                      id="appleCalendarEnabled"
                      name="appleCalendarEnabled"
                      defaultChecked={preferences?.preferences?.appleCalendarEnabled}
                      onCheckedChange={(checked) => handlePreferenceChange("appleCalendarEnabled", checked)}
                      data-testid="switch-apple-calendar"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Browser & Mobile Notifications */}
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="browserNotificationEnabled">Browser Notifications</Label>
                    <Switch 
                      id="browserNotificationEnabled"
                      name="browserNotificationEnabled"
                      defaultChecked={preferences?.preferences?.browserNotificationEnabled}
                      onCheckedChange={(checked) => handlePreferenceChange("browserNotificationEnabled", checked)}
                      data-testid="switch-browser-notifications"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="chromeExtensionEnabled">Chrome Extension Sync</Label>
                    <Switch 
                      id="chromeExtensionEnabled"
                      name="chromeExtensionEnabled"
                      defaultChecked={preferences?.preferences?.chromeExtensionEnabled}
                      onCheckedChange={(checked) => handlePreferenceChange("chromeExtensionEnabled", checked)}
                      data-testid="switch-chrome-extension"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    WhatsApp Reminders
                  </CardTitle>
                  <CardDescription>
                    Get reminders via WhatsApp messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="whatsappEnabled">Enable WhatsApp Notifications</Label>
                    <Switch 
                      id="whatsappEnabled"
                      name="whatsappEnabled"
                      defaultChecked={preferences?.preferences?.whatsappEnabled}
                      onCheckedChange={(checked) => handlePreferenceChange("whatsappEnabled", checked)}
                      data-testid="switch-whatsapp-enabled"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <Input 
                      id="whatsappNumber"
                      name="whatsappNumber"
                      type="tel"
                      placeholder="+1234567890"
                      defaultValue={preferences?.preferences?.whatsappNumber || ""}
                      onChange={() => setPreferencesChanged(true)}
                      data-testid="input-whatsapp-number"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Timing Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timing Settings
                  </CardTitle>
                  <CardDescription>
                    When and how often to send reminders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="reminderTime">Reminder Time</Label>
                    <Input 
                      id="reminderTime"
                      name="reminderTime"
                      type="time"
                      defaultValue={preferences?.preferences?.reminderTime || "09:00"}
                      onChange={() => setPreferencesChanged(true)}
                      data-testid="input-reminder-time"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input 
                      id="timezone"
                      name="timezone"
                      placeholder="UTC"
                      defaultValue={preferences?.preferences?.timezone || "UTC"}
                      onChange={() => setPreferencesChanged(true)}
                      data-testid="input-timezone"
                    />
                  </div>

                  <div>
                    <Label>Reminder Schedule</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Currently set to remind you 7, 3, and 1 days before each charge
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="secondary">7 days before</Badge>
                      <Badge variant="secondary">3 days before</Badge>  
                      <Badge variant="secondary">1 day before</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* Upcoming Reminders Tab */}
          <TabsContent value="upcoming" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reminders</CardTitle>
                <CardDescription>
                  View and manage your upcoming subscription reminders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingReminders?.reminders?.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No upcoming reminders scheduled</p>
                    <p className="text-sm text-gray-500 mt-2">Reminders will appear here as your subscriptions approach renewal dates</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingReminders?.reminders?.map((reminder: any, index: number) => (
                      <div key={reminder.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`reminder-${index}`}>
                        <div>
                          <div className="font-medium">{reminder.message}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(reminder.scheduledFor).toLocaleDateString()} at {new Date(reminder.scheduledFor).toLocaleTimeString()}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{reminder.reminderType}</Badge>
                            <Badge variant={reminder.status === 'pending' ? 'default' : 'secondary'}>
                              {reminder.status}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelReminderMutation.mutate(reminder.id)}
                          disabled={cancelReminderMutation.isPending}
                          data-testid={`button-cancel-reminder-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}