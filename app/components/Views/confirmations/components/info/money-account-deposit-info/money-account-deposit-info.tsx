import React from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import { useMoneyAccountDepositNavbar } from '../../../../../UI/Money/hooks/useMoneyAccountDepositNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import type { SetPayTokenRequest } from '../../../hooks/pay/useAutomaticTransactionPayToken';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  const { TooltipNode } = useMoneyAccountDepositNavbar();
  // Move-mUSD passes a preferred token via route params; Convert-crypto does
  // not, so this stays undefined and the default token logic is unaffected.
  const { preferredPaymentToken } = useParams<{
    preferredPaymentToken?: SetPayTokenRequest;
  }>();

  return (
    <>
      {TooltipNode}
      <CustomAmountInfo
        currency={MONEY_ACCOUNT_CURRENCY}
        hasMax
        preferredToken={preferredPaymentToken}
        supportAccountSelection
      />
    </>
  );
}
