import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { UnrealizedPnL } from '../types';

export const predictUnrealizedPnLKeys = {
  all: () => ['predict', 'unrealizedPnL'] as const,
  byAddress: (address: string) =>
    [...predictUnrealizedPnLKeys.all(), address] as const,
};

export const predictUnrealizedPnLOptions = ({ address }: { address: string }) =>
  queryOptions({
    queryKey: predictUnrealizedPnLKeys.byAddress(address),
    queryFn: async (): Promise<UnrealizedPnL | null> => {
      const result = await Engine.context.PredictController.getUnrealizedPnL({
        address,
      });

      DevLogger.log('useUnrealizedPnL: Loaded unrealized P&L', {
        unrealizedPnL: result,
      });

      return result ?? null;
    },
    staleTime: 10_000,
  });
