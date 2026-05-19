import React from 'react';
import { BalanceProjection } from '../../../../Views/confirmations/components/balance-projection';
import type { BuyFlowOrigin } from './BuildQuote';

interface BuildQuoteAmountAddOnProps {
  buyFlowOrigin: BuyFlowOrigin | undefined;
  amountFiat: string;
}

function BuildQuoteAmountAddOn({
  buyFlowOrigin,
  amountFiat,
}: BuildQuoteAmountAddOnProps) {
  switch (buyFlowOrigin) {
    case 'moneyAccountDeposit':
      return <BalanceProjection amountFiat={amountFiat} projectedYears={1} />;
    default:
      return null;
  }
}

export default BuildQuoteAmountAddOn;
