import React, { useCallback } from 'react';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from '../../info/custom-amount-info/custom-amount-info.styles';
import { strings } from '../../../../../../../locales/i18n';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { ConfirmationFooterSelectorIDs } from '../../../ConfirmationView.testIds';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { usePredictWithdrawGasFeeToken } from '../../../hooks/gas/usePredictWithdrawGasFeeToken';

export function CustomAmountConfirmButton({
  isDisabled,
  onContinue,
  stage,
}: Readonly<{
  isDisabled: boolean;
  onContinue?: () => void;
  stage: CustomAmountStage;
}>) {
  const { styles } = useStyles(styleSheet, {});
  const { hasBlockingAlerts } = useAlerts();
  const { isHeadlessBuyInProgress, setIsConfirmationSubmitting } =
    useConfirmationContext();
  const { onConfirm } = useConfirmActions();
  const isPayLoading = useIsTransactionPayLoading();
  // Keep confirm disabled, without an alert, until the Predict withdraw gas
  // fee token check settles, so the insufficient balance alert doesn't flash.
  const { isPending: isPredictWithdrawGasFeeTokenPending } =
    usePredictWithdrawGasFeeToken();

  const handleConfirm = useCallback(async () => {
    setIsConfirmationSubmitting(true);
    onContinue?.();

    try {
      await onConfirm();
    } catch (error) {
      setIsConfirmationSubmitting(false);
      throw error;
    }
  }, [onConfirm, onContinue, setIsConfirmationSubmitting]);

  const disabled =
    isDisabled ||
    stage !== CustomAmountStage.ShowTotals ||
    hasBlockingAlerts ||
    isPayLoading ||
    isPredictWithdrawGasFeeTokenPending ||
    isHeadlessBuyInProgress;

  const buttonLabel = useButtonLabel();

  return (
    <Button
      style={[disabled && styles.disabledButton]}
      size={ButtonSize.Lg}
      variant={ButtonVariant.Primary}
      isFullWidth
      isDisabled={disabled}
      isLoading={isHeadlessBuyInProgress}
      loadingText={strings('confirm.preparing_order')}
      onPress={handleConfirm}
      testID={ConfirmationFooterSelectorIDs.CONFIRM_BUTTON}
    >
      {buttonLabel}
    </Button>
  );
}

function useButtonLabel() {
  const transaction = useTransactionMetadataRequest();
  const { payWithOption } = useParams<ConfirmationParams>({});

  if (hasTransactionType(transaction, [TransactionType.moneyAccountWithdraw])) {
    return strings('confirm.deposit_edit_amount_money_account_send');
  }

  if (
    hasTransactionType(transaction, [
      TransactionType.predictWithdraw,
      TransactionType.perpsWithdraw,
    ])
  ) {
    return strings('confirm.deposit_edit_amount_predict_withdraw');
  }

  if (
    payWithOption === PayWithOption.MoneyAccount &&
    hasTransactionType(transaction, [
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
    ])
  ) {
    return strings('confirm.deposit_edit_amount_money_account_send');
  }

  return strings('confirm.deposit_edit_amount_done');
}
