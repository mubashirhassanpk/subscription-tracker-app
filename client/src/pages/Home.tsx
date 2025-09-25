import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  TrendingUp,
  Bell,
  Shield,
  Zap,
  BarChart3,
  Clock,
  DollarSign,
  Users,
  Check,
  ArrowRight,
  Star,
  Target
} from "lucide-react";

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: <CreditCard className="h-8 w-8" />,
      title: "Smart Subscription Tracking",
      description: "Automatically track all your recurring subscriptions in one centralized dashboard with detailed cost breakdowns."
    },
    {
      icon: <Bell className="h-8 w-8" />,
      title: "Intelligent Notifications",
      description: "Never miss a renewal again. Get smart alerts for upcoming payments, price changes, and cancellation deadlines."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Advanced Analytics",
      description: "Detailed insights into your spending patterns, subscription trends, and cost optimization opportunities."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Secure & Private",
      description: "Bank-level security with end-to-end encryption. Your financial data stays private and protected."
    }
  ];

  const benefits = [
    "Save money by identifying unused subscriptions",
    "Avoid unexpected charges and price increases",
    "Track spending patterns and budget better",
    "Manage family and team subscriptions easily",
    "Get insights to optimize your digital expenses"
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Small Business Owner",
      content: "I discovered I was paying for 12 subscriptions I'd forgotten about. Saved $300+ monthly!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Finance Manager",
      content: "Finally have visibility into our company's SaaS spending. The analytics are incredibly detailed.",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "Freelancer",
      content: "Love the upcoming renewal alerts. Never get surprised by charges anymore.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Trusted by 10,000+ users
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Take Control of Your
              <span className="text-blue-600 dark:text-blue-400"> Subscriptions</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Stop wasting money on forgotten subscriptions. Our intelligent tracker helps you monitor, 
              manage, and optimize all your recurring payments in one beautiful dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/dashboard" data-testid="button-get-started">
                <Button size="lg" className="px-8 py-3 text-lg">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/features" data-testid="button-learn-more">
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Free 14-day trial
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need to Manage Subscriptions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Powerful features designed to give you complete visibility and control over your recurring expenses.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setActiveFeature(index)}
                data-testid={`feature-card-${index}`}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why Choose Our Subscription Tracker?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Join thousands of users who've taken control of their subscription spending
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Card className="p-8">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      $2,400
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      Average annual savings per user
                    </p>
                  </div>
                  <Separator className="mb-6" />
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-semibold text-green-600 dark:text-green-400">15+</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Forgotten subscriptions found</p>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">98%</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">User satisfaction rate</p>
                    </div>
                  </div>
                </Card>
              </div>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3" data-testid={`benefit-${index}`}>
                    <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Loved by Users Worldwide
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See what our customers are saying about their experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <Target className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Take Control?
            </h2>
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
              Join thousands of smart users who've already optimized their subscription spending. 
              Start your free trial today and see how much you can save.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" data-testid="button-start-free-trial">
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing" data-testid="button-view-pricing">
                <Button size="lg" variant="outline" className="px-8 py-3 text-lg text-white border-white hover:bg-white hover:text-blue-600">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}