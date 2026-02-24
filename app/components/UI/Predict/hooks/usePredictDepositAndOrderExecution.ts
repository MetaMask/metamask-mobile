import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext, useRef, useState } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { OrderPreview } from '../providers/types';
import { usePredictOrderDepositTracking } from './usePredictOrderDepositTracking';
import { usePredictTrading } from './usePredictTrading';

interface UsePredictDepositAndOrderExecutionParams {
  marketId?: string;
  outcome?: string;
  preview?: OrderPreview | null;
}

interface UsePredictDepositAndOrderExecutionResult {
  isConfirming: boolean;
  confirmError?: string;
  handleConfirm: () => Promise<void>;
}

export function usePredictDepositAndOrderExecution({
  marketId,
  outcome,
  preview,
}: UsePredictDepositAndOrderExecutionParams): UsePredictDepositAndOrderExecutionResult {
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const { trackDeposit } = usePredictOrderDepositTracking();
  const { placeOrder } = usePredictTrading();
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();
  const activeTransactionMeta = useTransactionMetadataRequest();
  const { isPredictBalanceSelected } = usePredictPaymentToken();

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
          outcome,
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
  }, [marketId, navigation, outcome, placeOrder, showOrderPlacedToast]);

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

    if (!activeTransactionMeta) {
      setIsConfirming(false);
      return;
    }

    try {
      trackDeposit({
        transactionMeta: activeTransactionMeta,
        onConfirmed: () => {
          void handleOrderSuccess();
        },
        onFailed: () => {
          setConfirmError(strings('predict.deposit.error_description'));
          setIsConfirming(false);
        },
      });

      void onApprovalConfirm({
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
    activeTransactionMeta,
    handleOrderSuccess,
    isConfirming,
    isPredictBalanceSelected,
    onApprovalConfirm,
    trackDeposit,
  ]);

  return {
    isConfirming,
    confirmError,
    handleConfirm,
  };
}
