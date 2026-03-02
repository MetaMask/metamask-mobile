import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  type RampsOrder,
  type PaymentMethod,
  RampsOrderStatus as Status,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useRampsController } from './useRampsController';
import { createHeadlessBuyNavDetails } from '../Views/HeadlessBuy/HeadlessBuy';
import { createRampsOrderDetailsNavDetails } from '../Views/OrderDetails/OrderDetails';

interface UseHeadlessRampsParams {
  assetId?: string;
  onOrderSucceeded?: (order: RampsOrder) => void;
  onOrderFailed?: (order: RampsOrder) => void;
}

interface UseHeadlessRampsResult {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  openBuyModal: (params: { paymentMethodId: string; amount: number }) => void;
  order: RampsOrder | null;
  goToBuyOrder: (orderId: string) => void;
}

/**
 * Hook for external teams to initiate a headless ramps buy flow.
 *
 * Pre-fetches payment methods for a given assetId, exposes `openBuyModal`
 * to launch the headless checkout flow, and provides order status updates
 * via the `order` field.
 *
 * @param params - Configuration with `assetId` to pre-select.
 * @returns Payment methods, loading state, error, and actions.
 */
export function useHeadlessRamps({
  assetId,
  onOrderSucceeded,
  onOrderFailed,
}: UseHeadlessRampsParams = {}): UseHeadlessRampsResult {
  const navigation = useNavigation();
  const [order, setOrder] = useState<RampsOrder | null>(null);

  const onOrderSucceededRef = useRef(onOrderSucceeded);
  const onOrderFailedRef = useRef(onOrderFailed);
  onOrderSucceededRef.current = onOrderSucceeded;
  onOrderFailedRef.current = onOrderFailed;

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
    (modalParams: { paymentMethodId: string; amount: number }) => {
      if (!assetId) {
        throw new Error(
          'useHeadlessRamps: assetId is required to open buy modal',
        );
      }
      navigation.navigate(
        ...createHeadlessBuyNavDetails({
          assetId,
          paymentMethodId: modalParams.paymentMethodId,
          amount: modalParams.amount,
        }),
      );
    },
    [assetId, navigation],
  );

  const goToBuyOrder = useCallback(
    (orderId: string) => {
      navigation.navigate(...createRampsOrderDetailsNavDetails({ orderId }));
    },
    [navigation],
  );

  useEffect(() => {
    const handler = (event: { order: RampsOrder; previousStatus: Status }) => {
      const { order: updatedOrder } = event;
      setOrder(updatedOrder);

      if (updatedOrder.status === Status.Completed) {
        onOrderSucceededRef.current?.(updatedOrder);
      } else if (
        updatedOrder.status === Status.Failed ||
        updatedOrder.status === Status.Cancelled ||
        updatedOrder.status === Status.IdExpired
      ) {
        onOrderFailedRef.current?.(updatedOrder);
      }
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

export default useHeadlessRamps;
