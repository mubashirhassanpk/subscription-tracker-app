import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { HeaderMenu } from "./components/HeaderMenu";
import Home from "./pages/Home";
import Documentation from "./pages/Documentation";
import ApiKeys from "./pages/ApiKeys";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/docs" component={Documentation} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Custom sidebar width for the application
  const style = {
    "--sidebar-width": "16rem",       // 256px for navigation
    "--sidebar-width-icon": "3rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="subscription-tracker-theme">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <HeaderMenu />
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
