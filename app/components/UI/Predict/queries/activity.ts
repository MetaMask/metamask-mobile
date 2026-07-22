import type { QueryFunctionContext } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { PREDICT_ACTIVITY_PAGE_SIZE } from '../constants/transactions';
import type { PredictActivity } from '../types';

export const predictActivityKeys = {
  all: () => ['predict', 'activity'] as const,
  byAddress: (address: string, limit: number) =>
    [...predictActivityKeys.all(), address, limit] as const,
};

type PredictActivityQueryKey = ReturnType<typeof predictActivityKeys.byAddress>;

export const predictActivityOptions = ({
  address,
  limit = PREDICT_ACTIVITY_PAGE_SIZE,
}: {
  address: string;
  limit?: number;
}) => ({
  queryKey: predictActivityKeys.byAddress(address, limit),
  initialPageParam: 0,
  queryFn: async ({
    pageParam,
  }: QueryFunctionContext<PredictActivityQueryKey, number>): Promise<
    PredictActivity[]
  > =>
    Engine.context.PredictController.getActivity({
      address,
      limit,
      offset: pageParam,
    }),
  getNextPageParam: (
    lastPage: PredictActivity[],
    allPages: PredictActivity[][],
  ): number | undefined =>
    lastPage.length > 0 ? allPages.length * limit : undefined,
});
