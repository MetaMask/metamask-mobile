import React from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import { useMoneyAccountDepositNavbar } from '../../../../../UI/Money/hooks/useMoneyAccountDepositNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useMoneyAccountDepositNavbar();
  const { preferredPaymentToken } = useParams<ConfirmationParams>({});

  return (
    <CustomAmountInfo
      currency={MONEY_ACCOUNT_CURRENCY}
      hasMax
      supportAccountSelection
      preferredToken={preferredPaymentToken}
    />
  );
}
