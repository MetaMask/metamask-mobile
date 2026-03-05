import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { AccountState } from '../types';

export const predictAccountStateKeys = {
  all: () => ['predict', 'accountState'] as const,
};

export const predictAccountStateOptions = () =>
  queryOptions({
    queryKey: predictAccountStateKeys.all(),
    queryFn: async (): Promise<AccountState> =>
      Engine.context.PredictController.getAccountState({}),
    staleTime: 10_000,
  });
