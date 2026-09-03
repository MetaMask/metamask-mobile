import { useCallback } from 'react';
import type {
  OrderResult,
  UpdatePositionTPSLParams,
} from '@metamask/perps-controller';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

export function usePerpsPostOrderTPSL() {
  const { updatePositionTPSL } = usePerpsTrading();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const attachPostOrderTPSL = useCallback(
    async (params: UpdatePositionTPSLParams): Promise<OrderResult> => {
      let result: OrderResult;

      try {
        result = await updatePositionTPSL(params);
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
