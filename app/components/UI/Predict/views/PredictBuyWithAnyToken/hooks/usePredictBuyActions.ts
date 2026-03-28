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
  const { activeOrder } = usePredictActiveOrder();
  const { placeOrder, initiPayWithAnyToken } = usePredictTrading();
  const currentState = useMemo(() => activeOrder?.state, [activeOrder?.state]);
  const { PredictController } = Engine.context;
  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );

  const hasInitializedPayWithAnyTokenRef = useRef(false);

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
        initiPayWithAnyToken();
      }
    });

    return unsubscribe;
  }, [navigation, initiPayWithAnyToken, payWithAnyTokenEnabled]);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) {
      return;
    }

    return navigation.addListener('beforeRemove', () => {
      onReject(undefined, true);
      PredictController.onPlaceOrderEnd();
    });
  }, [navigation, payWithAnyTokenEnabled, PredictController, onReject]);

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
    setIsConfirming(true);

    // Capture transactionId BEFORE approving (approval clears the request)
    const transactionId = approvalRequest?.id;

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
      PredictController.onPlaceOrderEnd();
      navigation.dispatch(StackActions.pop());
    }
  }, [PredictController, currentState, navigation, setIsConfirming]);

  return {
    handleConfirm,
    placeOrder: handlePlaceOrder,
  };
};
