import { StackActions, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import Engine from '../../../../../../core/Engine';
import { PREDICT_ERROR_CODES } from '../../../constants/errors';

interface UsePredictBuyActionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  depositAmount: number;
  setIsConfirming: (value: boolean) => void;
}

export const usePredictBuyActions = ({
  preview,
  analyticsProperties,
  placeOrder,
  setIsConfirming,
}: UsePredictBuyActionsParams) => {
  const navigation = useNavigation();
  const { onReject: onApprovalReject, onConfirm: onApprovalConfirm } =
    useApprovalRequest();
  const { activeOrder } = usePredictActiveOrder();
  const currentState = useMemo(() => activeOrder?.state, [activeOrder?.state]);
  const { PredictController } = Engine.context;

  const onApprovalRejectRef = useRef(onApprovalReject);
  onApprovalRejectRef.current = onApprovalReject;

  useEffect(() => {
    PredictController.payWithAnyTokenConfirmation().catch(() => {
      // Transaction preparation failed — fall back to on-demand creation
    });

    return () => {
      onApprovalRejectRef.current();
    };
  }, [PredictController]);

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    PredictController.onConfirmOrder({
      isDeposit: currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN,
    });
  }, [setIsConfirming, PredictController, currentState]);

  const handleBack = useCallback(() => {
    PredictController.onOrderCancelled();
    navigation.dispatch(StackActions.pop());
  }, [PredictController, navigation]);

  const handleBackSwipe = useCallback(() => {
    PredictController.onOrderCancelled();
  }, [PredictController]);

  const handlePlaceOrder = useCallback(async () => {
    if (!preview) {
      PredictController.onOrderError({
        errorMessage: String(PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE),
      });
      return;
    }

    const previewToUse =
      PredictController.getAndClearDepositPreview() ?? preview;

    PredictController.onPlaceOrder();

    const orderResult = await placeOrder({
      analyticsProperties,
      preview: previewToUse,
    });

    if (orderResult.status !== 'success') {
      PredictController.onOrderError();
      return;
    }

    PredictController.onOrderSuccess();
  }, [preview, PredictController, placeOrder, analyticsProperties]);

  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  handlePlaceOrderRef.current = handlePlaceOrder;

  useEffect(() => {
    if (
      currentState === ActiveOrderState.DEPOSIT ||
      currentState === ActiveOrderState.DEPOSITING ||
      currentState === ActiveOrderState.PLACE_ORDER ||
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

  useEffect(() => {
    if (currentState === ActiveOrderState.DEPOSIT) {
      if (!preview) {
        PredictController.onOrderError({
          errorMessage: String(PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE),
        });
        return;
      }
      PredictController.onDepositOrder(preview);
      onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    }
  }, [PredictController, currentState, onApprovalConfirm, preview]);

  useEffect(() => {
    if (currentState === ActiveOrderState.PLACE_ORDER) {
      handlePlaceOrderRef.current().catch(() => {
        PredictController.onOrderError();
      });
    }
  }, [currentState, PredictController]);

  return {
    handleBack,
    handleBackSwipe,
    handleConfirm,
  };
};
