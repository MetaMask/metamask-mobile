import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountWithdrawInfo() {
  useNavbar(strings('confirm.title.money_account_withdraw'));

  const { canSelectWithdrawToken } = useTransactionPayWithdraw();

  return (
    <CustomAmountInfo
      currency={MONEY_ACCOUNT_CURRENCY}
      disablePay={!canSelectWithdrawToken}
    />
  );
}
