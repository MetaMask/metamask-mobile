import type { QueryFunctionContext } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { PREDICT_ACTIVITY_PAGE_SIZE } from '../constants/transactions';
import type { PredictActivityPage } from '../types';

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
  queryFn: async ({
    pageParam,
  }: QueryFunctionContext<PredictActivityQueryKey, string | undefined>): Promise<PredictActivityPage> =>
    Engine.context.PredictController.getActivity({
      address,
      limit,
      cursor: pageParam,
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: PredictActivityPage): string | undefined =>
    lastPage.nextCursor ?? undefined,
});
