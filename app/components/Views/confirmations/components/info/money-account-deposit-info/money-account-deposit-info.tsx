import React from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import { useMoneyAccountDepositNavbar } from '../../../../../UI/Money/hooks/useMoneyAccountDepositNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import type { SetPayTokenRequest } from '../../../hooks/pay/useAutomaticTransactionPayToken';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useMoneyAccountDepositNavbar();
  const { preferredPaymentToken } = useParams<{
    preferredPaymentToken?: SetPayTokenRequest;
  }>();

  return (
    <CustomAmountInfo
      currency={MONEY_ACCOUNT_CURRENCY}
      hasMax
      preferredToken={preferredPaymentToken}
      supportAccountSelection
    />
  );
}
