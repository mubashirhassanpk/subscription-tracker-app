import { Link } from "wouter";
import { Crown, Mail, Phone, MapPin, Github, Twitter, Linkedin, Facebook, ChevronRight, Shield, Globe, Award, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Analytics", href: "/analytics" },
    { name: "Mobile App", href: "#mobile-app" },
    { name: "Browser Extension", href: "#chrome-extension" },
  ];

  const companyLinks = [
    { name: "About Us", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
    { name: "Press Kit", href: "/press" },
    { name: "Contact", href: "/contact" },
    { name: "Partners", href: "/partners" },
  ];

  const supportLinks = [
    { name: "Help Center", href: "/help" },
    { name: "Documentation", href: "/docs" },
    { name: "API Reference", href: "/api" },
    { name: "Status Page", href: "/status" },
    { name: "Feature Requests", href: "/feature-requests" },
    { name: "Community", href: "/community" },
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "GDPR", href: "/gdpr" },
    { name: "Security", href: "/security" },
    { name: "Compliance", href: "/compliance" },
  ];

  const socialLinks = [
    { name: "Twitter", href: "https://twitter.com/subtracker", icon: <Twitter className="h-5 w-5" /> },
    { name: "LinkedIn", href: "https://linkedin.com/company/subtracker", icon: <Linkedin className="h-5 w-5" /> },
    { name: "Facebook", href: "https://facebook.com/subtracker", icon: <Facebook className="h-5 w-5" /> },
    { name: "GitHub", href: "https://github.com/subtracker", icon: <Github className="h-5 w-5" /> },
  ];

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">
              Stay Updated with SubTracker
            </h3>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Get the latest features, tips, and exclusive insights to maximize your subscription savings. 
              Join over 10,000 smart subscribers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:bg-white/20"
                data-testid="input-newsletter-email"
              />
              <Button 
                variant="secondary" 
                className="bg-white text-purple-600 hover:bg-gray-100 font-semibold"
                data-testid="button-newsletter-subscribe"
              >
                Subscribe
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm mt-4 opacity-75">
              No spam, unsubscribe anytime. We respect your privacy.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Crown className="h-8 w-8 text-purple-400" />
                <span className="font-bold text-2xl">SubTracker</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                The most advanced subscription management platform. Take complete control of your recurring expenses 
                with AI-powered insights and multi-channel notifications.
              </p>
              
              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span className="text-gray-300">SOC 2 Certified</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300">50+ Countries</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-yellow-400" />
                  <span className="text-gray-300">Industry Leader</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span className="text-gray-300">10,000+ Users</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors hover:text-purple-400"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`social-link-${social.name.toLowerCase()}`}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-lg mb-6 text-white">Product</h4>
              <ul className="space-y-4">
                {productLinks.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                      data-testid={`footer-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-lg mb-6 text-white">Company</h4>
              <ul className="space-y-4">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                      data-testid={`footer-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="font-semibold text-lg mb-6 text-white">Support</h4>
              <ul className="space-y-4">
                {supportLinks.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                      data-testid={`footer-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Contact */}
            <div>
              <h4 className="font-semibold text-lg mb-6 text-white">Legal & Contact</h4>
              
              {/* Contact Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className="text-sm">hello@subtracker.uk</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Phone className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-start gap-3 text-gray-400">
                  <MapPin className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">San Francisco, CA<br />United States</span>
                </div>
              </div>

              {/* Legal Links */}
              <ul className="space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                      data-testid={`footer-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-gray-800" />

      {/* Bottom Bar */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-400">
            <p>&copy; {currentYear} SubTracker. All rights reserved.</p>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>in San Francisco</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>All systems operational</span>
            </div>
            <div className="text-gray-500">|</div>
            <span>99.9% Uptime</span>
            <div className="text-gray-500">|</div>
            <span>Enterprise Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}