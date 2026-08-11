import React from 'react';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
import { ReceiveRow } from '../../rows/receive-row';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';

export function CustomAmountTotals({
  amountFiat,
  canSelectWithdrawToken,
  isAddMusdIntent,
  isAwaitingPrefillResult,
  isLoading,
  showPaymentDetails,
}: Readonly<{
  amountFiat: string;
  canSelectWithdrawToken: boolean;
  isAddMusdIntent: boolean;
  isAwaitingPrefillResult: boolean;
  isLoading: boolean;
  showPaymentDetails: boolean;
}>) {
  if (isLoading) {
    return <CustomAmountTotalsSkeleton />;
  }

  if (showPaymentDetails && !isAwaitingPrefillResult) {
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

  if (isAddMusdIntent || isAwaitingPrefillResult) {
    return <CustomAmountTotalsSkeleton />;
  }

  return null;
}

function CustomAmountTotalsSkeleton() {
  return (
    <>
      <InfoRowSkeleton testId="bridge-fee-row-skeleton" />
      <InfoRowSkeleton testId="bridge-time-row-skeleton" />
      <InfoRowSkeleton testId="total-row-skeleton" />
    </>
  );
}
