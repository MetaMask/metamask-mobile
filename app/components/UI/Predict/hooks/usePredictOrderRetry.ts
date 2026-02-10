import { useCallback, useEffect, useRef, useState } from 'react';
import { SLIPPAGE_BEST_AVAILABLE } from '../providers/polymarket/constants';
import { PredictTradeStatus } from '../constants/eventNames';
import Engine from '../../../../core/Engine';
import type { OrderPreview, PlaceOrderParams } from '../providers/types';
import type {
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetVariant,
} from '../components/PredictOrderRetrySheet';

interface UsePredictOrderRetryParams {
  preview: OrderPreview | null | undefined;
  placeOrder: (params: PlaceOrderParams) => Promise<void>;
  providerId: string;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  isOrderNotFilled: boolean;
  resetOrderNotFilled: () => void;
}

export function usePredictOrderRetry({
  preview,
  placeOrder,
  providerId,
  analyticsProperties,
  isOrderNotFilled,
  resetOrderNotFilled,
}: UsePredictOrderRetryParams) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySheetVariant, setRetrySheetVariant] =
    useState<PredictOrderRetrySheetVariant>('busy');
  const retrySheetRef = useRef<PredictOrderRetrySheetRef>(null);

  const handleRetryWithBestPrice = useCallback(async () => {
    if (!preview) return;
    setIsRetrying(true);

    Engine.context.PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.RETRY_SUBMITTED,
      analyticsProperties,
      providerId,
      sharePrice: preview.sharePrice,
    });

    try {
      const retryPreview = { ...preview, slippage: SLIPPAGE_BEST_AVAILABLE };
      await placeOrder({
        providerId,
        analyticsProperties,
        preview: retryPreview,
      });
      resetOrderNotFilled();
    } catch {
      setRetrySheetVariant('failed');
      retrySheetRef.current?.onOpenBottomSheet();
    } finally {
      setIsRetrying(false);
    }
  }, [
    preview,
    placeOrder,
    providerId,
    analyticsProperties,
    resetOrderNotFilled,
  ]);

  useEffect(() => {
    if (isOrderNotFilled) {
      setRetrySheetVariant('busy');
      retrySheetRef.current?.onOpenBottomSheet();

      Engine.context.PredictController.trackPredictOrderEvent({
        status: PredictTradeStatus.RETRY_PROMPTED,
        analyticsProperties,
        providerId,
        sharePrice: preview?.sharePrice,
      });
    }
  }, [isOrderNotFilled, analyticsProperties, providerId, preview?.sharePrice]);

  return {
    retrySheetRef,
    retrySheetVariant,
    isRetrying,
    handleRetryWithBestPrice,
    resetOrderNotFilled,
  };
}
