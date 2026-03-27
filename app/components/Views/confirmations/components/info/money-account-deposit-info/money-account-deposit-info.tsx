import React from 'react';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import { MONEY_ACCOUNT_CURRENCY } from '../../../constants/money-account';

export function MoneyAccountDepositInfo() {
  useNavbar(strings('confirm.title.money_account_deposit'));

  return <CustomAmountInfo currency={MONEY_ACCOUNT_CURRENCY} />;
}
