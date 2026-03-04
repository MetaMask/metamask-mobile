import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { AccountState } from '../types';

export const predictAccountStateKeys = {
  all: () => ['predict', 'accountState'] as const,
};

export const predictAccountStateOptions = ({
  ensurePolygonNetworkExists,
}: {
  ensurePolygonNetworkExists: () => Promise<void>;
}) =>
  queryOptions({
    queryKey: predictAccountStateKeys.all(),
    queryFn: async (): Promise<AccountState> => {
      await ensurePolygonNetworkExists().catch(() => {
        // Network may already exist — swallow so the fetch can still proceed.
      });

      return Engine.context.PredictController.getAccountState({});
    },
    staleTime: 10_000,
  });
