import { StackActions, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';

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
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  const [previewFromDeposit, setPreviewFromDeposit] =
    useState<OrderPreview | null>(null);

  const onApprovalRejectRef = useRef(onApprovalReject);
  onApprovalRejectRef.current = onApprovalReject;

  useEffect(() => {
    PredictController.initiPayWithAnyToken();
    return () => {
      onApprovalRejectRef.current();
    };
  }, [PredictController]);

  const handlePlaceOrder = useCallback(async () => {
    if (!preview) {
      PredictController.onOrderError({
        errorMessage: String(PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE),
      });
      return;
    }

    const previewToUse = previewFromDeposit
      ? { ...previewFromDeposit }
      : preview;
    setPreviewFromDeposit(null);

    const orderResult = await placeOrder({
      analyticsProperties,
      preview: previewToUse,
    });

    if (orderResult.status !== 'success') {
      setIsConfirming(false);
      PredictController.onOrderError();
      return;
    }

    PredictController.onOrderSuccess();
  }, [
    preview,
    previewFromDeposit,
    placeOrder,
    analyticsProperties,
    PredictController,
    setIsConfirming,
  ]);

  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  handlePlaceOrderRef.current = handlePlaceOrder;

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    if (isPredictBalanceSelected) {
      PredictController.onConfirmOrder();
      return;
    }
    if (!preview) {
      PredictController.onOrderError({
        errorMessage: String(PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE),
      });
      return;
    }
    PredictController.onDepositOrder();
    setPreviewFromDeposit(preview);
    onApprovalConfirm({
      deleteAfterResult: true,
      waitForResult: true,
      handleErrors: false,
    });
  }, [
    setIsConfirming,
    isPredictBalanceSelected,
    preview,
    onApprovalConfirm,
    PredictController,
  ]);

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
    if (currentState === ActiveOrderState.PLACE_ORDER) {
      handlePlaceOrderRef.current();
    }
  }, [currentState]);

  useEffect(() => {
    if (currentState === ActiveOrderState.SUCCESS) {
      PredictController.onPlaceOrderEnd();
      navigation.dispatch(StackActions.pop());
    }
  }, [PredictController, currentState, navigation, setIsConfirming]);

  return {
    handleConfirm,
  };
};
