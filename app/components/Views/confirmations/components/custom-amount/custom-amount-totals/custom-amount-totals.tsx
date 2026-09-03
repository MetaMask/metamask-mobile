import React from 'react';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';

export function CustomAmountTotals({
  stage,
}: Readonly<{
  stage: CustomAmountStage;
}>) {
  if (stage === CustomAmountStage.Loading) {
    return <CustomAmountTotalsSkeleton />;
  }

  if (stage === CustomAmountStage.NoQuote) {
    return null;
  }

  return (
    <>
      <BridgeFeeRow />
      <BridgeTimeRow />
      <TotalRow />
    </>
  );
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
