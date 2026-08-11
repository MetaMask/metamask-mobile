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
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';

export function CustomAmountConfirmButton({
  disableConfirm,
  isAmountUpdating,
  onContinue,
}: Readonly<{
  disableConfirm?: boolean;
  isAmountUpdating?: boolean;
  onContinue?: () => void;
}>) {
  const { hasBlockingAlerts } = useAlerts();
  const { isHeadlessBuyInProgress, setIsConfirmationSubmitting } =
    useConfirmationContext();
  const isLoading = useIsTransactionPayLoading();
  const { onConfirm } = useConfirmActions();
  const disabled =
    hasBlockingAlerts ||
    isLoading ||
    Boolean(disableConfirm) ||
    isAmountUpdating ||
    isHeadlessBuyInProgress;
  const buttonLabel = useButtonLabel();

  const handleConfirm = useCallback(async () => {
    setIsConfirmationSubmitting(true);
    // Continue / Add Funds CTA funnel event; no-op for non-money flows.
    onContinue?.();
    try {
      await onConfirm();
    } catch (error) {
      setIsConfirmationSubmitting(false);
      throw error;
    }
  }, [onConfirm, onContinue, setIsConfirmationSubmitting]);

  return (
    <Button
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

  if (hasTransactionType(transaction, [TransactionType.musdConversion])) {
    return strings('earn.musd_conversion.confirm');
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
