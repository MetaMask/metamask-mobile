import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useMemo, useState } from 'react';
import { usePredictNavigation } from '../../../hooks/usePredictNavigation';
import { useConfirmActions } from '../../../../../Views/confirmations/hooks/useConfirmActions';
import { usePredictPayWithAnyToken } from '../../../hooks/usePredictPayWithAnyToken';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import { strings } from '../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { PREDICT_BALANCE_TOKEN_KEY } from '../../../constants/transactions';
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
  preview: livePreview,
  analyticsProperties,
  placeOrder,
  setIsConfirming,
}: UsePredictBuyActionsParams) => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();
  const { triggerPayWithAnyToken } = usePredictPayWithAnyToken();
  const { updateActiveOrder, clearActiveOrder } = usePredictActiveOrder();
  const { navigateToBuyPreview } = usePredictNavigation();
  const [isPreviewFromRouteUsed, setIsPreviewFromRouteUsed] = useState(false);
  const { resetSelectedPaymentToken } = usePredictPaymentToken();
  const { activeOrder } = usePredictActiveOrder();

  const batchId = useMemo(() => activeOrder?.batchId, [activeOrder?.batchId]);

  const {
    market,
    outcome,
    outcomeToken,
    entryPoint,
    isConfirmation,
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

  const handleTokenSelected = useCallback(
    async ({ tokenKey }: { tokenKey: string | null }) => {
      updateActiveOrder({ error: null });
      if (isConfirmation) {
        if (tokenKey !== PREDICT_BALANCE_TOKEN_KEY) {
          return;
        }
        updateActiveOrder({
          state: ActiveOrderState.PREVIEW,
        });
        redirectToBuyPreview();
        onReject(undefined, true);
        return;
      }
      if (tokenKey !== PREDICT_BALANCE_TOKEN_KEY) {
        updateActiveOrder({
          state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
        });
        triggerPayWithAnyToken({
          market,
          outcome,
          outcomeToken,
          ...(livePreview ? { preview: { ...livePreview } } : {}),
        });
      }
    },
    [
      isConfirmation,
      market,
      onReject,
      outcome,
      outcomeToken,
      livePreview,
      redirectToBuyPreview,
      triggerPayWithAnyToken,
      updateActiveOrder,
    ],
  );

  const handleDepositFailed = useCallback(
    async (depositErrorMessage?: string) => {
      setIsConfirming(false);
      updateActiveOrder({
        state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
        error:
          depositErrorMessage ?? strings('predict.deposit.error_description'),
        batchId: null,
      });
      triggerPayWithAnyToken({
        market,
        outcome,
        outcomeToken,
      });
    },
    [
      setIsConfirming,
      updateActiveOrder,
      triggerPayWithAnyToken,
      market,
      outcome,
      outcomeToken,
    ],
  );

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    updateActiveOrder({ error: null });

    if (isConfirmation) {
      updateActiveOrder({
        state: ActiveOrderState.DEPOSITING,
      });
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

    updateActiveOrder({
      state: ActiveOrderState.PLACING_ORDER,
    });
    const orderResult = await placeOrder({
      analyticsProperties,
      preview: previewToUse,
    });
    if (
      orderResult.status === 'error' ||
      orderResult.status === 'order_not_filled'
    ) {
      setIsConfirming(false);
      updateActiveOrder({ state: ActiveOrderState.PREVIEW });
    }
  }, [
    setIsConfirming,
    updateActiveOrder,
    isConfirmation,
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
    clearActiveOrder();
    navigation.dispatch(StackActions.pop());
  }, [clearActiveOrder, navigation]);

  const handleBackSwipe = useCallback(() => {
    clearActiveOrder();
    if (isConfirmation) return;
    navigation.dispatch(StackActions.pop());
  }, [clearActiveOrder, isConfirmation, navigation]);

  const handlePlaceOrderSuccess = useCallback(() => {
    setIsConfirming(false);
    clearActiveOrder();
    navigation.dispatch(StackActions.pop());
  }, [setIsConfirming, clearActiveOrder, navigation]);

  const handlePlaceOrderError = useCallback(() => {
    setIsConfirming(false);
    updateActiveOrder({ state: ActiveOrderState.PREVIEW });
    resetSelectedPaymentToken();
  }, [setIsConfirming, updateActiveOrder, resetSelectedPaymentToken]);

  return {
    handleBack,
    handleBackSwipe,
    handleTokenSelected,
    handleConfirm,
    handleDepositFailed,
    handlePlaceOrderSuccess,
    handlePlaceOrderError,
  };
};
