import { QueryClient } from '@tanstack/react-query';

/** Creates an isolated query client with deterministic test defaults. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, networkMode: 'always', gcTime: Infinity },
    },
  });
}
