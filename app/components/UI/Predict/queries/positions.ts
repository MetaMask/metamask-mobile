import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { GetAllPositionsResult } from '../types';

export const predictPositionsKeys = {
  all: () => ['predict', 'positions'] as const,
  byAddress: (address: string) =>
    [...predictPositionsKeys.all(), address] as const,
};

export const predictPositionsOptions = ({ address }: { address: string }) =>
  queryOptions({
    queryKey: predictPositionsKeys.byAddress(address),
    queryFn: async (): Promise<GetAllPositionsResult> =>
      Engine.context.PredictController.getAllPositions({ address }),
    staleTime: 5_000,
  });
