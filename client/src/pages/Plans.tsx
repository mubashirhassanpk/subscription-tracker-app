import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  CheckCircle, 
  Loader2, 
  Star, 
  Shield, 
  Users, 
  Zap, 
  Clock, 
  CreditCard, 
  HelpCircle,
  ArrowRight,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripeProductId?: string;
  stripePriceId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  planId?: string;
}

export default function Plans() {
  const { toast } = useToast();

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['/api/plans'],
  });

  const { data: user } = useQuery<User>({
    queryKey: ['/api/account'],
  });

  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/plans/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upgrade plan');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      toast({
        title: "Plan upgraded successfully!",
        description: "Your subscription has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade failed",
        description: error.message || "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/plans/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string) => {
    upgradeMutation.mutate(planId);
  };

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  const isCurrentPlan = (planId: string) => user?.planId === planId;
  const isTrialUser = user?.subscriptionStatus === 'trial';
  const isActiveUser = user?.subscriptionStatus === 'active';

  const faqItems = [
    {
      question: "Can I change my plan anytime?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your subscription data remains accessible for 30 days after cancellation. After that, we'll securely delete your data unless you reactivate your account."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 30-day money-back guarantee for all plans. If you're not satisfied, contact our support team for a full refund."
    },
    {
      question: "Is my financial data secure?",
      answer: "Absolutely. We use bank-level encryption and are SOC 2 Type II compliant. We never store your banking credentials directly."
    },
    {
      question: "Can I connect multiple bank accounts?",
      answer: "Yes! Pro and Business plans support multiple bank account connections for comprehensive subscription tracking across all your accounts."
    }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Small Business Owner",
      content: "Saved over $200/month by finding subscriptions I forgot about!",
      rating: 5
    },
    {
      name: "Mike C.", 
      role: "Finance Manager",
      content: "The analytics help our team make better software purchasing decisions.",
      rating: 5
    },
    {
      name: "Emma R.",
      role: "Freelancer",
      content: "Never miss renewal dates anymore. The notifications are perfect.",
      rating: 5
    }
  ];

  if (plansLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-green-900/20 dark:to-purple-900/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <CreditCard className="h-3 w-3 mr-1" />
              Simple, Transparent Pricing
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="text-pricing-title">
              Choose Your Perfect Plan
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto" data-testid="text-pricing-description">
              Start free and scale as you grow. All plans include our core subscription tracking features 
              with no hidden fees or surprise charges.
            </p>
            {user && (
              <div className="mt-6" data-testid="text-current-status">
                <Badge variant={isActiveUser ? "default" : "secondary"} className="text-sm px-4 py-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Current Status: {user.subscriptionStatus}
                </Badge>
              </div>
            )}
          </div>

          {/* Billing Toggle */}
          <Tabs defaultValue="monthly" className="w-full max-w-md mx-auto mb-12">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" data-testid="tab-yearly">
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={plan.id} 
                className={`relative ${
                  isCurrentPlan(plan.id) ? 'ring-2 ring-primary shadow-lg' : ''
                } ${
                  index === 1 ? 'border-blue-500 shadow-lg scale-105' : ''
                } transition-all duration-300 hover:shadow-lg`}
                data-testid={`card-plan-${plan.id}`}
              >
                {isCurrentPlan(plan.id) && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600" data-testid={`badge-current-plan-${plan.id}`}>
                    Current Plan
                  </Badge>
                )}
                {index === 1 && !isCurrentPlan(plan.id) && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600" data-testid={`badge-popular-plan`}>
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2" data-testid={`text-plan-name-${plan.id}`}>
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-base" data-testid={`text-plan-description-${plan.id}`}>
                    {plan.description}
                  </CardDescription>
                  <div className="mt-6">
                    <div className="text-5xl font-bold" data-testid={`text-plan-price-${plan.id}`}>
                      ${plan.price}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      per {plan.interval} • billed {plan.interval}ly
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start" data-testid={`text-plan-feature-${plan.id}-${featureIndex}`}>
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-8">
                  {isCurrentPlan(plan.id) ? (
                    <div className="w-full space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full py-6 text-lg font-semibold" 
                        disabled
                        data-testid={`button-current-plan-${plan.id}`}
                      >
                        <Shield className="h-5 w-5 mr-2" />
                        Current Plan
                      </Button>
                      {isActiveUser && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="w-full"
                          onClick={handleCancel}
                          disabled={cancelMutation.isPending}
                          data-testid={`button-cancel-plan-${plan.id}`}
                        >
                          {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Cancel Subscription
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className={`w-full py-6 text-lg font-semibold ${
                        index === 1 ? 'bg-blue-600 hover:bg-blue-700' : ''
                      }`}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgradeMutation.isPending}
                      data-testid={`button-upgrade-plan-${plan.id}`}
                    >
                      {upgradeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {isTrialUser ? 'Start Free Trial' : 'Switch to'} {plan.name}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                30-day money-back guarantee
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Cancel anytime
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                24/7 support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Compare All Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              See exactly what's included in each plan to find your perfect fit
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">Features</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold">Business</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-4">Subscriptions tracked</td>
                  <td className="text-center py-4 px-4">Up to 10</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Bank account connections</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4">3</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">AI insights & recommendations</td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-red-500" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Advanced analytics</td>
                  <td className="text-center py-4 px-4">Basic</td>
                  <td className="text-center py-4 px-4">Advanced</td>
                  <td className="text-center py-4 px-4">Enterprise</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Team collaboration</td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-red-500" /></td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-red-500" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Support</td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4">Email & Chat</td>
                  <td className="text-center py-4 px-4">Priority Support</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See what our customers say about their subscription savings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6" data-testid={`testimonial-${index}`}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {faqItems.map((item, index) => (
              <Card key={index} className="mb-4" data-testid={`faq-${index}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed pl-8">
                    {item.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Start Saving?
            </h2>
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
              Join thousands of users who've already saved thousands of dollars by taking control of their subscriptions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" data-testid="button-start-trial">
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/features" data-testid="button-view-features">
                <Button size="lg" variant="outline" className="px-8 py-3 text-lg text-white border-white hover:bg-white hover:text-purple-600">
                  View All Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {plans.length === 0 && (
        <div className="text-center py-12" data-testid="text-no-plans">
          <p className="text-muted-foreground">No plans available at the moment.</p>
        </div>
      )}
    </div>
  );
}