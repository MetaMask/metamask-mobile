import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import Engine from '../../../../../../core/Engine';
import { useConfirmNavigation } from '../../../../../Views/confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../../../../Views/confirmations/components/confirm/confirm-component';
import { usePredictNavigation } from '../../../hooks/usePredictNavigation';

interface UsePredictBuyActionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  depositAmount: number;
  setIsConfirming: (value: boolean) => void;
}

export const usePredictBuyActions = ({
  preview: livePreview,
  analyticsProperties,
  placeOrder,
  setIsConfirming,
}: UsePredictBuyActionsParams) => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const navigation = useNavigation();
  const { navigateToConfirmation } = useConfirmNavigation();
  const { onReject: onApprovalReject, onConfirm: onApprovalConfirm } =
    useApprovalRequest();
  const [isPreviewFromRouteUsed, setIsPreviewFromRouteUsed] = useState(false);
  const { resetSelectedPaymentToken } = usePredictPaymentToken();
  const { activeOrder } = usePredictActiveOrder();
  const currentState = useMemo(() => activeOrder?.state, [activeOrder?.state]);
  const { PredictController } = Engine.context;
  const { navigateToBuyPreview } = usePredictNavigation();

  const batchId = useMemo(() => activeOrder?.batchId, [activeOrder?.batchId]);

  const {
    market,
    outcome,
    outcomeToken,
    isConfirmationRoute,
    entryPoint,
    preview: previewFromRoute,
  } = route.params;

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    PredictController.onConfirmOrder({
      isDeposit: !!isConfirmationRoute,
    });
  }, [setIsConfirming, PredictController, isConfirmationRoute]);

  const handleBack = useCallback(() => {
    if (currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN) {
      onApprovalReject();
    }
    PredictController.onOrderCancelled();
  }, [PredictController, currentState, onApprovalReject]);

  const handleBackSwipe = useCallback(() => {
    PredictController.onOrderCancelled();
  }, [PredictController]);

  const handlePlaceOrder = useCallback(async () => {
    PredictController.onPlaceOrder();
    if (!livePreview && !previewFromRoute) {
      throw new Error('Preview is required');
    }

    const isFromPayWithAnyToken = batchId && !isPreviewFromRouteUsed;
    const previewToUse = isFromPayWithAnyToken ? previewFromRoute : livePreview;

    if (!previewToUse) {
      throw new Error('Preview is required');
    }

    if (isFromPayWithAnyToken) {
      resetSelectedPaymentToken();
      setIsPreviewFromRouteUsed(true);
    }

    const orderResult = await placeOrder({
      analyticsProperties,
      preview: previewToUse,
    });

    if (orderResult.status !== 'success') {
      PredictController.onOrderError();
      return;
    }

    PredictController.onOrderSuccess();
  }, [
    PredictController,
    livePreview,
    previewFromRoute,
    batchId,
    isPreviewFromRouteUsed,
    placeOrder,
    analyticsProperties,
    resetSelectedPaymentToken,
  ]);

  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  handlePlaceOrderRef.current = handlePlaceOrder;

  useEffect(() => {
    if (currentState === ActiveOrderState.REDIRECTING) {
      if (isConfirmationRoute) {
        PredictController.onConfirmationRedirected();
        return;
      }
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        headerShown: false,
        replace: true,
        routeParams: {
          market,
          outcome,
          outcomeToken,
          isConfirmationRoute: true,
          preview: livePreview,
        },
      });
    }
  }, [
    PredictController,
    currentState,
    isConfirmationRoute,
    livePreview,
    market,
    navigateToConfirmation,
    outcome,
    outcomeToken,
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
  }, [currentState, onApprovalReject, setIsConfirming]);

  useEffect(() => {
    if (
      currentState === ActiveOrderState.SUCCESS ||
      currentState === ActiveOrderState.CANCELLED
    ) {
      navigation.dispatch(StackActions.pop());
      PredictController.onPlaceOrderEnd();
    }
  }, [PredictController, currentState, navigation, setIsConfirming]);

  useEffect(() => {
    if (currentState === ActiveOrderState.DEPOSIT && isConfirmationRoute) {
      if (!livePreview) {
        throw new Error('Preview is required');
      }
      PredictController.onDepositOrder();
      navigateToBuyPreview(
        {
          market,
          outcome,
          outcomeToken,
          animationEnabled: false,
          entryPoint,
          isConfirming: true,
          preview: { ...livePreview },
        },
        { replace: true },
      );
      onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
      return;
    }
  }, [
    PredictController,
    currentState,
    entryPoint,
    isConfirmationRoute,
    livePreview,
    market,
    navigateToBuyPreview,
    onApprovalConfirm,
    outcome,
    outcomeToken,
  ]);

  useEffect(() => {
    if (currentState === ActiveOrderState.PLACE_ORDER) {
      handlePlaceOrderRef.current();
    }
  }, [currentState]);

  return {
    handleBack,
    handleBackSwipe,
    handleConfirm,
  };
};
