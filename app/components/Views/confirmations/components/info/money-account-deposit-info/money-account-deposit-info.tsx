import React from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import { useMoneyAccountDepositNavbar } from '../../../../../UI/Money/hooks/useMoneyAccountDepositNavbar';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  const { TooltipNode } = useMoneyAccountDepositNavbar();

  return (
    <>
      {TooltipNode}
      <CustomAmountInfo
        currency={MONEY_ACCOUNT_CURRENCY}
        hasMax
        supportAccountSelection
      />
    </>
  );
}
