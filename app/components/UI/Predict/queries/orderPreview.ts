import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ensureError, parseErrorMessage } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';
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
      params.positionId,
    ] as const,
};

export const predictOrderPreviewOptions = ({
  marketId,
  outcomeId,
  outcomeTokenId,
  side,
  size,
  positionId,
}: PreviewOrderParams) =>
  queryOptions({
    queryKey: predictOrderPreviewKeys.detail({
      marketId,
      outcomeId,
      outcomeTokenId,
      side,
      size,
      positionId,
    }),
    queryFn: async (): Promise<OrderPreview> => {
      try {
        return await Engine.context.PredictController.previewOrder({
          marketId,
          outcomeId,
          outcomeTokenId,
          side,
          size,
          positionId,
        });
      } catch (err) {
        console.error('Failed to preview order:', err);

        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictOrderPreview',
          },
          context: {
            name: 'usePredictOrderPreview',
            data: {
              method: 'calculatePreview',
              action: 'order_preview',
              operation: 'order_management',
              side,
              marketId,
              outcomeId,
            },
          },
        });

        throw new Error(
          parseErrorMessage({
            error: err,
            defaultCode: PREDICT_ERROR_CODES.PREVIEW_FAILED,
          }),
        );
      }
    },
  });
