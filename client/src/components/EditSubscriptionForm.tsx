import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import { type Subscription } from "@shared/schema";
import { format } from "date-fns";
import { useEffect } from "react";

const formSchema = insertSubscriptionSchema.extend({
  nextBillingDate: z.string().min(1, "Next billing date is required"),
  isTrial: z.boolean().default(false),
  trialDays: z.number().optional(),
  cardLast4: z.string().optional(),
  bankName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditSubscriptionFormProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: FormData) => void;
  isLoading?: boolean;
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

export default function EditSubscriptionForm({ 
  subscription, 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading = false 
}: EditSubscriptionFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: subscription ? {
      name: subscription.name,
      cost: subscription.cost,
      billingCycle: subscription.billingCycle,
      category: subscription.category,
      nextBillingDate: format(new Date(subscription.nextBillingDate), 'yyyy-MM-dd'),
      description: subscription.description || '',
      isActive: subscription.isActive,
      isTrial: subscription.isTrial || false,
      trialDays: subscription.trialDays || undefined,
      cardLast4: subscription.cardLast4 || '',
      bankName: subscription.bankName || '',
    } : {
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

  // Reset form when subscription changes
  useEffect(() => {
    if (subscription && open) {
      form.reset({
        name: subscription.name,
        cost: subscription.cost,
        billingCycle: subscription.billingCycle,
        category: subscription.category,
        nextBillingDate: format(new Date(subscription.nextBillingDate), 'yyyy-MM-dd'),
        description: subscription.description || '',
        isActive: subscription.isActive,
        isTrial: subscription.isTrial || false,
        trialDays: subscription.trialDays || undefined,
        cardLast4: subscription.cardLast4 || '',
        bankName: subscription.bankName || '',
      });
    }
  }, [subscription, open, form]);

  const handleSubmit = (data: FormData) => {
    if (!subscription) return;
    console.log('Form submitted:', data);
    onSubmit(subscription.id, data);
    onOpenChange(false);
  };

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-lg mx-4">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>
        
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
                      data-testid="input-edit-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        data-testid="input-edit-cost"
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-billing-cycle">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-category">
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
                        data-testid="input-edit-next-billing"
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
                      data-testid="textarea-edit-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Subscription</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Turn off to pause this subscription
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 1}
                      onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      data-testid="switch-edit-active"
                    />
                  </FormControl>
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
                          data-testid="switch-edit-trial"
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
                            data-testid="input-edit-trial-days"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            data-testid="input-edit-card-last4"
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
                            data-testid="input-edit-bank-name"
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
                onClick={() => onOpenChange(false)}
                data-testid="button-edit-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-edit-save"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}