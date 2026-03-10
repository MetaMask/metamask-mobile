import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useState } from 'react';
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
}

export const usePredictBuyActions = ({
  preview: livePreview,
  analyticsProperties,
  placeOrder,
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

  const {
    market,
    outcome,
    outcomeToken,
    entryPoint,
    transactionId,
    isConfirmation,
    preview: previewFromRoute,
  } = route.params;

  const redirectToBuyPreview = useCallback(
    (params?: { includeTransaction: boolean }) => {
      navigateToBuyPreview(
        {
          market,
          outcome,
          outcomeToken,
          ...(params?.includeTransaction && transactionId
            ? { transactionId }
            : {}),
          ...(livePreview ? { preview: { ...livePreview } } : {}),
          animationEnabled: false,
          entryPoint,
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
      transactionId,
    ],
  );

  const handleTokenSelected = useCallback(
    async ({ tokenKey }: { tokenKey: string | null }) => {
      if (isConfirmation) {
        if (tokenKey !== PREDICT_BALANCE_TOKEN_KEY) {
          return;
        }
        updateActiveOrder({
          state: ActiveOrderState.PREVIEW,
          transactionId: null,
        });
        redirectToBuyPreview();
        onReject(undefined, true);
        return;
      }
      if (tokenKey !== PREDICT_BALANCE_TOKEN_KEY) {
        updateActiveOrder({
          state: ActiveOrderState.REDIRECTING,
        });
        const response = await triggerPayWithAnyToken({
          market,
          outcome,
          outcomeToken,
          ...(livePreview ? { preview: { ...livePreview } } : {}),
        });

        updateActiveOrder({
          state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
          transactionId: response?.transactionId,
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
      updateActiveOrder({
        state: ActiveOrderState.REDIRECTING,
        error:
          depositErrorMessage ?? strings('predict.deposit.error_description'),
      });
      const response = await triggerPayWithAnyToken({
        market,
        outcome,
        outcomeToken,
      });
      updateActiveOrder({
        state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
        transactionId: response?.transactionId,
      });
    },
    [updateActiveOrder, triggerPayWithAnyToken, market, outcome, outcomeToken],
  );

  const handleConfirm = useCallback(async () => {
    updateActiveOrder({ error: null });

    if (isConfirmation) {
      updateActiveOrder({
        state: ActiveOrderState.DEPOSITING,
        transactionId,
      });
      redirectToBuyPreview({
        includeTransaction: true,
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

    const isFromPayWithAnyToken = transactionId && !isPreviewFromRouteUsed;
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
    await placeOrder({
      analyticsProperties,
      preview: previewToUse,
    });
  }, [
    updateActiveOrder,
    isConfirmation,
    livePreview,
    previewFromRoute,
    transactionId,
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
    clearActiveOrder();
    navigation.dispatch(StackActions.pop());
  }, [clearActiveOrder, navigation]);

  const handlePlaceOrderError = useCallback(() => {
    resetSelectedPaymentToken();
  }, [resetSelectedPaymentToken]);

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
