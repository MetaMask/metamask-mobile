import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type {
  RampsOrder,
  RampsOrderStatus,
  PaymentMethod,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useRampsController } from './useRampsController';
import { createHeadlessBuyNavDetails } from '../Views/HeadlessBuy/HeadlessBuy';
import { createRampsOrderDetailsNavDetails } from '../Views/OrderDetails/OrderDetails';

interface UseRampsQuickBuyParams {
  assetId?: string;
}

interface OrderStatusUpdate {
  order: RampsOrder;
  previousStatus: RampsOrderStatus;
}

interface UseRampsQuickBuyResult {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  openBuyModal: (params: {
    assetId: string;
    paymentMethodId: string;
    amount: number;
  }) => void;
  order: OrderStatusUpdate | null;
  goToBuyOrder: (orderId: string) => void;
}

/**
 * Hook for external teams to initiate a headless ramps buy flow.
 *
 * Pre-fetches payment methods for a given assetId, exposes `openBuyModal`
 * to launch the headless checkout flow, and provides order status updates
 * via the `order` field.
 *
 * @param params - Configuration with optional `assetId` to pre-select.
 * @returns Payment methods, loading state, error, and actions.
 */
export function useRampsQuickBuy({
  assetId,
}: UseRampsQuickBuyParams = {}): UseRampsQuickBuyResult {
  const navigation = useNavigation();
  const [order, setOrder] = useState<OrderStatusUpdate | null>(null);

  const {
    setSelectedToken,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    tokensLoading,
    tokensError,
    providersLoading,
    providersError,
  } = useRampsController();

  useEffect(() => {
    if (assetId) {
      setSelectedToken(assetId);
    }
  }, [assetId, setSelectedToken]);

  const isLoading = tokensLoading || providersLoading || paymentMethodsLoading;
  const error = tokensError || providersError || paymentMethodsError || null;

  const openBuyModal = useCallback(
    (modalParams: {
      assetId: string;
      paymentMethodId: string;
      amount: number;
    }) => {
      navigation.navigate(...createHeadlessBuyNavDetails(modalParams));
    },
    [navigation],
  );

  const goToBuyOrder = useCallback(
    (orderId: string) => {
      navigation.navigate(...createRampsOrderDetailsNavDetails({ orderId }));
    },
    [navigation],
  );

  useEffect(() => {
    const handler = (event: {
      order: RampsOrder;
      previousStatus: RampsOrderStatus;
    }) => {
      setOrder(event);
    };

    Engine.controllerMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handler,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RampsController:orderStatusChanged',
        handler,
      );
    };
  }, []);

  return {
    paymentMethods,
    isLoading,
    error,
    openBuyModal,
    order,
    goToBuyOrder,
  };
}

export default useRampsQuickBuy;
