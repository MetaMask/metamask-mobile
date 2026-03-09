import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { PredictNavigationParamList } from '../types/navigation';
import { useCallback, useState } from 'react';
import { usePredictNavigation } from './usePredictNavigation';
import { useConfirmActions } from '../../../Views/confirmations/hooks/useConfirmActions';
import { usePredictPayWithAnyToken } from './usePredictPayWithAnyToken';
import { PlaceOrderOutcome } from './usePredictPlaceOrder';
import { ActiveOrderState, OrderPreview, PlaceOrderParams } from '../types';
import { strings } from '../../../../../locales/i18n';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictActiveOrder } from './usePredictActiveOrder';

interface UsePredictBuyActionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  depositAmount: number;
}

export const usePredictBuyActions = ({
  currentValue,
  preview,
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
  const [
    isPreviewFromPayWithAnyTokenUsed,
    setIsPreviewFromPayWithAnyTokenUsed,
  ] = useState(false);

  const {
    market,
    outcome,
    outcomeToken,
    entryPoint,
    transactionId,
    isConfirmation,
    isInputFocused,
    preview: previewFromPayWithAnyToken,
  } = route.params;

  const redirectToBuyPreview = useCallback(
    (params?: { includeTransaction: boolean }) => {
      navigateToBuyPreview(
        {
          market,
          outcome,
          outcomeToken,
          ...(currentValue > 0 ? { amount: currentValue } : {}),
          ...(params?.includeTransaction && transactionId
            ? { transactionId }
            : {}),
          ...(params?.includeTransaction && preview
            ? { preview: { ...preview } }
            : {}),
          animationEnabled: false,
          entryPoint,
        },
        { replace: true },
      );
    },
    [
      currentValue,
      entryPoint,
      market,
      navigateToBuyPreview,
      outcome,
      outcomeToken,
      preview,
      transactionId,
    ],
  );

  const handleTokenSelected = useCallback(
    async ({ tokenKey }: { tokenKey: string | null }) => {
      if (isConfirmation) {
        if (tokenKey !== 'predict-balance') {
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
      if (tokenKey !== 'predict-balance') {
        updateActiveOrder({
          state: ActiveOrderState.REDIRECTING,
        });
        const response = await triggerPayWithAnyToken({
          market,
          outcome,
          outcomeToken,
          isInputFocused,
          ...(currentValue > 0 ? { amount: currentValue } : {}),
        });

        updateActiveOrder({
          state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
          transactionId: response?.transactionId,
        });
      }
    },
    [
      currentValue,
      isConfirmation,
      isInputFocused,
      market,
      onReject,
      outcome,
      outcomeToken,
      redirectToBuyPreview,
      triggerPayWithAnyToken,
      updateActiveOrder,
    ],
  );

  const handleDepositFailed = useCallback(
    async (depositErrorMessage?: string) => {
      updateActiveOrder({
        state: ActiveOrderState.REDIRECTING,
      });
      const response = await triggerPayWithAnyToken({
        market,
        outcome,
        outcomeToken,
        isInputFocused,
        ...(currentValue > 0 ? { amountUsd: currentValue } : {}),
        transactionError:
          depositErrorMessage ?? strings('predict.deposit.error_description'),
      });
      updateActiveOrder({
        state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
        transactionId: response?.transactionId,
      });
    },
    [
      updateActiveOrder,
      triggerPayWithAnyToken,
      market,
      outcome,
      outcomeToken,
      isInputFocused,
      currentValue,
    ],
  );

  const handleConfirm = useCallback(async () => {
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

    if (!preview && !previewFromPayWithAnyToken) {
      throw new Error('Preview is required');
    }

    if (transactionId && !isPreviewFromPayWithAnyTokenUsed) {
      if (!previewFromPayWithAnyToken) {
        throw new Error('Preview is required');
      }
      setIsPreviewFromPayWithAnyTokenUsed(true);
      updateActiveOrder({
        state: ActiveOrderState.PLACING_ORDER,
      });
      await placeOrder({
        analyticsProperties,
        preview: previewFromPayWithAnyToken,
      });
      return;
    }

    if (!preview) {
      throw new Error('Preview is required');
    }

    updateActiveOrder({
      state: ActiveOrderState.PLACING_ORDER,
    });
    await placeOrder({
      analyticsProperties,
      preview,
    });
  }, [
    analyticsProperties,
    isConfirmation,
    isPreviewFromPayWithAnyTokenUsed,
    onApprovalConfirm,
    placeOrder,
    preview,
    previewFromPayWithAnyToken,
    redirectToBuyPreview,
    transactionId,
    updateActiveOrder,
  ]);

  const handleBack = useCallback(() => {
    clearActiveOrder();
    if (!isConfirmation) {
      navigation.dispatch(StackActions.pop());
    }
  }, [clearActiveOrder, navigation, isConfirmation]);

  const handlePlaceOrderSuccess = useCallback(() => {
    clearActiveOrder();
    navigation.dispatch(StackActions.pop());
  }, [clearActiveOrder, navigation]);

  return {
    handleBack,
    handleTokenSelected,
    handleConfirm,
    handleDepositFailed,
    handlePlaceOrderSuccess,
  };
};
