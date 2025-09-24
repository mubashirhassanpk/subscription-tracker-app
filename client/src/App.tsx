import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SearchProvider } from "./contexts/SearchContext";
import { HeaderMenu } from "./components/HeaderMenu";
import Home from "./pages/Home";
import Documentation from "./pages/Documentation";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Calendar from "./pages/Calendar";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/history" component={History} />
      <Route path="/docs" component={Documentation} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
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
            <div className="min-h-screen w-full">
              <HeaderMenu />
              <main className="flex-1">
                <Router />
              </main>
            </div>
            <Toaster />
          </SearchProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
