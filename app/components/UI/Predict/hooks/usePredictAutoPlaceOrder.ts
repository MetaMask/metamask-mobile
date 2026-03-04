import { useCallback, useState } from 'react';
import { usePredictPayWithAnyTokenTracking } from './usePredictPayWithAnyTokenTracking';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PredictNavigationParamList } from '../types/navigation';

interface UsePredictAutoPlaceOrderParams {
  handlePlaceOrder: () => Promise<void>;
}

interface UsePredictAutoPlaceOrderResult {
  isAutoPlaceLoading: boolean;
}

export function usePredictAutoPlaceOrder({
  handlePlaceOrder,
}: UsePredictAutoPlaceOrderParams): UsePredictAutoPlaceOrderResult {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const { transactionId } = route.params;

  const [isAutoPlaceLoading, setIsAutoPlaceLoading] = useState(false);

  const [autoPlaceOrderDone, setAutoPlaceOrderDone] = useState(false);

  const executeAutoPlaceOrder = useCallback(async () => {
    try {
      setIsAutoPlaceLoading(true);
      await handlePlaceOrder();
    } catch (error) {
      console.error(error);
    } finally {
      setIsAutoPlaceLoading(false);
      setAutoPlaceOrderDone(true);
    }
  }, [handlePlaceOrder, setIsAutoPlaceLoading]);

  const handleTransactionConfirmed = useCallback(() => {
    if (!isAutoPlaceLoading && !autoPlaceOrderDone) {
      executeAutoPlaceOrder();
    }
  }, [autoPlaceOrderDone, executeAutoPlaceOrder, isAutoPlaceLoading]);

  usePredictPayWithAnyTokenTracking({
    transactionId,
    onConfirm: handleTransactionConfirmed,
  });

  return { isAutoPlaceLoading };
}
