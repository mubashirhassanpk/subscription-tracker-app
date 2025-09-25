import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  Eye,
  Search,
  AlertTriangle,
  PieChart,
  Calendar,
  Mail,
  Brain,
  Lock,
  Award,
  Lightbulb,
  TrendingDown,
  PlayCircle,
  CheckCircle2,
  Sparkles,
  MousePointer,
  Activity,
  Database,
  FileText,
  Settings
} from "lucide-react";

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [moneySaved, setMoneySaved] = useState(0);
  const [subscriptionsFound, setSubscriptionsFound] = useState(0);
  const [usersSaved, setUsersSaved] = useState(0);

  // Animated counters
  useEffect(() => {
    const animateCounter = (setter: (value: number) => void, target: number, duration: number = 2000) => {
      let start = 0;
      const increment = target / (duration / 16); // 60fps
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(start));
        }
      }, 16);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(setMoneySaved, 2400);
          animateCounter(setSubscriptionsFound, 15);
          animateCounter(setUsersSaved, 10000);
        }
      });
    });

    const element = document.getElementById('stats-section');
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Testimonial rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Search className="h-12 w-12" />,
      title: "Smart Discovery",
      description: "AI-powered detection automatically finds hidden subscriptions across your accounts, emails, and bank statements.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Bell className="h-12 w-12" />,
      title: "Multi-Channel Notifications",
      description: "Advanced alert system with email, calendar integration, WhatsApp, browser notifications, and Chrome extension sync.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <BarChart3 className="h-12 w-12" />,
      title: "Advanced Analytics Dashboard",
      description: "Comprehensive insights with category breakdowns, peak payment analysis, spending trends, and CSV export capabilities.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <Smartphone className="h-12 w-12" />,
      title: "Mobile-Optimized Experience",
      description: "Beautiful mobile interface with bottom navigation, floating action button, and touch-friendly responsive design.",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: <FileText className="h-12 w-12" />,
      title: "Data Export & Management",
      description: "Export your subscription data and analytics to CSV format. Complete control over your subscription information.",
      gradient: "from-teal-500 to-cyan-500"
    },
    {
      icon: <Shield className="h-12 w-12" />,
      title: "Bank-Level Security",
      description: "Your data is protected with enterprise-grade encryption, SOC 2 compliance, and zero-knowledge architecture.",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Connect Your Accounts",
      description: "Securely link your bank accounts, credit cards, and email to start automatic discovery",
      icon: <Database className="h-8 w-8" />
    },
    {
      step: 2,
      title: "AI Discovers Everything",
      description: "Our AI analyzes transactions and emails to find all your subscriptions automatically",
      icon: <Eye className="h-8 w-8" />
    },
    {
      step: 3,
      title: "Get Intelligent Insights",
      description: "Receive personalized recommendations and alerts to optimize your subscription spending",
      icon: <Lightbulb className="h-8 w-8" />
    },
    {
      step: 4,
      title: "Save Money & Stay Organized",
      description: "Track renewals, cancel unused services, and keep your subscriptions perfectly managed",
      icon: <Target className="h-8 w-8" />
    }
  ];

  const comparisonFeatures = [
    { feature: "Automatic Discovery", us: true, competitor1: false, competitor2: true },
    { feature: "Multi-Channel Notifications", us: true, competitor1: false, competitor2: false },
    { feature: "Advanced Analytics Dashboard", us: true, competitor1: false, competitor2: false },
    { feature: "Mobile-Optimized Interface", us: true, competitor1: false, competitor2: true },
    { feature: "CSV Data Export", us: true, competitor1: false, competitor2: false },
    { feature: "Calendar Integration", us: true, competitor1: false, competitor2: false },
    { feature: "WhatsApp Notifications", us: true, competitor1: false, competitor2: false },
    { feature: "Bank-Level Security", us: true, competitor1: true, competitor2: false },
    { feature: "AI-Powered Insights", us: true, competitor1: false, competitor2: false },
    { feature: "24/7 Support", us: true, competitor1: false, competitor2: false },
  ];

  const trustIndicators = [
    { icon: <Shield className="h-8 w-8" />, title: "SOC 2 Certified", description: "Enterprise security standards" },
    { icon: <Lock className="h-8 w-8" />, title: "256-bit Encryption", description: "Bank-level data protection" },
    { icon: <Award className="h-8 w-8" />, title: "Industry Leader", description: "Trusted by 10,000+ users" },
    { icon: <CheckCircle2 className="h-8 w-8" />, title: "99.9% Uptime", description: "Reliable service guarantee" }
  ];

  const benefits = [
    "Multi-channel notifications across email, calendar, WhatsApp, and browser",
    "Advanced analytics with category breakdowns and spending trends",
    "Mobile-optimized interface with bottom navigation and floating action button",
    "Complete data control with CSV export capabilities",
    "Save money by identifying unused subscriptions and optimizing spending",
    "Never miss renewals with intelligent reminder scheduling",
    "Comprehensive insights to make data-driven subscription decisions"
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Small Business Owner",
      company: "Creative Studio LLC",
      content: "The multi-channel notifications are amazing! I get WhatsApp alerts, calendar reminders, and email notifications. Never missed a renewal since switching. The mobile app is perfect for managing on-the-go.",
      rating: 5,
      avatar: "SJ",
      savings: "$300/month"
    },
    {
      name: "Michael Chen",
      role: "Finance Manager",
      company: "Tech Innovations Inc",
      content: "The analytics dashboard is incredible! Category breakdowns, peak payment analysis, and CSV exports make financial reporting effortless. Best subscription management tool we've used.",
      rating: 5,
      avatar: "MC",
      savings: "$50K/year"
    },
    {
      name: "Emma Rodriguez",
      role: "Freelance Designer",
      company: "Independent",
      content: "The mobile experience is outstanding. The floating action button and bottom navigation make it so easy to track subscriptions anywhere. Export features help with client billing too.",
      rating: 5,
      avatar: "ER",
      savings: "$150/month"
    },
    {
      name: "David Park",
      role: "Startup Founder",
      company: "InnovateLab",
      content: "Advanced features like calendar integration and comprehensive analytics give us complete control. The export capabilities are perfect for board reports. Game-changing platform.",
      rating: 5,
      avatar: "DP",
      savings: "$2K/month"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.1),transparent)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.05),transparent)]" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-6 animate-pulse">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Trusted by 10,000+ users worldwide</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
                Never Lose Track of
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Your Subscriptions
                </span>
                <br />
                Again
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                Advanced subscription management with multi-channel notifications, comprehensive analytics, mobile optimization, and data export. 
                <span className="font-semibold text-gray-800 dark:text-gray-200"> Complete control over your subscriptions</span> with enterprise-level features.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <Link href="/dashboard" data-testid="button-get-started">
                  <Button size="lg" className="px-12 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                    <PlayCircle className="mr-3 h-6 w-6" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/features" data-testid="button-learn-more">
                  <Button variant="outline" size="lg" className="px-12 py-4 text-lg font-semibold border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
                    <Eye className="mr-3 h-6 w-6" />
                    See How It Works
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
                <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Free 14-day trial</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">No credit card required</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Interactive Demo Preview */}
            <div className="relative max-w-5xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">Subscription Dashboard</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500 rounded-lg">
                          <CreditCard className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">Monthly Subscriptions</h3>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">$247.99</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">12 active services</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500 rounded-lg">
                          <TrendingDown className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Saved</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">Money Saved</h3>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">$89.99</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">This month</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500 rounded-lg">
                          <Bell className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">Alert</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">Upcoming Renewals</h3>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Next 7 days</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Statistics */}
      <section id="stats-section" className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Join Thousands Who've Transformed Their Finances
              </h2>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Our users have discovered millions in hidden subscription costs and taken control of their recurring expenses.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="text-5xl lg:text-6xl font-bold text-white mb-4">
                  ${moneySaved.toLocaleString()}+
                </div>
                <p className="text-blue-100 text-lg font-medium">Average Annual Savings</p>
                <p className="text-blue-200 text-sm mt-2">Per user across all plans</p>
              </div>
              <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="text-5xl lg:text-6xl font-bold text-white mb-4">
                  {subscriptionsFound}+
                </div>
                <p className="text-blue-100 text-lg font-medium">Hidden Subscriptions Found</p>
                <p className="text-blue-200 text-sm mt-2">On average per user</p>
              </div>
              <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="text-5xl lg:text-6xl font-bold text-white mb-4">
                  {usersSaved.toLocaleString()}+
                </div>
                <p className="text-blue-100 text-lg font-medium">Happy Users</p>
                <p className="text-blue-200 text-sm mt-2">Across 50+ countries</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                <Activity className="h-3 w-3 mr-1" />
                Simple Process
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Get started in minutes and start saving immediately. Our AI does the heavy lifting while you stay in control.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {howItWorks.map((step, index) => (
                <div key={index} className="relative" data-testid={`how-it-works-${index}`}>
                  <Card className="h-full group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 dark:hover:border-blue-600">
                    <CardContent className="p-8 text-center">
                      <div className="relative mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                          {step.step}
                        </div>
                      </div>
                      <div className="mb-4 p-4 rounded-full bg-gray-100 dark:bg-gray-800 w-fit mx-auto group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                        <div className="text-blue-600 dark:text-blue-400">
                          {step.icon}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                <Zap className="h-3 w-3 mr-1" />
                Powerful Features
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Everything You Need in One Platform
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                From automatic discovery to intelligent insights, we've built the most comprehensive subscription management platform available.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className="group hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 hover:border-blue-200 dark:hover:border-blue-700 overflow-hidden"
                  onMouseEnter={() => setActiveFeature(index)}
                  data-testid={`feature-card-${index}`}
                >
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                          {feature.description}
                        </p>
                        <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                          Learn more <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                <Award className="h-3 w-3 mr-1" />
                Industry Leader
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why We're the Smart Choice
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Compare our comprehensive features with other subscription management tools and see why thousands choose us.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold">Features</th>
                      <th className="px-6 py-4 text-center font-semibold text-blue-600 dark:text-blue-400">Our Platform</th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-500">Competitor A</th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-500">Competitor B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 font-medium">{item.feature}</td>
                        <td className="px-6 py-4 text-center">
                          {item.us ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                          ) : (
                            <div className="h-6 w-6 mx-auto rounded-full border-2 border-gray-400"></div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.competitor1 ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                          ) : (
                            <div className="h-6 w-6 mx-auto rounded-full border-2 border-gray-400"></div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.competitor2 ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                          ) : (
                            <div className="h-6 w-6 mx-auto rounded-full border-2 border-gray-400"></div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-center">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Ready to experience the most advanced subscription management platform?
                </p>
                <Link href="/dashboard" data-testid="button-comparison-cta">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Start Free Trial Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                <Shield className="h-3 w-3 mr-1" />
                Security First
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Your Data is Safe & Secure
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                We employ bank-level security measures and industry best practices to protect your financial information.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {trustIndicators.map((indicator, index) => (
                <Card key={index} className="text-center p-6 hover:shadow-lg transition-all duration-300" data-testid={`trust-indicator-${index}`}>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-full mb-4 text-green-600 dark:text-green-400">
                    {indicator.icon}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{indicator.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{indicator.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                <Star className="h-3 w-3 mr-1" />
                Customer Success Stories
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Loved by Users Worldwide
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                See how our customers are saving thousands and taking control of their subscription spending.
              </p>
            </div>
            
            {/* Featured Testimonial */}
            <div className="mb-16">
              <Card className="max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-700 overflow-hidden">
                <CardContent className="p-8 md:p-12">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {testimonials[currentTestimonial].avatar}
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex justify-center md:justify-start gap-1 mb-4">
                        {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <blockquote className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200 mb-6 leading-relaxed">
                        "{testimonials[currentTestimonial].content}"
                      </blockquote>
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div>
                          <div className="font-semibold text-lg">{testimonials[currentTestimonial].name}</div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {testimonials[currentTestimonial].role} • {testimonials[currentTestimonial].company}
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-fit">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Saved {testimonials[currentTestimonial].savings}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Testimonial Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.slice(0, 3).map((testimonial, index) => (
                <Card 
                  key={index} 
                  className={`p-6 transition-all duration-300 cursor-pointer hover:shadow-xl ${
                    index === currentTestimonial % 3 ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
                  }`}
                  onClick={() => setCurrentTestimonial(index)}
                  data-testid={`testimonial-${index}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {testimonial.savings}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    "{testimonial.content.slice(0, 120)}..."
                  </blockquote>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
                <Target className="h-10 w-10" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Ready to Transform Your Finances?
              </h2>
              <p className="text-xl lg:text-2xl mb-8 opacity-90 leading-relaxed max-w-3xl mx-auto">
                Join over 10,000 users who've already saved millions in hidden subscription costs. 
                Start your journey to financial freedom today.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold mb-1">14 Days</div>
                <div className="text-sm opacity-80">Free Trial</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold mb-1">No Setup</div>
                <div className="text-sm opacity-80">Auto Discovery</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold mb-1">Instant</div>
                <div className="text-sm opacity-80">Savings</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <Link href="/dashboard" data-testid="button-final-cta-start">
                <Button size="lg" className="px-12 py-4 text-lg font-semibold bg-white text-purple-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                  <Sparkles className="mr-3 h-6 w-6" />
                  Start Saving Today
                </Button>
              </Link>
              <Link href="/features" data-testid="button-final-cta-demo">
                <Button size="lg" variant="outline" className="px-12 py-4 text-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-purple-600 transition-all duration-200">
                  <PlayCircle className="mr-3 h-6 w-6" />
                  See Demo
                </Button>
              </Link>
            </div>

            <p className="text-sm opacity-75 max-w-md mx-auto">
              No credit card required • Cancel anytime • 99.9% uptime guarantee
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}