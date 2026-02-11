import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { GetBalanceParams } from '../providers/types';

export const predictBalanceKeys = {
  all: () => ['predict', 'balance'] as const,
  detail: (providerId: string, address: string) =>
    [...predictBalanceKeys.all(), providerId, address] as const,
};

export const predictBalanceOptions = ({
  address = '',
  providerId,
}: GetBalanceParams) =>
  queryOptions({
    queryKey: predictBalanceKeys.detail(providerId, address),
    queryFn: (): Promise<number> =>
      Engine.context.PredictController.getBalance({ address, providerId }),
    staleTime: 10_000,
  });
