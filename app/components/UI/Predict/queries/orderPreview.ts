import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { OrderPreview, PreviewOrderParams } from '../types';

export const predictOrderPreviewKeys = {
  all: () => ['predict', 'orderPreview'] as const,
  detail: (params: PreviewOrderParams) =>
    [
      ...predictOrderPreviewKeys.all(),
      params.marketId,
      params.outcomeId,
      params.outcomeTokenId,
      params.side,
      params.size,
      params.tickSize,
      params.positionId,
    ] as const,
};

export const predictOrderPreviewOptions = ({
  marketId,
  outcomeId,
  outcomeTokenId,
  side,
  size,
  tickSize,
  positionId,
}: PreviewOrderParams) =>
  queryOptions<OrderPreview, Error>({
    queryKey: predictOrderPreviewKeys.detail({
      marketId,
      outcomeId,
      outcomeTokenId,
      side,
      size,
      tickSize,
      positionId,
    }),
    queryFn: async (): Promise<OrderPreview> =>
      Engine.context.PredictController.previewOrder({
        marketId,
        outcomeId,
        outcomeTokenId,
        side,
        size,
        tickSize,
        positionId,
      }),
    retry: false,
    keepPreviousData: true,
  });
