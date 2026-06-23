import React, { useCallback, useMemo } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import MoneyIcon from '../../../../../../images/money.png';
import { RootState } from '../../../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import { selectMetaMaskPayFlags } from '../../../../../../selectors/featureFlagController/confirmations';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  getTransactionType,
  isTransactionPayWithdraw,
} from '../../../utils/transaction';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export const PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID =
  'pay-with-section-money-account';
export const PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID = 'pay-with-money-account-row';

const styles = StyleSheet.create({
  moneyIcon: { width: 24, height: 24 },
});

export function usePayWithMoneyAccountSection(): PayWithSectionConfig | null {
  const navigation = useNavigation();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { enableMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );
  const { totalFiatFormatted } = useMoneyAccountBalance();

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyAccountSelected =
    paymentOverride === PaymentOverride.MoneyAccount;

  const transactionType = getTransactionType(transactionMeta);
  const isEnabled = Boolean(
    transactionType && enableMoneyAccountTransactions[transactionType],
  );

  const isWithdraw = isTransactionPayWithdraw(transactionMeta);

  const handlePress = useCallback(() => {
    if (transactionId) {
      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          (config as Record<string, unknown>).paymentOverride =
            PaymentOverride.MoneyAccount;
          if (moneyAccount?.address && !isWithdraw) {
            config.refundTo = moneyAccount.address as Hex;
          }
        },
      );
    }
    navigation.goBack();
  }, [isWithdraw, moneyAccount?.address, navigation, transactionId]);

  return useMemo(() => {
    if (!isEnabled || !moneyAccount) {
      return null;
    }

    const subtitle = totalFiatFormatted
      ? strings('confirm.pay_with_bottom_sheet.available_balance', {
          balance: totalFiatFormatted,
        })
      : undefined;

    const row: PayWithRowConfig = {
      id: 'money-account-musd',
      icon: React.createElement(Image, {
        source: MoneyIcon,
        style: styles.moneyIcon,
      }),
      title: strings('confirm.pay_with_bottom_sheet.money_account'),
      subtitle,
      isSelected: isMoneyAccountSelected,
      trailingElement: isMoneyAccountSelected ? 'checkmark' : 'none',
      onPress: handlePress,
      testID: PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID,
    };

    return {
      id: 'money-account',
      title: '',
      testID: PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID,
      rows: [row],
    };
  }, [
    isEnabled,
    handlePress,
    isMoneyAccountSelected,
    moneyAccount,
    totalFiatFormatted,
  ]);
}
