import { StackActions, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Engine from '../../../../../../core/Engine';
import { strings } from '../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import { useConfirmActions } from '../../../../../Views/confirmations/hooks/useConfirmActions';
import { usePredictTrading } from '../../../hooks/usePredictTrading';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { usePredictOrderPreview } from '../../../hooks/usePredictOrderPreview';
import { usePredictOrderRetry } from '../../../hooks/usePredictOrderRetry';
import { usePredictMeasurement } from '../../../hooks/usePredictMeasurement';
import {
  selectPredictFakOrdersEnabledFlag,
  selectPredictWithAnyTokenEnabledFlag,
} from '../../../selectors/featureFlags';
import { predictQueries } from '../../../queries';
import { PredictTradeStatus } from '../../../constants/eventNames';
import { PREDICT_ERROR_CODES } from '../../../constants/errors';
import { Side, type OrderPreview, type PlaceOrderParams } from '../../../types';
import type {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../../types/navigation';
import { parseAnalyticsProperties } from '../../../utils/analytics';
import { formatPrice } from '../../../utils/format';
import { TraceName } from '../../../../../../util/trace';
import type { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';

import { usePredictBuyAvailableBalance } from '../hooks/usePredictBuyAvailableBalance';
import { usePredictBuyConditions } from '../hooks/usePredictBuyConditions';
import { usePredictBuyInfo } from '../hooks/usePredictBuyInfo';
import { usePredictBuyInputState } from '../hooks/usePredictBuyInputState';
import { usePredictBuyError } from '../hooks/usePredictBuyError';

import { transition } from './transition';
import {
  BuyOrderState,
  type BuyOrderEffect,
  type BuyOrderEvent,
  type BuyOrderMachineState,
} from './types';

export interface UsePredictBuyFlowParams {
  market: { id: string } & Record<string, unknown>;
  outcome: { id: string } & Record<string, unknown>;
  outcomeToken: { id: string; title?: string; price?: number } & Record<
    string,
    unknown
  >;
  entryPoint?: PredictEntryPoint;
}

export function usePredictBuyFlow({
  market,
  outcome,
  outcomeToken,
  entryPoint,
}: UsePredictBuyFlowParams) {
  const navigation =
    useNavigation<StackNavigationProp<PredictNavigationParamList>>();
  const { toastRef } = useContext(ToastContext);
  const queryClient = useQueryClient();

  const { onConfirm: onApprovalConfirm, approvalRequest } =
    useApprovalRequest();
  const { onReject } = useConfirmActions();
  const { placeOrder: controllerPlaceOrder, initPayWithAnyToken } =
    usePredictTrading();
  const { clearActiveOrderTransactionId } = usePredictActiveOrder();

  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );
  const fakOrdersEnabled = useSelector(selectPredictFakOrdersEnabledFlag);

  const analyticsProperties = useMemo(
    () =>
      parseAnalyticsProperties(
        market as Parameters<typeof parseAnalyticsProperties>[0],
        outcomeToken as Parameters<typeof parseAnalyticsProperties>[1],
        entryPoint,
      ),
    [market, outcomeToken, entryPoint],
  );

  // ---- Machine state ----

  const [machineState, setMachineState] = useState<BuyOrderMachineState | null>(
    () => ({ state: BuyOrderState.PREVIEW }),
  );
  const machineStateRef = useRef(machineState);
  machineStateRef.current = machineState;

  const confirmedPreviewRef = useRef<OrderPreview | null>(null);
  const confirmedAnalyticsRef = useRef(analyticsProperties);
  confirmedAnalyticsRef.current = analyticsProperties;

  const hasInitializedPayWithAnyTokenRef = useRef(false);
  const didInitiateOrderRef = useRef(false);

  // ---- Leaf hooks ----

  const inputState = usePredictBuyInputState();
  const {
    currentValue,
    isInputFocused,
    isUserInputChange,
    setIsUserInputChange,
    setIsConfirming,
  } = inputState;

  const isPlacingOrder =
    machineState?.state === BuyOrderState.DEPOSITING ||
    machineState?.state === BuyOrderState.PLACING_ORDER;

  const isConfirming = isPlacingOrder;

  const { availableBalance, isBalanceLoading } =
    usePredictBuyAvailableBalance();

  const availableBalanceDisplay = useMemo(
    () =>
      formatPrice(availableBalance, { minimumDecimals: 2, maximumDecimals: 2 }),
    [availableBalance],
  );

  const {
    preview,
    error: previewError,
    isCalculating: isPreviewCalculating,
  } = usePredictOrderPreview({
    marketId: market.id,
    outcomeId: outcome.id,
    outcomeTokenId: outcomeToken.id,
    side: Side.BUY,
    size: currentValue,
    autoRefreshTimeout: 1000,
  });

  const previewRef = useRef(preview);
  previewRef.current = preview;

  const buyInfo = usePredictBuyInfo({
    currentValue,
    preview,
    previewError,
    isConfirming,
    isPlacingOrder,
  });

  const buyConditions = usePredictBuyConditions({
    currentValue,
    preview,
    isPreviewCalculating,
    isUserInputChange,
    isConfirming,
    totalPayForPredictBalance: buyInfo.totalPayForPredictBalance,
    isInputFocused,
  });

  const buyError = usePredictBuyError({
    preview,
    previewError,
    isPlacingOrder,
    isBelowMinimum: buyConditions.isBelowMinimum,
    isInsufficientBalance: buyConditions.isInsufficientBalance,
    maxBetAmount: buyConditions.maxBetAmount,
    isConfirming,
    isPayFeesLoading: buyConditions.isPayFeesLoading,
  });

  // ---- Effect execution ----

  const showOrderPlacedToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      labelOptions: [
        { label: strings('predict.order.prediction_placed'), isBold: true },
      ],
      hasNoTimeout: false,
    });
  }, [toastRef]);

  const invalidateOrderQueries = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: predictQueries.balance.keys.all(),
    });
    queryClient.invalidateQueries({
      queryKey: predictQueries.positions.keys.all(),
    });
    queryClient.invalidateQueries({
      queryKey: predictQueries.activity.keys.all(),
    });
    queryClient.invalidateQueries({
      queryKey: predictQueries.unrealizedPnL.keys.all(),
    });
  }, [queryClient]);

  const executeEffect = useCallback(
    (effect: BuyOrderEffect) => {
      try {
        switch (effect.type) {
          case 'TRACK_ANALYTICS':
            Engine.context.PredictController.trackPredictOrderEvent({
              status:
                effect.status === 'submitted'
                  ? PredictTradeStatus.SUBMITTED
                  : effect.status === 'succeeded'
                    ? PredictTradeStatus.SUCCEEDED
                    : effect.status === 'failed'
                      ? PredictTradeStatus.FAILED
                      : PredictTradeStatus.INITIATED,
              analyticsProperties: confirmedAnalyticsRef.current,
              sharePrice: confirmedAnalyticsRef.current?.sharePrice,
            });
            break;
          case 'CONFIRM_APPROVAL':
            onApprovalConfirm({
              deleteAfterResult: true,
              waitForResult: true,
              handleErrors: false,
            });
            break;
          case 'REJECT_APPROVAL':
            onReject(undefined, true);
            clearActiveOrderTransactionId();
            break;
          case 'NAVIGATE_POP':
            navigation.dispatch(StackActions.pop());
            break;
          case 'SHOW_TOAST':
            if (effect.variant === 'order_placed') {
              showOrderPlacedToast();
            }
            break;
          case 'INVALIDATE_QUERY_CACHE':
            invalidateOrderQueries();
            break;
          case 'INIT_PAY_WITH_ANY_TOKEN':
            initPayWithAnyToken();
            break;
          case 'RESET_PAYMENT_TOKEN':
            Engine.context.PredictController.setSelectedPaymentToken(null);
            break;
          case 'CLEAR_OPTIMISTIC_POSITION':
            break;
          case 'PUBLISH_ORDER_CONFIRMED':
            Engine.context.PredictController.onPlaceOrderSuccess();
            break;
          case 'STORE_PENDING_ORDER':
          case 'CLEAR_PENDING_ORDER':
          case 'PUBLISH_ORDER_FAILED':
          case 'PUBLISH_DEPOSIT_FAILED':
          case 'LOG_ERROR':
          case 'PLACE_ORDER':
            break;
        }
      } catch (_e) {
        // Effect isolation: one failing effect must not block others
      }
    },
    [
      onApprovalConfirm,
      onReject,
      clearActiveOrderTransactionId,
      navigation,
      showOrderPlacedToast,
      invalidateOrderQueries,
      initPayWithAnyToken,
    ],
  );

  // ---- Machine send ----

  const send = useCallback(
    (event: BuyOrderEvent) => {
      const result = transition(machineStateRef.current, event);
      machineStateRef.current = result.nextState;
      setMachineState(result.nextState);

      for (const effect of result.effects) {
        executeEffect(effect);
      }
    },
    [executeEffect],
  );

  // ---- Async order execution (handled outside the effect loop) ----

  const executePlaceOrder = useCallback(
    async (transactionId?: string): Promise<PlaceOrderOutcome> => {
      const orderPreview = confirmedPreviewRef.current ?? previewRef.current;
      if (!orderPreview) {
        return {
          status: 'error',
          error: PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE,
        };
      }

      try {
        const result = await controllerPlaceOrder({
          analyticsProperties: confirmedAnalyticsRef.current,
          preview: orderPreview,
          transactionId,
        });

        const response = result.response as unknown as
          | { spentAmount?: string; receivedAmount?: string }
          | undefined;

        send({
          type: 'ORDER_SUCCEEDED',
          spentAmount: response?.spentAmount ?? '0',
          receivedAmount: response?.receivedAmount ?? '0',
        });

        return { status: 'success', result };
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED;

        send({ type: 'ORDER_FAILED', error: errorMsg });
        return { status: 'error', error: errorMsg };
      }
    },
    [controllerPlaceOrder, send],
  );

  // ---- handleConfirm (the primary user action) ----

  const handleConfirm = useCallback(async () => {
    didInitiateOrderRef.current = true;
    confirmedPreviewRef.current = previewRef.current ?? null;

    if (!previewRef.current) {
      return {
        status: 'error' as const,
        error: PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE,
      };
    }

    const isAnyTokenPath =
      machineStateRef.current?.state === BuyOrderState.PAY_WITH_ANY_TOKEN;

    if (isAnyTokenPath) {
      const transactionId = approvalRequest?.id;
      send({
        type: 'CONFIRM_ANY_TOKEN_PATH',
        transactionId: transactionId ?? '',
      });

      return executePlaceOrder(transactionId);
    }

    send({ type: 'CONFIRM_BALANCE_PATH' });
    return executePlaceOrder();
  }, [approvalRequest?.id, send, executePlaceOrder]);

  // ---- Subscriptions & lifecycle ----

  useEffect(() => {
    Engine.context.PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties,
      sharePrice: analyticsProperties?.sharePrice,
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) return;

    return navigation.addListener('transitionEnd', (e) => {
      if (!e.data.closing && !hasInitializedPayWithAnyTokenRef.current) {
        hasInitializedPayWithAnyTokenRef.current = true;
        initPayWithAnyToken();
      }
    });
  }, [navigation, initPayWithAnyToken, payWithAnyTokenEnabled]);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) return;

    return navigation.addListener('beforeRemove', () => {
      send({ type: 'CLEANUP' });
    });
  }, [navigation, payWithAnyTokenEnabled, send]);

  useEffect(() => {
    if (isPlacingOrder) {
      setIsConfirming(true);
    } else {
      setIsConfirming(false);
    }
  }, [isPlacingOrder, setIsConfirming]);

  useEffect(() => {
    if (!isPreviewCalculating) {
      setIsUserInputChange(false);
    }
  }, [isPreviewCalculating, setIsUserInputChange]);

  // ---- Order retry ----

  const {
    retrySheetRef,
    retrySheetVariant,
    isRetrying,
    handleRetryWithBestPrice,
  } = usePredictOrderRetry({
    preview: preview ?? null,
    placeOrder: handleConfirm as (
      params: PlaceOrderParams,
    ) => Promise<PlaceOrderOutcome>,
    analyticsProperties,
    isOrderNotFilled: buyError.isOrderNotFilled,
    resetOrderNotFilled: buyError.resetOrderNotFilled,
  });

  // ---- Performance measurement ----

  usePredictMeasurement({
    traceName: TraceName.PredictBuyPreviewView,
    conditions: [!isBalanceLoading, availableBalance !== undefined, !!market],
    debugContext: {
      marketId: market?.id,
      hasBalance: availableBalance !== undefined,
      isBalanceLoading,
    },
  });

  // ---- Return view model ----

  return {
    machineState,
    isPlacingOrder,

    input: inputState,

    preview,
    previewError,
    isPreviewCalculating,

    availableBalance,
    availableBalanceDisplay,
    isBalanceLoading,

    ...buyInfo,
    ...buyConditions,
    ...buyError,

    handleConfirm,

    retrySheetRef,
    retrySheetVariant,
    isRetrying,
    handleRetryWithBestPrice,

    payWithAnyTokenEnabled,
    fakOrdersEnabled,
    analyticsProperties,
  };
}
