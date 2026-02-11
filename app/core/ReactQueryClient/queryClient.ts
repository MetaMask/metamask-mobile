import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // * Increase staleTime to prevent frequent background refetches
      // Mobile users often trigger re-renders or navigate back/forth frequently.
      staleTime: 1000 * 60 * 5, // 5 minutes

      // * Retry logic
      // On mobile, failures are often due to network drops.
      // Exponential backoff is default, but you might want to limit retries.
      retry: 2,

      // * Cache Time
      // Keep data in memory for longer if you have the RAM,
      // but be mindful of persistent storage.
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});
