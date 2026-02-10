import { useCallback, useEffect, useRef, useState } from 'react';
import { SLIPPAGE_BEST_AVAILABLE } from '../providers/polymarket/constants';
import type { OrderPreview, PlaceOrderParams } from '../providers/types';
import type {
  PredictMarketBusySheetRef,
  PredictMarketBusySheetVariant,
} from '../components/PredictMarketBusySheet';

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
    useState<PredictMarketBusySheetVariant>('busy');
  const retrySheetRef = useRef<PredictMarketBusySheetRef>(null);

  const handleRetryWithBestPrice = useCallback(async () => {
    if (!preview) return;
    setIsRetrying(true);
    try {
      const retryPreview = { ...preview, slippage: SLIPPAGE_BEST_AVAILABLE };
      await placeOrder({
        providerId,
        analyticsProperties,
        preview: retryPreview,
      });
    } catch {
      setRetrySheetVariant('failed');
      retrySheetRef.current?.onOpenBottomSheet();
    } finally {
      setIsRetrying(false);
    }
  }, [preview, placeOrder, providerId, analyticsProperties]);

  const handleRetryDismiss = useCallback(() => {
    resetOrderNotFilled();
  }, [resetOrderNotFilled]);

  useEffect(() => {
    if (isOrderNotFilled) {
      setRetrySheetVariant('busy');
      retrySheetRef.current?.onOpenBottomSheet();
    }
  }, [isOrderNotFilled]);

  return {
    retrySheetRef,
    retrySheetVariant,
    isRetrying,
    handleRetryWithBestPrice,
    handleRetryDismiss,
  };
}
