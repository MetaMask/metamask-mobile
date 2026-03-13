import type { CaipChainId } from '@metamask/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  type RampsOrder,
  type PaymentMethod,
  type Quote,
  RampsOrderStatus as Status,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useRampsController } from './useRampsController';
import useRampAccountAddress from './useRampAccountAddress';
import { createHeadlessBuyNavDetails } from '../Views/HeadlessBuy/HeadlessBuy';
import { createRampsOrderDetailsNavDetails } from '../Views/OrderDetails/OrderDetails';
import { getRampCallbackBaseUrl } from '../utils/getRampCallbackBaseUrl';

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
  getQuote: (params: {
    amount: number;
    paymentMethodId: string;
  }) => Promise<Quote | null>;
  order: RampsOrder | null;
  goToBuyOrder: (orderId: string) => void;
}

/**
 * Hook for external teams to initiate a headless ramps buy flow.
 *
 * Pre-fetches payment methods for a given assetId, exposes `openBuyModal`
 * to launch the headless checkout flow, `getQuote` to fetch a single quote
 * for the selected provider, and provides order status updates via the
 * `order` field.
 *
 * @param params - Configuration with `assetId` to pre-select.
 * @returns Payment methods, loading state, error, getQuote, openBuyModal, and actions.
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
    selectedProvider,
    selectedToken,
    getQuotes,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    tokensLoading,
    tokensError,
    providersLoading,
    providersError,
  } = useRampsController();

  const walletAddress =
    useRampAccountAddress(
      (selectedToken?.chainId as CaipChainId | undefined) ?? null,
    ) ?? '';

  useEffect(() => {
    if (assetId) {
      setSelectedToken(assetId);
    }
  }, [assetId, setSelectedToken]);

  const isLoading = tokensLoading || providersLoading || paymentMethodsLoading;
  const error = tokensError || providersError || paymentMethodsError || null;

  const getQuote = useCallback(
    async ({
      amount,
      paymentMethodId,
    }: {
      amount: number;
      paymentMethodId: string;
    }): Promise<Quote | null> => {
      if (!assetId) {
        throw new Error(
          'useHeadlessRamps: assetId is required to fetch a quote',
        );
      }
      if (!selectedProvider) {
        throw new Error(
          'useHeadlessRamps: selectedProvider is required to fetch a quote',
        );
      }
      if (!walletAddress) {
        throw new Error(
          'useHeadlessRamps: wallet address is required to fetch a quote',
        );
      }

      const response = await getQuotes({
        assetId,
        amount,
        walletAddress,
        redirectUrl: getRampCallbackBaseUrl(),
        paymentMethods: [paymentMethodId],
        providers: [selectedProvider.id],
        forceRefresh: true,
      });

      if (!response.success?.length) return null;

      const match = response.success.find(
        (q) =>
          q.provider === selectedProvider.id &&
          (q.quote?.paymentMethod === paymentMethodId ||
            !q.quote?.paymentMethod),
      );
      return match ?? response.success[0] ?? null;
    },
    [assetId, selectedProvider, walletAddress, getQuotes],
  );

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
    getQuote,
    openBuyModal,
    order,
    goToBuyOrder,
  };
}

export default useHeadlessRamps;
