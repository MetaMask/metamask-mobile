import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { GetBalanceParams } from '../providers/types';

/**
 * Query key factory for Predict balance queries.
 *
 * - `all()` — prefix key for invalidating every balance entry at once.
 * - `detail(providerId, address)` — unique key for a specific provider + address pair.
 */
export const predictBalanceKeys = {
  all: () => ['predict', 'balance'] as const,
  detail: (providerId: string, address: string) =>
    [...predictBalanceKeys.all(), providerId, address] as const,
};

/**
 * Returns `queryOptions` for fetching a Predict balance.
 *
 * The returned object includes `queryKey`, `queryFn`, and `staleTime`,
 * and can be spread directly into `useQuery` or passed to
 * `queryClient.prefetchQuery`.
 *
 * @param params - Provider ID and wallet address.
 */
export const predictBalanceOptions = ({
  address = '',
  providerId,
}: GetBalanceParams) =>
  queryOptions({
    queryKey: predictBalanceKeys.detail(providerId, address),
    queryFn: async (): Promise<number> => {
      const balance = await Engine.context.PredictController.getBalance({
        address,
        providerId,
      });

      DevLogger.log('usePredictBalance: Loaded balance', {
        balance,
        providerId,
      });

      return balance;
    },
    staleTime: 10_000,
  });
