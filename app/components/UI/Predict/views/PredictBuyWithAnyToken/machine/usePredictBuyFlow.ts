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
import { usePredictOrderPreview } from '../../../hooks/usePredictOrderPreview';
import { usePredictOrderRetry } from '../../../hooks/usePredictOrderRetry';
import { usePredictMeasurement } from '../../../hooks/usePredictMeasurement';
import {
  selectPredictFakOrdersEnabledFlag,
  selectPredictWithAnyTokenEnabledFlag,
} from '../../../selectors/featureFlags';
import { predictQueries } from '../../../queries';
import { PredictTradeStatus } from '../../../constants/eventNames';
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

import {
  createBuyOrderOrchestrator,
  type BuyOrderOrchestrator,
} from './orchestrator';
import type { BuyOrderPorts } from './ports';
import { BuyOrderState, type BuyOrderMachineState } from './types';

export interface UsePredictBuyFlowParams {
  market: { id: string } & Record<string, unknown>;
  outcome: { id: string } & Record<string, unknown>;
  outcomeToken: { id: string; title?: string; price?: number } & Record<
    string,
    unknown
  >;
  entryPoint?: PredictEntryPoint;
}

interface ControllerMessengerLike {
  subscribe: (event: string, handler: (payload: unknown) => void) => void;
  unsubscribe: (event: string, handler: (payload: unknown) => void) => void;
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

  // ---- Refs for stable port closures ----

  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const toastRefRef = useRef(toastRef);
  toastRefRef.current = toastRef;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;
  const onApprovalConfirmRef = useRef(onApprovalConfirm);
  onApprovalConfirmRef.current = onApprovalConfirm;
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;
  const controllerPlaceOrderRef = useRef(controllerPlaceOrder);
  controllerPlaceOrderRef.current = controllerPlaceOrder;
  const initPayWithAnyTokenRef = useRef(initPayWithAnyToken);
  initPayWithAnyTokenRef.current = initPayWithAnyToken;
  const confirmedPreviewRef = useRef<OrderPreview | null>(null);
  const confirmedAnalyticsRef = useRef(analyticsProperties);
  confirmedAnalyticsRef.current = analyticsProperties;

  const hasInitializedPayWithAnyTokenRef = useRef(false);

  // ---- Machine state (synced from orchestrator via onStateChange) ----

  const [machineState, setMachineState] = useState<BuyOrderMachineState | null>(
    () => ({ state: BuyOrderState.PREVIEW }),
  );

  // ---- Orchestrator (created once, ports read from refs) ----

  const orchestratorRef = useRef<BuyOrderOrchestrator | null>(null);
  if (!orchestratorRef.current) {
    const ports: BuyOrderPorts = {
      navigation: {
        pop: () => navigationRef.current.dispatch(StackActions.pop()),
        onTransitionEnd: (cb) =>
          navigationRef.current.addListener('transitionEnd', (e) => {
            if (!e.data.closing) cb();
          }),
        onBeforeRemove: (cb) =>
          navigationRef.current.addListener('beforeRemove', cb),
      },
      transactionMonitor: {
        onDepositStatusChange(callback) {
          const messenger =
            Engine.controllerMessenger as unknown as ControllerMessengerLike;

          const handler = (payload: unknown) => {
            const event = payload as {
              type: string;
              status: string;
              transactionId?: string;
            };

            if (event.type !== 'depositAndOrder') return;

            const transactionId = event.transactionId ?? '';

            if (event.status === 'confirmed') {
              callback({ status: 'confirmed', transactionId });
            } else if (event.status === 'failed') {
              callback({
                status: 'failed',
                transactionId,
                error: 'Deposit failed',
              });
            } else if (event.status === 'rejected') {
              callback({ status: 'rejected', transactionId });
            }
          };

          messenger.subscribe(
            'PredictController:transactionStatusChanged',
            handler,
          );
          return () =>
            messenger.unsubscribe(
              'PredictController:transactionStatusChanged',
              handler,
            );
        },
      },
      approval: {
        getApprovalTransactionId: () => approvalRequest?.id,
        confirmApproval: () =>
          onApprovalConfirmRef.current({
            deleteAfterResult: true,
            waitForResult: true,
            handleErrors: false,
          }),
        rejectApproval: () => onRejectRef.current(undefined, true),
      },
      orderExecution: {
        placeOrder: async () => {
          const preview = confirmedPreviewRef.current;
          if (!preview) {
            return { success: false as const, error: 'Preview not available' };
          }
          const result = await controllerPlaceOrderRef.current({
            analyticsProperties: confirmedAnalyticsRef.current,
            preview,
          });
          const response = result.response as unknown as
            | { spentAmount: string; receivedAmount: string }
            | undefined;
          return {
            success: result.success,
            response: response ?? { spentAmount: '0', receivedAmount: '0' },
          } as typeof result & {
            response: { spentAmount: string; receivedAmount: string };
          };
        },
        initPayWithAnyToken: () => initPayWithAnyTokenRef.current(),
      },
      toast: {
        showOrderPlaced: () =>
          toastRefRef.current?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Check,
            labelOptions: [
              {
                label: strings('predict.order.prediction_placed'),
                isBold: true,
              },
            ],
            hasNoTimeout: false,
          }),
        showDepositFailed: (_error) => undefined,
      },
      analytics: {
        trackOrderEvent: (status) =>
          Engine.context.PredictController.trackPredictOrderEvent({
            status:
              status === 'submitted'
                ? PredictTradeStatus.SUBMITTED
                : status === 'succeeded'
                  ? PredictTradeStatus.SUCCEEDED
                  : status === 'failed'
                    ? PredictTradeStatus.FAILED
                    : PredictTradeStatus.INITIATED,
            analyticsProperties: confirmedAnalyticsRef.current,
            sharePrice: confirmedAnalyticsRef.current?.sharePrice,
          }),
      },
      queryCache: {
        invalidate: () => {
          const qc = queryClientRef.current;
          qc.invalidateQueries({
            queryKey: predictQueries.balance.keys.all(),
          });
          qc.invalidateQueries({
            queryKey: predictQueries.positions.keys.all(),
          });
          qc.invalidateQueries({
            queryKey: predictQueries.activity.keys.all(),
          });
          qc.invalidateQueries({
            queryKey: predictQueries.unrealizedPnL.keys.all(),
          });
        },
      },
      resetPaymentToken: () =>
        Engine.context.PredictController.setSelectedPaymentToken(null),
      logError: (_error) => undefined,
    };

    orchestratorRef.current = createBuyOrderOrchestrator(ports, {
      onStateChange: setMachineState,
    });
  }

  const orchestrator = orchestratorRef.current;

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

  // ---- handleConfirm ----

  const handleConfirm = useCallback(async () => {
    confirmedPreviewRef.current = previewRef.current ?? null;

    if (!previewRef.current) {
      return { status: 'error' as const, error: 'Preview not available' };
    }

    const isAnyTokenPath =
      orchestrator.getState()?.state === BuyOrderState.PAY_WITH_ANY_TOKEN;

    if (isAnyTokenPath) {
      const transactionId = approvalRequest?.id;
      orchestrator.send({
        type: 'CONFIRM_ANY_TOKEN_PATH',
        transactionId: transactionId ?? '',
      });
      return { status: 'deposit_in_progress' as const };
    }

    orchestrator.send({ type: 'CONFIRM_BALANCE_PATH' });
    return { status: 'submitted' as const };
  }, [approvalRequest?.id, orchestrator]);

  // ---- Lifecycle ----

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
    const cleanup = orchestrator.start();
    return cleanup;
  }, [payWithAnyTokenEnabled, orchestrator]);

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
