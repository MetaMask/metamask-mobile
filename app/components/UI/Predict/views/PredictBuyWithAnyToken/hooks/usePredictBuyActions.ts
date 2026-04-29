import { StackActions, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import { TransactionStatus } from '@metamask/transaction-controller';
import { providerErrors } from '@metamask/rpc-errors';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import Engine from '../../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectPredictWithAnyTokenEnabledFlag } from '../../../selectors/featureFlags';
import {
  PredictDismissalMethod,
  PredictTradeStatus,
} from '../../../constants/eventNames';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { usePredictTrading } from '../../../hooks/usePredictTrading';
import {
  predictBuyPreviewDismissedViaBackRef,
  predictBuyPreviewSessionRef,
} from '../../PredictBuyPreview/PredictBuyPreview';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import { PREDICT_ERROR_CODES } from '../../../constants/errors';
import { useConfirmActions } from '../../../../../Views/confirmations/hooks/useConfirmActions';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import Logger from '../../../../../../util/Logger';

/**
 * Rejects all unapproved transactions to prevent stale approvals from
 * interfering with the new deposit-and-order transaction batch.
 * Mirrors the cleanup logic in useConfirmNavigation.
 */
function rejectPendingTransactions() {
  const { ApprovalController, TransactionController } = Engine.context;
  const unapprovedTxs = TransactionController.state.transactions.filter(
    (tx) => tx.status === TransactionStatus.unapproved,
  );
  for (const tx of unapprovedTxs) {
    try {
      ApprovalController.rejectRequest(
        tx.id,
        providerErrors.userRejectedRequest(),
      );
    } catch {
      // Approval may already be resolved
    }
  }
}
interface UsePredictBuyActionsParams {
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  setIsConfirming: (value: boolean) => void;
  isSheetMode?: boolean;
  onClose?: () => void;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const usePredictBuyActions = ({
  preview,
  analyticsProperties,
  setIsConfirming,
  isSheetMode = false,
  onClose,
  transactionActiveAbTests,
}: UsePredictBuyActionsParams) => {
  const navigation =
    useNavigation<StackNavigationProp<PredictNavigationParamList>>();
  const { onConfirm: onApprovalConfirm, approvalRequest } =
    useApprovalRequest();
  const { onReject } = useConfirmActions();
  const { activeOrder, clearActiveOrderTransactionId } =
    usePredictActiveOrder();
  const { placeOrder, initPayWithAnyToken } = usePredictTrading();
  const { resetSelectedPaymentToken } = usePredictPaymentToken();
  const currentState = useMemo(() => activeOrder?.state, [activeOrder?.state]);
  const { PredictController } = Engine.context;
  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );

  const hasInitializedPayWithAnyTokenRef = useRef(false);
  const didInitiateOrderRef = useRef(false);
  const batchIdRef = useRef<string | undefined>(undefined);
  const onRejectRef = useRef(onReject);
  const clearActiveOrderTransactionIdRef = useRef(
    clearActiveOrderTransactionId,
  );
  const mountTimestampRef = useRef(Date.now());
  onRejectRef.current = onReject;
  clearActiveOrderTransactionIdRef.current = clearActiveOrderTransactionId;

  useEffect(() => {
    const controller = Engine.context.PredictController;

    // Initialise shared session ref so PredictPreviewSheetContext can read
    // accurate values for swipe/hardware-back dismiss tracking.
    predictBuyPreviewSessionRef.mountTimestamp = mountTimestampRef.current;
    predictBuyPreviewSessionRef.hadEnteredAmount = false;
    predictBuyPreviewDismissedViaBackRef.current = false;

    controller.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties,
      sharePrice: analyticsProperties?.sharePrice,
      activeAbTests: transactionActiveAbTests,
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) {
      return;
    }

    const doInit = async () => {
      batchIdRef.current = undefined;
      rejectPendingTransactions();
      resetSelectedPaymentToken();
      const result = await initPayWithAnyToken();
      if (result?.success && result.response?.batchId) {
        batchIdRef.current = result.response.batchId;
      }
    };

    if (isSheetMode) {
      if (!hasInitializedPayWithAnyTokenRef.current) {
        hasInitializedPayWithAnyTokenRef.current = true;
        doInit();
      }
      return;
    }

    const unsubscribe = navigation.addListener('transitionEnd', (e) => {
      if (!e.data.closing && !hasInitializedPayWithAnyTokenRef.current) {
        hasInitializedPayWithAnyTokenRef.current = true;
        doInit();
      }
    });

    return unsubscribe;
  }, [
    navigation,
    initPayWithAnyToken,
    payWithAnyTokenEnabled,
    PredictController,
    resetSelectedPaymentToken,
    isSheetMode,
  ]);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) {
      return;
    }

    if (isSheetMode) {
      return () => {
        onRejectRef.current(undefined, true);
        clearActiveOrderTransactionIdRef.current();
      };
    }

    return navigation.addListener('beforeRemove', () => {
      // Fire dismiss event for stack-mode back / hardware-back / swipe-back.
      // Sheet-mode dismissals are handled by PredictPreviewSheetContext.onBuyDismiss.
      Engine.context.PredictController.trackBetslipDismissed({
        analyticsProperties,
        dismissalMethod: PredictDismissalMethod.BACK_BUTTON,
        hadEnteredAmount: predictBuyPreviewSessionRef.hadEnteredAmount,
        timeOnScreenMs: Date.now() - mountTimestampRef.current,
        activeAbTests: transactionActiveAbTests,
      });
      onRejectRef.current(undefined, true);
      clearActiveOrderTransactionIdRef.current();
    });
  }, [
    navigation,
    payWithAnyTokenEnabled,
    isSheetMode,
    analyticsProperties,
    transactionActiveAbTests,
  ]);

  const handlePlaceOrder = useCallback(
    async (orderParams: PlaceOrderParams): Promise<PlaceOrderOutcome> => {
      try {
        const result = await placeOrder(orderParams);
        return { status: 'success', result };
      } catch (error) {
        return {
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
        };
      }
    },
    [placeOrder],
  );

  const handleConfirm = useCallback(async () => {
    didInitiateOrderRef.current = true;
    setIsConfirming(true);

    if (currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN) {
      if (approvalRequest?.id) {
        onApprovalConfirm({
          deleteAfterResult: true,
          waitForResult: true,
          handleErrors: false,
        })?.catch((err: unknown) => {
          Logger.log(
            'usePredictBuyActions: onApprovalConfirm rejected',
            err instanceof Error ? err.message : String(err),
          );
        });
      } else {
        Logger.log(
          'usePredictBuyActions: PAY_WITH_ANY_TOKEN approval missing — attempting re-init',
        );
        batchIdRef.current = undefined;
        rejectPendingTransactions();
        const result = await initPayWithAnyToken();
        if (result?.success && result.response?.batchId) {
          batchIdRef.current = result.response.batchId;
        }
        setIsConfirming(false);
        return {
          status: 'error',
          error: PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
        };
      }
    }
    if (!preview) {
      return {
        status: 'error',
        error: PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE,
      };
    }

    return handlePlaceOrder({
      analyticsProperties,
      preview,
      transactionId:
        currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN
          ? approvalRequest?.id
          : undefined,
    });
  }, [
    setIsConfirming,
    approvalRequest,
    currentState,
    handlePlaceOrder,
    analyticsProperties,
    preview,
    onApprovalConfirm,
    initPayWithAnyToken,
  ]);

  useEffect(() => {
    if (
      currentState === ActiveOrderState.DEPOSITING ||
      currentState === ActiveOrderState.PLACING_ORDER
    ) {
      setIsConfirming(true);
    }

    if (
      currentState === ActiveOrderState.PREVIEW ||
      currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN
    ) {
      setIsConfirming(false);
    }
  }, [currentState, setIsConfirming]);

  useEffect(() => {
    if (currentState === ActiveOrderState.SUCCESS) {
      PredictController.onPlaceOrderSuccess();
      if (didInitiateOrderRef.current) {
        if (isSheetMode && onClose) {
          onClose();
        } else {
          navigation.dispatch(StackActions.pop());
        }
      }
    }
  }, [PredictController, currentState, navigation, isSheetMode, onClose]);

  useEffect(() => {
    if (currentState === ActiveOrderState.DEPOSITING) {
      if (didInitiateOrderRef.current) {
        didInitiateOrderRef.current = false;
        if (isSheetMode && onClose) {
          onClose();
        } else {
          navigation.dispatch(StackActions.pop());
        }
      }
    }
  }, [currentState, navigation, isSheetMode, onClose]);

  return {
    handleConfirm,
    placeOrder: handlePlaceOrder,
  };
};
