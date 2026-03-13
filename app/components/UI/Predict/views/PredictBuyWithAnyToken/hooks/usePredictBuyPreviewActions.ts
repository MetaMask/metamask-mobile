import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePredictNavigation } from '../../../hooks/usePredictNavigation';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import { strings } from '../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import Engine from '../../../../../../core/Engine';
import { useConfirmNavigation } from '../../../../../Views/confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../../../../Views/confirmations/components/confirm/confirm-component';

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
  const { onConfirm: onApprovalConfirm, onReject: onApprovalReject } =
    useApprovalRequest();
  const { navigateToBuyPreview } = usePredictNavigation();
  const [isPreviewFromRouteUsed, setIsPreviewFromRouteUsed] = useState(false);
  const { resetSelectedPaymentToken } = usePredictPaymentToken();
  const { activeOrder } = usePredictActiveOrder();
  const currentState = useMemo(() => activeOrder?.state, [activeOrder?.state]);
  const { PredictController } = Engine.context;

  const batchId = useMemo(() => activeOrder?.batchId, [activeOrder?.batchId]);

  const {
    market,
    outcome,
    outcomeToken,
    entryPoint,
    isConfirmationRoute,
    preview: previewFromRoute,
  } = route.params;

  const redirectToBuyPreview = useCallback(
    (params?: { includeTransaction?: boolean; isConfirming?: boolean }) => {
      navigateToBuyPreview(
        {
          market,
          outcome,
          outcomeToken,
          ...(livePreview ? { preview: { ...livePreview } } : {}),
          animationEnabled: false,
          entryPoint,
          ...(params?.isConfirming ? { isConfirming: true } : {}),
        },
        { replace: true },
      );
    },
    [
      entryPoint,
      market,
      navigateToBuyPreview,
      outcome,
      outcomeToken,
      livePreview,
    ],
  );

  const handleDepositFailed = useCallback(
    async (depositErrorMessage?: string) => {
      setIsConfirming(false);
      PredictController.onDepositFailed(
        depositErrorMessage ?? strings('predict.deposit.error_description'),
      );
    },
    [PredictController, setIsConfirming],
  );

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    PredictController.onConfirmOrder(!!isConfirmationRoute);

    if (isConfirmationRoute) {
      redirectToBuyPreview({
        isConfirming: true,
      });
      await onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
      return;
    }

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
      setIsConfirming(false);
      PredictController.onOrderResultError();
    }
  }, [
    setIsConfirming,
    PredictController,
    isConfirmationRoute,
    livePreview,
    previewFromRoute,
    batchId,
    isPreviewFromRouteUsed,
    placeOrder,
    analyticsProperties,
    redirectToBuyPreview,
    onApprovalConfirm,
    resetSelectedPaymentToken,
  ]);

  const handleBack = useCallback(() => {
    if (currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN) {
      onApprovalReject();
    }
    PredictController.onOrderCancelled();
  }, [PredictController, currentState, onApprovalReject]);

  const handleBackSwipe = useCallback(() => {
    PredictController.onOrderCancelled();
  }, [PredictController]);

  const handlePlaceOrderSuccess = useCallback(() => {
    PredictController.onOrderSuccess();
  }, [PredictController]);

  const handlePlaceOrderError = useCallback(() => {
    PredictController.onOrderError();
  }, [PredictController]);

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
  }, [currentState, onApprovalReject, setIsConfirming]);

  useEffect(() => {
    if (
      activeOrder?.state === ActiveOrderState.SUCCESS ||
      activeOrder?.state === ActiveOrderState.CANCELLED
    ) {
      navigation.dispatch(StackActions.pop());
      PredictController.onPlaceOrderEnd();
    }
  }, [PredictController, activeOrder, navigation, setIsConfirming]);

  return {
    handleBack,
    handleBackSwipe,
    handleConfirm,
    handleDepositFailed,
    handlePlaceOrderSuccess,
    handlePlaceOrderError,
  };
};
