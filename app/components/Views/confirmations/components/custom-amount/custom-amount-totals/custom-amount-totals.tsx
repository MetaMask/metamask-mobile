import React from 'react';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
import { ReceiveRow } from '../../rows/receive-row';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';

function PaymentDetailsSkeleton() {
  return (
    <>
      <InfoRowSkeleton testId="bridge-fee-row-skeleton" />
      <InfoRowSkeleton testId="bridge-time-row-skeleton" />
      <InfoRowSkeleton testId="total-row-skeleton" />
    </>
  );
}

export function CustomAmountTotals({
  amountFiat,
  canSelectWithdrawToken,
  stage,
}: Readonly<{
  amountFiat: string;
  canSelectWithdrawToken: boolean;
  stage: CustomAmountStage;
}>) {
  if (stage === CustomAmountStage.Loading) {
    return <PaymentDetailsSkeleton />;
  }

  if (stage === CustomAmountStage.NoQuote) {
    return null;
  }

  return (
    <>
      <BridgeFeeRow />
      <BridgeTimeRow />
      {canSelectWithdrawToken ? (
        <ReceiveRow inputAmountUsd={amountFiat} />
      ) : (
        <TotalRow />
      )}
    </>
  );
}
