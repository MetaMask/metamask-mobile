import { useCallback } from 'react';
import type {
  OrderParams,
  OrderResult,
  Position,
} from '@metamask/perps-controller';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

type PostOrderTPSLSource = Pick<
  OrderParams,
  'symbol' | 'takeProfitPrice' | 'stopLossPrice'
>;

export function usePerpsPostOrderTPSL() {
  const { updatePositionTPSL } = usePerpsTrading();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const attachPostOrderTPSL = useCallback(
    async (
      order: PostOrderTPSLSource,
      position?: Position,
    ): Promise<OrderResult> => {
      let result: OrderResult;

      try {
        result = await updatePositionTPSL({
          symbol: order.symbol,
          takeProfitPrice: order.takeProfitPrice,
          stopLossPrice: order.stopLossPrice,
          position,
        });
      } catch (error) {
        const normalizedError = ensureError(
          error,
          'usePerpsPostOrderTPSL.attachPostOrderTPSL',
        );
        Logger.error(
          normalizedError,
          'usePerpsPostOrderTPSL: Failed to attach protection',
        );
        result = {
          success: false,
          error: normalizedError.message,
        };
      }

      if (!result.success) {
        showToast(
          PerpsToastOptions.positionManagement.tpsl.postOrderAttachmentFailed,
        );
      }

      return result;
    },
    [
      PerpsToastOptions.positionManagement.tpsl.postOrderAttachmentFailed,
      showToast,
      updatePositionTPSL,
    ],
  );

  return { attachPostOrderTPSL };
}
