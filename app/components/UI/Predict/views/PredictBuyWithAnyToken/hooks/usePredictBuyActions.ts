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
import { PredictTradeStatus } from '../../../constants/eventNames';
import { usePredictTrading } from '../../../hooks/usePredictTrading';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import { PREDICT_ERROR_CODES } from '../../../constants/errors';
import { useConfirmActions } from '../../../../../Views/confirmations/hooks/useConfirmActions';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';

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
}

export const usePredictBuyActions = ({
  preview,
  analyticsProperties,
  setIsConfirming,
  isSheetMode = false,
  onClose,
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
  onRejectRef.current = onReject;
  clearActiveOrderTransactionIdRef.current = clearActiveOrderTransactionId;

  useEffect(() => {
    const controller = Engine.context.PredictController;

    controller.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties,
      sharePrice: analyticsProperties?.sharePrice,
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) {
      return;
    }

    const doInit = async () => {
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
      onRejectRef.current(undefined, true);
      clearActiveOrderTransactionIdRef.current();
    });
  }, [navigation, payWithAnyTokenEnabled, isSheetMode]);

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

    let transactionId =
      currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN
        ? approvalRequest?.id
        : undefined;

    // Fallback: if approval was lost (rejected/consumed) but we have the
    // stored batchId, re-initialize to create a fresh approval.
    if (
      currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN &&
      !transactionId
    ) {
      const result = await initPayWithAnyToken();
      if (result?.success && result.response?.batchId) {
        batchIdRef.current = result.response.batchId;
        transactionId = result.response.batchId;
      }
    }

    if (currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN) {
      if (approvalRequest?.id) {
        onApprovalConfirm({
          deleteAfterResult: true,
          waitForResult: true,
          handleErrors: false,
        });
      } else if (transactionId) {
        // Approval was re-created via initPayWithAnyToken; accept it directly
        // since onApprovalConfirm still holds the stale (undefined) closure.
        Engine.acceptPendingApproval(
          transactionId,
          {},
          {
            deleteAfterResult: true,
            waitForResult: true,
            handleErrors: false,
          },
        );
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
      transactionId,
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
