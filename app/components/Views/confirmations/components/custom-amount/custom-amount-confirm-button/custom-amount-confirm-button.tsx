import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { MONEY_SEND_VERIFICATION_PROTOTYPE_ENABLED } from '../../../../../UI/Money/constants/moneySendPrototype';
import { useMoneySecurityMethods } from '../../../../../UI/Money/hooks/useMoneySecurityMethods';
import { useMoneySecurityToast } from '../../../../../UI/Money/hooks/useMoneySecurityToast';
import { completePrototypeMoneySend } from '../../../../../UI/Money/utils/completePrototypeMoneySend';

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
  const navigation = useNavigation<AppNavigationProp>();
  const transaction = useTransactionMetadataRequest();
  const { isTransactionVerificationEnabled } = useMoneySecurityMethods();
  const showSuccessToast = useMoneySecurityToast();
  const isPrototypeMoneySend =
    MONEY_SEND_VERIFICATION_PROTOTYPE_ENABLED &&
    hasTransactionType(transaction, [TransactionType.moneyAccountWithdraw]);

  const handleConfirm = useCallback(async () => {
    if (isPrototypeMoneySend) {
      onContinue?.();
      if (isTransactionVerificationEnabled) {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
          params: { action: { type: 'verify-transaction' } },
        });
      } else {
        completePrototypeMoneySend(navigation, showSuccessToast);
      }
      return;
    }

    setIsConfirmationSubmitting(true);
    onContinue?.();

    try {
      await onConfirm();
    } catch (error) {
      setIsConfirmationSubmitting(false);
      throw error;
    }
  }, [
    isPrototypeMoneySend,
    isTransactionVerificationEnabled,
    navigation,
    onConfirm,
    onContinue,
    setIsConfirmationSubmitting,
    showSuccessToast,
  ]);

  const disabled =
    isDisabled ||
    stage !== CustomAmountStage.ShowTotals ||
    hasBlockingAlerts ||
    isHeadlessBuyInProgress;

  const enabledButtonLabel = useButtonLabel(transaction);

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

function useButtonLabel(
  transaction: ReturnType<typeof useTransactionMetadataRequest>,
) {
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
