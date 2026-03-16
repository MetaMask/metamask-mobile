import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { PredictPosition } from '../types';

export const predictPositionsKeys = {
  all: () => ['predict', 'positions'] as const,
  byAddress: (address: string) =>
    [...predictPositionsKeys.all(), address] as const,
};

export const predictPositionsOptions = ({ address }: { address: string }) =>
  queryOptions({
    queryKey: predictPositionsKeys.byAddress(address),
    queryFn: async (): Promise<PredictPosition[]> =>
      Engine.context.PredictController.getPositions({ address }),
    staleTime: 5_000,
  });
