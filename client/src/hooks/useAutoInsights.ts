import { useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
const AUTO_INSIGHTS_KEY = 'subscription-tracker-auto-insights-last';
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // Check every 10 minutes

interface AutoInsightsOptions {
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAutoInsights(options: AutoInsightsOptions = {}) {
  const { enabled = true, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  // Auto-generate insights mutation
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      console.log('Auto-generating AI insights...');
      return apiRequest('POST', '/api/notifications/insights/generate');
    },
    onSuccess: (data) => {
      console.log('Auto insights generated successfully:', data);
      
      // Update the last generation timestamp
      localStorage.setItem(AUTO_INSIGHTS_KEY, Date.now().toString());
      
      // Refresh notifications to show new insights
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Auto insights generation failed:', error);
      onError?.(error as Error);
    }
  });

  // Check if insights should be auto-generated
  const checkShouldGenerate = useCallback((): boolean => {
    try {
      const lastGeneration = localStorage.getItem(AUTO_INSIGHTS_KEY);
      if (!lastGeneration) {
        return true; // Never generated before
      }

      const lastTimestamp = parseInt(lastGeneration, 10);
      const now = Date.now();
      const timeSinceLastGeneration = now - lastTimestamp;

      return timeSinceLastGeneration >= FIVE_HOURS_MS;
    } catch (error) {
      console.warn('Error checking auto insights timestamp:', error);
      return false;
    }
  }, []);

  // Get time until next auto-generation
  const getTimeUntilNext = useCallback((): number => {
    try {
      const lastGeneration = localStorage.getItem(AUTO_INSIGHTS_KEY);
      if (!lastGeneration) {
        return 0; // Should generate now
      }

      const lastTimestamp = parseInt(lastGeneration, 10);
      const now = Date.now();
      const timeSinceLastGeneration = now - lastTimestamp;
      const timeUntilNext = FIVE_HOURS_MS - timeSinceLastGeneration;

      return Math.max(0, timeUntilNext);
    } catch (error) {
      console.warn('Error calculating time until next generation:', error);
      return FIVE_HOURS_MS; // Default to 5 hours
    }
  }, []);

  // Trigger auto-generation if needed
  const triggerIfNeeded = useCallback(() => {
    if (!enabled || generateInsightsMutation.isPending) {
      return;
    }

    if (checkShouldGenerate()) {
      console.log('Auto-triggering AI insights generation (5+ hours since last)');
      generateInsightsMutation.mutate();
    }
  }, [enabled, generateInsightsMutation, checkShouldGenerate]);

  // Set up periodic checking
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial check on mount
    const timeUntilNext = getTimeUntilNext();
    console.log(`Next auto insights generation in ${Math.round(timeUntilNext / (1000 * 60))} minutes`);

    // Immediate check if it's time
    triggerIfNeeded();

    // Set up periodic checks
    const interval = setInterval(() => {
      triggerIfNeeded();
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, triggerIfNeeded, getTimeUntilNext]);

  return {
    isGenerating: generateInsightsMutation.isPending,
    generateNow: () => {
      if (!generateInsightsMutation.isPending) {
        generateInsightsMutation.mutate();
      }
    },
    getTimeUntilNext,
    checkShouldGenerate,
    reset: () => {
      localStorage.removeItem(AUTO_INSIGHTS_KEY);
    },
    setLastGeneration: (timestamp?: number) => {
      localStorage.setItem(AUTO_INSIGHTS_KEY, (timestamp || Date.now()).toString());
    }
  };
}