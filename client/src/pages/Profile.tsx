import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Calendar, 
  Crown, 
  CreditCard,
  Save,
  Edit2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserProfile {
  user: {
    id: string;
    email: string;
    name: string;
    subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
    trialEndsAt?: string;
    createdAt: string;
  };
  plan?: {
    name: string;
    price: string;
    maxSubscriptions?: number;
  };
}

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });

  // Fetch user profile
  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/account'],
    refetchOnWindowFocus: false,
  });

  // Initialize form data when user profile loads
  useEffect(() => {
    if (userProfile?.user) {
      setProfileData({
        name: userProfile.user.name || '',
        email: userProfile.user.email || ''
      });
    }
  }, [userProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      return apiRequest('PUT', '/api/account/profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    if (!profileData.name.trim() || !profileData.email.trim()) {
      toast({
        title: "Validation error",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  const handleCancelEdit = () => {
    if (userProfile?.user) {
      setProfileData({
        name: userProfile.user.name || '',
        email: userProfile.user.email || ''
      });
    }
    setIsEditing(false);
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
        <div className="text-center text-muted-foreground">
          Failed to load profile information.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Manage your personal information and account details
              </CardDescription>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={updateProfileMutation.isPending}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(userProfile.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{userProfile.user.name}</h3>
              <p className="text-sm text-muted-foreground">{userProfile.user.email}</p>
              <div className="flex items-center gap-2">
                <Badge variant={userProfile.user.subscriptionStatus === 'trial' ? "secondary" : "default"}>
                  <Crown className="h-3 w-3 mr-1" />
                  {userProfile.plan?.name || 'Trial'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updateProfileMutation.isPending}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{userProfile.user.name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{userProfile.user.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(userProfile.user.createdAt)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Account Status</Label>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{userProfile.user.subscriptionStatus}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Details
          </CardTitle>
          <CardDescription>
            Your current plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Current Plan</h4>
              <p className="text-sm text-muted-foreground">
                {userProfile.plan?.name || "Free Trial"}
              </p>
            </div>
            <Badge variant={userProfile.user.subscriptionStatus === 'trial' ? "secondary" : "default"}>
              {userProfile.plan?.name || "Trial"}
            </Badge>
          </div>
          
          {userProfile.plan && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Price</span>
                <span className="font-medium">${userProfile.plan.price}/month</span>
              </div>
              {userProfile.plan.maxSubscriptions && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Subscriptions</span>
                  <span className="font-medium">{userProfile.plan.maxSubscriptions}</span>
                </div>
              )}
            </div>
          )}

          {userProfile.subscriptionStatus === 'trial' && userProfile.trialEndsAt && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Trial ends on {formatDate(userProfile.trialEndsAt)}
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Upgrade to continue using all features after your trial expires.
              </p>
            </div>
          )}

          <Button 
            className="w-full" 
            variant={userProfile.subscriptionStatus === 'trial' ? "default" : "outline"}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {userProfile.subscriptionStatus === 'trial' ? 'Upgrade Plan' : 'Manage Subscription'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}