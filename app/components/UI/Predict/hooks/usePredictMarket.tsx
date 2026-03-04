import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';

/**
 * Hook to fetch detailed Predict market information.
 *
 * Backed by React Query — results are cached, deduplicated, and
 * automatically revalidated on stale-while-revalidate semantics.
 */
export const usePredictMarket = ({
  id,
  enabled = true,
}: {
  id: string;
  enabled?: boolean;
}) =>
  useQuery({
    ...predictQueries.market.options({ marketId: id }),
    enabled: enabled && !!id,
  });
