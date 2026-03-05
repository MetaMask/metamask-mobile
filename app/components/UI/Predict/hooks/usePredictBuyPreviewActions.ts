import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { PredictNavigationParamList } from '../types/navigation';
import { useCallback, useState } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { useConfirmActions } from '../../../Views/confirmations/hooks/useConfirmActions';
import { usePredictPayWithAnyToken } from './usePredictPayWithAnyToken';
import { PlaceOrderOutcome } from './usePredictPlaceOrder';
import { OrderPreview, PlaceOrderParams } from '../types';
import { strings } from '../../../../../locales/i18n';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';

interface UsePredictBuyActionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  setIsPayWithAnyTokenLoading: (isLoading: boolean) => void;
  depositAmount: number;
}

export const usePredictBuyActions = ({
  currentValue,
  preview,
  analyticsProperties,
  placeOrder,
  setIsPayWithAnyTokenLoading,
}: UsePredictBuyActionsParams) => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();
  const { triggerPayWithAnyToken } = usePredictPayWithAnyToken();
  const [
    isPreviewFromPayWithAnyTokenUsed,
    setIsPreviewFromPayWithAnyTokenUsed,
  ] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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
    ({
      includeTransactionId,
      includePreview,
    }: {
      includeTransactionId: boolean;
      includePreview: boolean;
    }) => {
      navigation.dispatch(
        StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, {
          market,
          outcome,
          outcomeToken,
          ...(currentValue > 0 ? { amount: currentValue } : {}),
          ...(includeTransactionId && transactionId ? { transactionId } : {}),
          ...(includePreview && preview ? { preview: { ...preview } } : {}),
          animationEnabled: false,
          entryPoint,
        }),
      );
    },
    [
      currentValue,
      entryPoint,
      market,
      navigation,
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
        redirectToBuyPreview({
          includeTransactionId: false,
          includePreview: false,
        });
        onReject(undefined, true);
        return;
      }
      if (tokenKey !== 'predict-balance') {
        setIsPayWithAnyTokenLoading(true);
        await triggerPayWithAnyToken({
          market,
          outcome,
          outcomeToken,
          isInputFocused,
          ...(currentValue > 0 ? { amount: currentValue } : {}),
        });
        setIsPayWithAnyTokenLoading(false);
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
      setIsPayWithAnyTokenLoading,
      triggerPayWithAnyToken,
    ],
  );

  const handleDepositFailed = useCallback(
    async (depositErrorMessage?: string) => {
      setIsPayWithAnyTokenLoading(true);
      await triggerPayWithAnyToken({
        market,
        outcome,
        outcomeToken,
        isInputFocused,
        ...(currentValue > 0 ? { amountUsd: currentValue } : {}),
        transactionError:
          depositErrorMessage ?? strings('predict.deposit.error_description'),
      });
      setIsPayWithAnyTokenLoading(false);
    },
    [
      setIsPayWithAnyTokenLoading,
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
      setIsConfirming(true);
      setIsPayWithAnyTokenLoading(true);
      redirectToBuyPreview({
        includeTransactionId: true,
        includePreview: true,
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
      await placeOrder({
        analyticsProperties,
        preview: previewFromPayWithAnyToken,
      });
      return;
    }

    if (!preview) {
      throw new Error('Preview is required');
    }
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
    setIsPayWithAnyTokenLoading,
    transactionId,
  ]);

  return {
    handleTokenSelected,
    handleConfirm,
    handleDepositFailed,
    isConfirming,
  };
};
