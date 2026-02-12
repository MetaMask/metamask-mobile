import { useCallback, useEffect, useRef, useState } from 'react';
import { SLIPPAGE_BEST_AVAILABLE } from '../providers/polymarket/constants';
import { PredictTradeStatus } from '../constants/eventNames';
import Engine from '../../../../core/Engine';
import type { OrderPreview, PlaceOrderParams } from '../providers/types';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import type {
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetVariant,
} from '../components/PredictOrderRetrySheet';

interface UsePredictOrderRetryParams {
  preview: OrderPreview | null | undefined;
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  isOrderNotFilled: boolean;
  resetOrderNotFilled: () => void;
}

export function usePredictOrderRetry({
  preview,
  placeOrder,
  analyticsProperties,
  isOrderNotFilled,
  resetOrderNotFilled,
}: UsePredictOrderRetryParams) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySheetVariant, setRetrySheetVariant] =
    useState<PredictOrderRetrySheetVariant>('busy');
  const wasOrderNotFilledRef = useRef(false);
  const retrySheetRef = useRef<PredictOrderRetrySheetRef>(null);

  const handleRetryWithBestPrice = useCallback(async () => {
    if (!preview) return;
    setIsRetrying(true);

    Engine.context.PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.RETRY_SUBMITTED,
      analyticsProperties,
      sharePrice: preview.sharePrice,
    });

    try {
      const retryPreview = { ...preview, slippage: SLIPPAGE_BEST_AVAILABLE };
      const outcome = await placeOrder({
        analyticsProperties,
        preview: retryPreview,
      });

      if (
        outcome.status === 'success' ||
        outcome.status === 'deposit_required'
      ) {
        retrySheetRef.current?.onCloseBottomSheet();
        resetOrderNotFilled();
        return;
      }

      throw new Error('Order not successful');
    } catch {
      setRetrySheetVariant('failed');
      retrySheetRef.current?.onOpenBottomSheet();
    } finally {
      setIsRetrying(false);
    }
  }, [preview, placeOrder, analyticsProperties, resetOrderNotFilled]);

  const isRetryingRef = useRef(false);
  isRetryingRef.current = isRetrying;

  useEffect(() => {
    if (isRetryingRef.current) {
      wasOrderNotFilledRef.current = isOrderNotFilled;
      return;
    }

    const becameNotFilled = !wasOrderNotFilledRef.current && isOrderNotFilled;

    if (becameNotFilled) {
      setRetrySheetVariant('busy');
      retrySheetRef.current?.onOpenBottomSheet();

      Engine.context.PredictController.trackPredictOrderEvent({
        status: PredictTradeStatus.RETRY_PROMPTED,
        analyticsProperties,
        sharePrice: preview?.sharePrice,
      });
    }

    wasOrderNotFilledRef.current = isOrderNotFilled;
  }, [isOrderNotFilled, analyticsProperties, preview?.sharePrice]);

  return {
    retrySheetRef,
    retrySheetVariant,
    isRetrying,
    handleRetryWithBestPrice,
  };
}
