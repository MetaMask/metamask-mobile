import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { OrderPreview, PreviewMaxBuyOrderParams } from '../types';

export const predictMaxBuyOrderPreviewKeys = {
  all: () => ['predict', 'maxBuyOrderPreview'] as const,
  detail: (params: PreviewMaxBuyOrderParams) =>
    [
      ...predictMaxBuyOrderPreviewKeys.all(),
      params.marketId,
      params.outcomeId,
      params.outcomeTokenId,
      params.availableBalance,
    ] as const,
};

export const predictMaxBuyOrderPreviewOptions = (
  params: PreviewMaxBuyOrderParams,
) =>
  queryOptions<OrderPreview | null, Error>({
    queryKey: predictMaxBuyOrderPreviewKeys.detail(params),
    queryFn: () => Engine.context.PredictController.previewMaxBuyOrder(params),
    retry: false,
  });
