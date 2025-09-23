import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, Crown, AlertTriangle, Info, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";

const formSchema = insertSubscriptionSchema.extend({
  nextBillingDate: z.string().min(1, "Next billing date is required"),
  isTrial: z.boolean().default(false),
  trialDays: z.number().optional(),
  cardLast4: z.string().optional(),
  bankName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UserStatus {
  id: string;
  email: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  trialEndsAt?: string;
  plan?: {
    name: string;
    maxSubscriptions?: number;
    maxApiCalls?: number;
  };
}

interface AddSubscriptionFormProps {
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
  currentSubscriptionCount?: number;
}

const categories = [
  'Entertainment',
  'Productivity', 
  'Health',
  'Education',
  'Gaming',
  'News',
  'Other'
];

const billingCycles = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

export default function AddSubscriptionForm({ onSubmit, isLoading = false, currentSubscriptionCount = 0 }: AddSubscriptionFormProps) {
  const [open, setOpen] = useState(false);
  
  // Fetch user status and plan information
  const { data: userStatus } = useQuery<UserStatus>({
    queryKey: ['/api/account'],
    enabled: open, // Only fetch when dialog is open
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      cost: '',
      billingCycle: 'monthly',
      category: 'Entertainment',
      nextBillingDate: '',
      description: '',
      isActive: 1,
      isTrial: false,
      trialDays: undefined,
      cardLast4: '',
      bankName: '',
    },
  });

  const handleSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
    onSubmit(data);
    form.reset();
    setOpen(false);
  };
  
  // Calculate trial status
  const isTrialUser = userStatus?.subscriptionStatus === 'trial';
  const trialDaysLeft = userStatus?.trialEndsAt 
    ? Math.max(0, differenceInDays(new Date(userStatus.trialEndsAt), new Date()))
    : 0;
  const isTrialExpired = isTrialUser && trialDaysLeft <= 0;
  
  // Calculate subscription limits
  const maxSubscriptions = userStatus?.plan?.maxSubscriptions || (isTrialUser ? 5 : 100);
  const canAddSubscription = currentSubscriptionCount < maxSubscriptions;
  const subscriptionProgress = (currentSubscriptionCount / maxSubscriptions) * 100;
  
  // Determine if user should be prompted to upgrade
  const shouldPromptUpgrade = isTrialUser && (currentSubscriptionCount >= 3 || trialDaysLeft <= 3);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-subscription">
          <Plus className="h-4 w-4 mr-2" />
          Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add New Subscription
            {isTrialUser && (
              <Badge variant="outline" className="text-orange-600">
                <Crown className="h-3 w-3 mr-1" />
                Trial
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {/* User Status & Limits */}
        {userStatus && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Account Status</span>
                <Badge variant={isTrialUser ? "secondary" : "default"}>
                  {userStatus.plan?.name || (isTrialUser ? "Trial" : "Free")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Subscription Limit Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Subscriptions</span>
                  <span>{currentSubscriptionCount} / {maxSubscriptions}</span>
                </div>
                <Progress value={subscriptionProgress} className="h-2" />
              </div>
              
              {/* Trial Status */}
              {isTrialUser && (
                <div className="space-y-2">
                  {trialDaysLeft > 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left in your trial
                        {trialDaysLeft <= 3 && " - Consider upgrading soon!"}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Your trial has expired. Upgrade to continue adding subscriptions.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
              
              {/* Limit Warning */}
              {!canAddSubscription && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You've reached the limit of {maxSubscriptions} subscriptions for your plan.
                    {isTrialUser && " Upgrade to Pro for unlimited subscriptions."}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Upgrade Prompt */}
              {shouldPromptUpgrade && canAddSubscription && (
                <Alert>
                  <Crown className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Unlock unlimited subscriptions with Pro</span>
                    <Button size="sm" variant="outline" data-testid="button-upgrade-prompt">
                      Upgrade
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Netflix, Spotify" 
                      {...field} 
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Cycle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-billing-cycle">
                          <SelectValue placeholder="Select cycle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {billingCycles.map((cycle) => (
                          <SelectItem key={cycle.value} value={cycle.value}>
                            {cycle.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextBillingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Billing Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="input-next-billing"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this subscription..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ''}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Free Trial Section */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Free Trial
                </CardTitle>
                <CardDescription className="text-xs">
                  Set up a free trial period before billing begins
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isTrial"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Free Trial</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Start with a free trial period
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-trial"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('isTrial') && (
                  <FormField
                    control={form.control}
                    name="trialDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trial Duration (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="7"
                            min="1"
                            max="365"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-trial-days"
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          How many days should the trial last?
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Payment Card Section */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Card (Optional)
                </CardTitle>
                <CardDescription className="text-xs">
                  Add card details for reminders and auto-payment tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cardLast4"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last 4 Digits</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="1234"
                            maxLength={4}
                            pattern="[0-9]{4}"
                            {...field}
                            data-testid="input-card-last4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank/Card Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Chase, Visa, etc."
                            {...field}
                            data-testid="input-bank-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !canAddSubscription || isTrialExpired}
                data-testid="button-save"
              >
                {isLoading ? 'Saving...' : 
                 !canAddSubscription ? 'Limit Reached' :
                 isTrialExpired ? 'Trial Expired' :
                 'Save Subscription'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}