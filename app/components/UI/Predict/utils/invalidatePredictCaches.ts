import type { QueryClient } from '@tanstack/react-query';
import { predictQueries } from '../queries';

/**
 * Invalidates balance, positions, and activity caches so the UI
 * reflects the latest state after a mutation (e.g. claim, place order).
 */
export function invalidatePredictCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: predictQueries.balance.keys.all(),
  });
  queryClient.invalidateQueries({
    queryKey: predictQueries.positions.keys.all(),
  });
  queryClient.invalidateQueries({
    queryKey: predictQueries.activity.keys.all(),
  });
}
