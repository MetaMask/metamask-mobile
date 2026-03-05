import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidates all predict-related caches so the UI
 * reflects the latest state after a mutation (e.g. claim, withdraw).
 */
export function invalidatePredictCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['predict'] });
}
