import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Target,
  Smartphone,
  Globe,
  Calendar,
  PieChart,
  AlertTriangle,
  FileText,
  Settings,
  Database,
  Workflow,
  ChevronRight,
  Sparkles,
  Brain,
  Lock,
  RefreshCw,
  Download
} from "lucide-react";

export default function Features() {
  const [activeCategory, setActiveCategory] = useState("tracking");

  const coreFeatures = [
    {
      icon: <CreditCard className="h-12 w-12" />,
      title: "Smart Subscription Tracking",
      description: "Automatically detect and track all your recurring subscriptions with AI-powered categorization and cost analysis.",
      features: [
        "Automatic subscription detection",
        "AI-powered categorization",
        "Cost breakdown analysis",
        "Duplicate subscription detection",
        "Multi-currency support"
      ]
    },
    {
      icon: <Bell className="h-12 w-12" />,
      title: "Intelligent Notifications",
      description: "Never miss important subscription events with our smart notification system that learns your preferences.",
      features: [
        "Renewal reminders",
        "Price change alerts",
        "Free trial ending warnings",
        "Cancellation deadline alerts",
        "Custom notification schedules"
      ]
    },
    {
      icon: <BarChart3 className="h-12 w-12" />,
      title: "Advanced Analytics",
      description: "Get deep insights into your spending patterns with comprehensive analytics and reporting tools.",
      features: [
        "Spending trend analysis",
        "Category-wise breakdowns",
        "Monthly/yearly comparisons",
        "Cost optimization suggestions",
        "Custom date range reports"
      ]
    },
    {
      icon: <Shield className="h-12 w-12" />,
      title: "Bank-Level Security",
      description: "Your financial data is protected with enterprise-grade security and privacy measures.",
      features: [
        "End-to-end encryption",
        "Two-factor authentication",
        "SOC 2 Type II compliance",
        "Regular security audits",
        "Data anonymization"
      ]
    }
  ];

  const advancedFeatures = [
    {
      category: "tracking",
      title: "Smart Tracking & Discovery",
      icon: <Zap className="h-8 w-8" />,
      items: [
        "Automatic bank transaction analysis",
        "Email receipt scanning",
        "Credit card integration",
        "Subscription pattern recognition",
        "Hidden subscription detection"
      ]
    },
    {
      category: "analytics",
      title: "Powerful Analytics Engine",
      icon: <PieChart className="h-8 w-8" />,
      items: [
        "Predictive spending forecasts",
        "ROI analysis for subscriptions",
        "Usage vs. cost optimization",
        "Seasonal spending patterns",
        "Comparative market analysis"
      ]
    },
    {
      category: "automation",
      title: "Smart Automation",
      icon: <Workflow className="h-8 w-8" />,
      items: [
        "Auto-categorization rules",
        "Smart budget allocation",
        "Automatic cost tracking",
        "Intelligent alerts system",
        "Bulk subscription management"
      ]
    },
    {
      category: "integration",
      title: "Seamless Integrations",
      icon: <Globe className="h-8 w-8" />,
      items: [
        "Banking API connections",
        "Credit card sync",
        "Email provider integration",
        "Calendar app sync",
        "Third-party service APIs"
      ]
    }
  ];

  const upcomingFeatures = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI-Powered Insights",
      description: "Advanced AI recommendations for subscription optimization",
      status: "Coming Q2 2024",
      features: [
        "Personalized saving recommendations",
        "Usage pattern analysis",
        "Smart plan suggestions",
        "Predictive cancellation alerts"
      ]
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Team Collaboration",
      description: "Manage family and business subscriptions together",
      status: "Coming Q3 2024", 
      features: [
        "Shared subscription dashboards",
        "Role-based access control",
        "Team spending limits",
        "Collaborative decision making"
      ]
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Mobile App",
      description: "Full-featured iOS and Android applications",
      status: "Coming Q4 2024",
      features: [
        "Native mobile experience",
        "Offline capability",
        "Push notifications",
        "Mobile-optimized analytics"
      ]
    }
  ];

  const integrations = [
    "Chase Bank", "Bank of America", "Wells Fargo", "Citi", "Capital One",
    "Gmail", "Outlook", "Yahoo Mail", "Apple Mail",
    "Google Calendar", "Outlook Calendar", "Apple Calendar",
    "Stripe", "PayPal", "Square", "Shopify"
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Comprehensive Feature Set
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Powerful Features for
              <span className="text-purple-600 dark:text-purple-400"> Complete Control</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover all the ways our subscription tracker helps you save money, stay organized, 
              and make smarter financial decisions with advanced features and intelligent automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" data-testid="button-try-features">
                <Button size="lg" className="px-8 py-3 text-lg">
                  Try All Features Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing" data-testid="button-see-pricing">
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  See Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Core Features That Make a Difference
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to take complete control of your subscription spending, built with precision and care.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {coreFeatures.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-all duration-300" data-testid={`core-feature-${index}`}>
                <div className="flex items-start gap-6">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.features.map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Advanced Capabilities
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Explore our comprehensive suite of advanced features designed for power users and businesses.
            </p>
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="max-w-4xl mx-auto">
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 mb-12">
              <TabsTrigger value="tracking" data-testid="tab-tracking">Tracking</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
              <TabsTrigger value="automation" data-testid="tab-automation">Automation</TabsTrigger>
              <TabsTrigger value="integration" data-testid="tab-integration">Integration</TabsTrigger>
            </TabsList>

            {advancedFeatures.map((category) => (
              <TabsContent key={category.category} value={category.category} className="space-y-6">
                <Card className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      {category.icon}
                    </div>
                    <h3 className="text-2xl font-bold">{category.title}</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {category.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Upcoming Features */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              What's Coming Next
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              We're constantly innovating and adding new features based on user feedback and industry trends.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {upcomingFeatures.map((feature, index) => (
              <Card key={index} className="p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300" data-testid={`upcoming-feature-${index}`}>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">{feature.status}</Badge>
                </div>
                <div className="mb-6">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 inline-block">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Seamless Integrations
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Connect with your favorite banks, email providers, and services for automatic tracking.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {integrations.map((integration, index) => (
              <Card key={index} className="p-4 text-center hover:shadow-md transition-all duration-300" data-testid={`integration-${index}`}>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {integration}
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Badge variant="outline" className="px-4 py-2">
              + Many more integrations available
            </Badge>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Experience All Features?
            </h2>
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
              Start your free trial today and discover how our comprehensive feature set 
              can transform the way you manage subscriptions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" data-testid="button-start-trial">
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing" data-testid="button-compare-plans">
                <Button size="lg" variant="outline" className="px-8 py-3 text-lg text-white border-white hover:bg-white hover:text-purple-600">
                  Compare Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}