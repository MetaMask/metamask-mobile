import type { CaipChainId } from '@metamask/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  type PaymentMethod,
  type Quote,
  type RampsOrder,
  RampsOrderStatus as Status,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useRampsController } from './useRampsController';
import useRampAccountAddress from './useRampAccountAddress';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import { createRampsOrderDetailsNavDetails } from '../Views/OrderDetails/OrderDetails';
import { getRampCallbackBaseUrl } from '../utils/getRampCallbackBaseUrl';
import {
  isTrackedHeadlessBuyOrder,
  registerHeadlessBuySession,
  resetHeadlessBuySession,
  unregisterHeadlessBuySession,
} from '../utils/headlessBuySessionRegistry';

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

export function useHeadlessRamps({
  assetId,
  onOrderSucceeded,
  onOrderFailed,
}: UseHeadlessRampsParams = {}): UseHeadlessRampsResult {
  const navigation = useNavigation();
  const [order, setOrder] = useState<RampsOrder | null>(null);
  const sessionIdRef = useRef<string>(registerHeadlessBuySession());

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

  useEffect(
    () => () => {
      unregisterHeadlessBuySession(sessionIdRef.current);
    },
    [],
  );

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

      if (!response.success?.length) {
        return null;
      }

      const match = response.success.find(
        (quote) =>
          quote.provider === selectedProvider.id &&
          (quote.quote?.paymentMethod === paymentMethodId ||
            !quote.quote?.paymentMethod),
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

      setOrder(null);
      resetHeadlessBuySession(sessionIdRef.current);

      navigation.navigate(
        ...createBuildQuoteNavDetails({
          assetId,
          amount: modalParams.amount,
          headlessBuy: {
            paymentMethodId: modalParams.paymentMethodId,
            sessionId: sessionIdRef.current,
          },
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
      if (
        !isTrackedHeadlessBuyOrder(
          sessionIdRef.current,
          updatedOrder.providerOrderId,
        )
      ) {
        return;
      }

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
