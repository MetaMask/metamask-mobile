import React from 'react';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useNavbar(strings('confirm.title.money_account_deposit'));

  return <CustomAmountInfo currency={MONEY_ACCOUNT_CURRENCY} />;
}
