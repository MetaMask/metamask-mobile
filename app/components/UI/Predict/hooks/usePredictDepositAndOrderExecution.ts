import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import { useCallback, useContext, useRef, useState } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { OrderPreview } from '../providers/types';
import { usePredictTrading } from './usePredictTrading';
import Routes from '../../../../constants/navigation/Routes';
import {
  PredictBuyPreviewParams,
  PredictNavigationParamList,
} from '../types/navigation';

interface UsePredictDepositAndOrderExecutionParams {
  market?: PredictBuyPreviewParams['market'];
  outcome?: PredictBuyPreviewParams['outcome'];
  outcomeToken?: PredictBuyPreviewParams['outcomeToken'];
  orderAmountUsd: number;
  depositTransactionId?: string;
  preview?: OrderPreview | null;
}

interface UsePredictDepositAndOrderExecutionResult {
  isConfirming: boolean;
  confirmError?: string;
  handleConfirm: () => Promise<void>;
}

export function usePredictDepositAndOrderExecution({
  market,
  outcome,
  outcomeToken,
  orderAmountUsd,
  depositTransactionId,
  preview,
}: UsePredictDepositAndOrderExecutionParams): UsePredictDepositAndOrderExecutionResult {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { toastRef } = useContext(ToastContext);
  const { placeOrder } = usePredictTrading();
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const marketId = market?.id;
  const outcomeId = outcome?.id;

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();

  const previewRef = useRef(preview);
  previewRef.current = preview;

  const showOrderPlacedToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      labelOptions: [
        { label: strings('predict.order.prediction_placed'), isBold: true },
      ],
      hasNoTimeout: false,
    });
  }, [toastRef]);

  const redirectToBuyPreviewForAutoOrder = useCallback(() => {
    if (!market || !outcome || !outcomeToken || orderAmountUsd <= 0) {
      setConfirmError(strings('predict.deposit.error_description'));
      setIsConfirming(false);
      return;
    }

    setIsConfirming(false);
    navigation.dispatch(
      StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, {
        market,
        outcome,
        outcomeToken,
        amount: orderAmountUsd,
        transactionId: depositTransactionId,
        animationEnabled: false,
      }),
    );
  }, [
    depositTransactionId,
    market,
    navigation,
    orderAmountUsd,
    outcome,
    outcomeToken,
  ]);

  const handleOrderSuccess = useCallback(async () => {
    const latestPreview = previewRef.current;
    if (!latestPreview) {
      setIsConfirming(false);
      return;
    }

    try {
      await placeOrder({
        preview: latestPreview,
        analyticsProperties: {
          marketId,
          outcome: outcomeId,
        },
      });
      showOrderPlacedToast();
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : strings('predict.deposit.error_description'),
      );
    } finally {
      setIsConfirming(false);
      navigation.goBack();
    }
  }, [marketId, navigation, outcomeId, placeOrder, showOrderPlacedToast]);

  const handleConfirm = useCallback(async () => {
    if (isConfirming) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(undefined);

    if (isPredictBalanceSelected) {
      await handleOrderSuccess();
      return;
    }

    try {
      redirectToBuyPreviewForAutoOrder();
      await onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : strings('predict.deposit.error_description'),
      );
      setIsConfirming(false);
    }
  }, [
    handleOrderSuccess,
    isConfirming,
    isPredictBalanceSelected,
    onApprovalConfirm,
    redirectToBuyPreviewForAutoOrder,
  ]);

  return {
    isConfirming,
    confirmError,
    handleConfirm,
  };
}
