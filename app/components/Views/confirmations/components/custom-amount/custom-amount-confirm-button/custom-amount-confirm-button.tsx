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

export function CustomAmountConfirmButton({
  alertTitle,
  isDisabled,
  onContinue,
  stage,
}: Readonly<{
  alertTitle: string | undefined;
  isDisabled: boolean;
  onContinue?: () => void;
  stage: CustomAmountStage;
}>) {
  const { styles } = useStyles(styleSheet, {});
  const { hasBlockingAlerts } = useAlerts();
  const { isHeadlessBuyInProgress, setIsConfirmationSubmitting } =
    useConfirmationContext();
  const { onConfirm } = useConfirmActions();

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
    isHeadlessBuyInProgress;

  const enabledButtonLabel = useButtonLabel();

  const buttonLabel =
    stage === CustomAmountStage.Loading
      ? enabledButtonLabel
      : (alertTitle ?? enabledButtonLabel);

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
