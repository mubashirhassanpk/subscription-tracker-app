import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ThemeToggleProps {
  onRefresh?: () => void;
}

export function ThemeToggle({ onRefresh }: ThemeToggleProps = {}) {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const handleClick = async () => {
    // Toggle theme
    setTheme(theme === "light" ? "dark" : "light");
    
    // Also refresh dashboard data
    if (onRefresh) {
      onRefresh();
    } else {
      // Default refresh behavior
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // Trigger trial expiry check
      try {
        await apiRequest('POST', '/api/notifications/trials/check');
      } catch (error) {
        console.error('Failed to check trial expiries:', error);
      }
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={handleClick} data-testid="button-theme-toggle">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme and refresh data</span>
    </Button>
  );
}