import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SearchProvider } from "./contexts/SearchContext";
import { HeaderMenu } from "./components/HeaderMenu";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Features from "./pages/Features";
import Documentation from "./pages/Documentation";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Plans from "./pages/Plans";
import History from "./pages/History";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import Reminders from "./pages/Reminders";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminCreateUser from "./pages/AdminCreateUser";
import AdminSubscriptionManagement from "./pages/AdminSubscriptionManagement";
import AdminSettings from "./pages/AdminSettings";
import AdminNotifications from "./pages/AdminNotifications";
import AdminApiKeys from "./pages/AdminApiKeys";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/features" component={Features} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/history" component={History} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/reminders" component={Reminders} />
      <Route path="/docs" component={Documentation} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/profile" component={Profile} />
      <Route path="/plans" component={Plans} />
      <Route path="/pricing" component={Plans} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUserManagement} />
      <Route path="/admin/users/create" component={AdminCreateUser} />
      <Route path="/admin/subscriptions" component={AdminSubscriptionManagement} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/notifications" component={AdminNotifications} />
      <Route path="/admin/api-keys" component={AdminApiKeys} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="subscription-tracker-theme">
        <TooltipProvider>
          <SearchProvider>
            <div className="min-h-screen w-full pb-16 md:pb-0">
              <HeaderMenu />
              <ImpersonationBanner />
              <main className="flex-1">
                <Router />
              </main>
              <MobileBottomNav />
            </div>
            <Toaster />
          </SearchProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
