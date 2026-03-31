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
  detail: (address: string) => [...predictBalanceKeys.all(), address] as const,
};

export const predictBalanceOptions = ({ address = '' }: GetBalanceParams) =>
  queryOptions({
    queryKey: predictBalanceKeys.detail(address),
    queryFn: async (): Promise<number> => {
      const balance = await Engine.context.PredictController.getBalance({
        address,
      });

      DevLogger.log('usePredictBalance: Loaded balance', { balance });

      return balance;
    },
    staleTime: 10_000,
  });
