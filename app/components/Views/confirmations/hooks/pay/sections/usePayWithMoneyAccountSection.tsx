import React, { useCallback, useMemo } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import { RootState } from '../../../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import { selectMetaMaskPayFlags } from '../../../../../../selectors/featureFlagController/confirmations';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import { MUSD_TOKEN } from '../../../../../UI/Earn/constants/musd';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export const PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID =
  'pay-with-section-money-account';
export const PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID = 'pay-with-money-account-row';

const SUPPORTED_TRANSACTION_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
  TransactionType.predictWithdraw,
] as const;

export function usePayWithMoneyAccountSection(): PayWithSectionConfig | null {
  const navigation = useNavigation();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { enablePerpsMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );
  const { totalFiatFormatted } = useMoneyAccountBalance();

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyAccountSelected =
    paymentOverride === PaymentOverride.MoneyAccount;

  const isSupported = hasTransactionType(
    transactionMeta,
    SUPPORTED_TRANSACTION_TYPES as unknown as TransactionType[],
  );

  const isWithdrawType = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
  ]);

  const handlePress = useCallback(() => {
    if (transactionId) {
      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          (config as Record<string, unknown>).paymentOverride =
            PaymentOverride.MoneyAccount;
          if (moneyAccount?.address && !isWithdrawType) {
            config.refundTo = moneyAccount.address as Hex;
          }
        },
      );
    }
    navigation.goBack();
  }, [isWithdrawType, moneyAccount?.address, navigation, transactionId]);

  return useMemo(() => {
    if (!enablePerpsMoneyAccountTransactions || !isSupported || !moneyAccount) {
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
        source: { uri: MUSD_TOKEN.image },
        style: { width: 24, height: 24 },
      }),
      title: MUSD_TOKEN.symbol,
      subtitle,
      isSelected: isMoneyAccountSelected,
      isLastUsed: false,
      trailingElement: isMoneyAccountSelected ? 'checkmark' : 'none',
      onPress: handlePress,
      testID: PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID,
    };

    return {
      id: 'money-account',
      title: strings('confirm.pay_with_bottom_sheet.money_account'),
      testID: PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID,
      rows: [row],
    };
  }, [
    enablePerpsMoneyAccountTransactions,
    handlePress,
    isMoneyAccountSelected,
    isSupported,
    moneyAccount,
    totalFiatFormatted,
  ]);
}
