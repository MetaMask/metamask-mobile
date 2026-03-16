import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { PredictActivity } from '../types';

export const predictActivityKeys = {
  all: () => ['predict', 'activity'] as const,
  byAddress: (address: string) =>
    [...predictActivityKeys.all(), address] as const,
};

export const predictActivityOptions = ({ address }: { address: string }) =>
  queryOptions({
    queryKey: predictActivityKeys.byAddress(address),
    queryFn: async (): Promise<PredictActivity[]> =>
      Engine.context.PredictController.getActivity({ address }),
  });
