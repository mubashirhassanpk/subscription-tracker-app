import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Settings, LogOut, Crown, CreditCard, HelpCircle, Search, Menu, Bell, Plus } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationCenter } from "./NotificationCenter";
import { Link, useLocation } from "wouter";

interface UserStatus {
  id: string;
  email: string;
  name: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  trialEndsAt?: string;
  plan?: {
    name: string;
    maxSubscriptions?: number;
  };
}

export function HeaderMenu() {
  const [location] = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user status
  const { data: userStatus } = useQuery<UserStatus>({
    queryKey: ['/api/account'],
  });

  const isTrialUser = userStatus?.subscriptionStatus === 'trial';
  const planName = userStatus?.plan?.name || (isTrialUser ? 'Trial' : 'Free');

  const navigationItems = [
    { title: "Dashboard", url: "/", icon: User, active: location === "/" },
    { title: "API Docs", url: "/docs", icon: HelpCircle, active: location === "/docs" },
    { title: "API Keys", url: "/api-keys", icon: CreditCard, active: location === "/api-keys" },
  ];

  const handleLogout = () => {
    // Implement logout logic here
    console.log("Logging out...");
  };

  return (
    <header className="flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - Logo and Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg hidden sm:block">Subscription Tracker</span>
        </div>
        
        {/* Search Bar - Hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-8"
            data-testid="input-header-search"
          />
        </div>
      </div>

      {/* Center - Navigation (Hidden on mobile) */}
      <nav className="hidden lg:flex items-center space-x-1">
        {navigationItems.map((item) => (
          <Button 
            key={item.url}
            variant={item.active ? "secondary" : "ghost"} 
            size="sm" 
            className="flex items-center gap-2"
            data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            asChild
          >
            <Link href={item.url}>
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </nav>

      {/* Right side - Actions and User Menu */}
      <div className="flex items-center gap-2">
        {/* Plan Badge */}
        {userStatus && (
          <Badge 
            variant={isTrialUser ? "secondary" : "default"}
            className="hidden sm:flex"
            data-testid="badge-user-plan"
          >
            <Crown className="h-3 w-3 mr-1" />
            {planName}
          </Badge>
        )}

        {/* Notifications */}
        <NotificationCenter />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-user-menu">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userStatus?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userStatus?.email || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Plan Status */}
            <DropdownMenuItem className="flex items-center justify-between" data-testid="menu-plan-status">
              <span>Plan Status</span>
              <Badge variant={isTrialUser ? "secondary" : "default"} className="text-xs">
                {planName}
              </Badge>
            </DropdownMenuItem>
            
            {isTrialUser && (
              <DropdownMenuItem data-testid="menu-upgrade">
                <Crown className="mr-2 h-4 w-4" />
                <span>Upgrade to Pro</span>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem data-testid="menu-settings">
              <Link href="/settings" className="flex items-center w-full">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be redirected to the login page and will need to sign in again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile Menu */}
        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>
                Access all features and settings
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-mobile-search"
                />
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <Button 
                    key={item.url}
                    variant={item.active ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setShowMobileMenu(false)}
                    data-testid={`mobile-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    asChild
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Link>
                  </Button>
                ))}
              </nav>

              {/* Mobile User Info */}
              {userStatus && (
                <div className="pt-4 border-t space-y-2">
                  <div className="text-sm">
                    <p className="font-medium">{userStatus.name}</p>
                    <p className="text-muted-foreground">{userStatus.email}</p>
                  </div>
                  <Badge variant={isTrialUser ? "secondary" : "default"}>
                    <Crown className="h-3 w-3 mr-1" />
                    {planName}
                  </Badge>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}