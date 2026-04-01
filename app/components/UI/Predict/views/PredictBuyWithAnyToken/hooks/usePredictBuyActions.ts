import { StackActions, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
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

interface UsePredictBuyActionsParams {
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  setIsConfirming: (value: boolean) => void;
}

export const usePredictBuyActions = ({
  preview,
  analyticsProperties,
  setIsConfirming,
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

    const unsubscribe = navigation.addListener('transitionEnd', (e) => {
      if (!e.data.closing && !hasInitializedPayWithAnyTokenRef.current) {
        hasInitializedPayWithAnyTokenRef.current = true;
        resetSelectedPaymentToken();
        initPayWithAnyToken();
      }
    });

    return unsubscribe;
  }, [
    navigation,
    initPayWithAnyToken,
    payWithAnyTokenEnabled,
    PredictController,
    resetSelectedPaymentToken,
  ]);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) {
      return;
    }

    return navigation.addListener('beforeRemove', () => {
      onReject(undefined, true);
      clearActiveOrderTransactionId();
    });
  }, [
    navigation,
    payWithAnyTokenEnabled,
    onReject,
    clearActiveOrderTransactionId,
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

    const transactionId =
      currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN
        ? approvalRequest?.id
        : undefined;

    if (currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN) {
      onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
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
        navigation.dispatch(StackActions.pop());
      }
    }
  }, [PredictController, currentState, navigation]);

  useEffect(() => {
    if (currentState === ActiveOrderState.DEPOSITING) {
      if (didInitiateOrderRef.current) {
        navigation.dispatch(StackActions.pop());
      }
    }
  }, [currentState, navigation]);

  return {
    handleConfirm,
    placeOrder: handlePlaceOrder,
  };
};
