import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calendar,
  BarChart3,
  Bell,
  User,
  Plus,
  AlertCircle
} from "lucide-react";

export function MobileBottomNav() {
  const [location] = useLocation();

  const isMarketingPage = location === '/' || location === '/features' || location === '/pricing';
  
  if (isMarketingPage) {
    return null; // Don't show bottom nav on marketing pages
  }

  const navItems = [
    { 
      title: "Dashboard", 
      url: "/dashboard", 
      icon: Home, 
      active: location === "/dashboard" 
    },
    { 
      title: "Analytics", 
      url: "/analytics", 
      icon: BarChart3, 
      active: location === "/analytics" 
    },
    { 
      title: "Calendar", 
      url: "/calendar", 
      icon: Calendar, 
      active: location === "/calendar" 
    },
    { 
      title: "Reminders", 
      url: "/reminders", 
      icon: AlertCircle, 
      active: location === "/reminders" 
    },
    { 
      title: "Profile", 
      url: "/profile", 
      icon: User, 
      active: location === "/profile" 
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t md:hidden">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => (
          <Button
            key={item.url}
            variant={item.active ? "secondary" : "ghost"}
            size="sm"
            className="flex flex-col items-center gap-1 h-12 w-16 px-1"
            data-testid={`mobile-nav-${item.title.toLowerCase()}`}
            asChild
          >
            <Link href={item.url}>
              <item.icon className={`h-4 w-4 ${item.active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs leading-none ${item.active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {item.title}
              </span>
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}