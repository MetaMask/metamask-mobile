import React from 'react';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

export function CustomAmountTotals({
  stage,
}: Readonly<{
  stage: CustomAmountStage;
}>) {
  const transactionMeta = useTransactionMetadataRequest();
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  if (stage === CustomAmountStage.Loading) {
    return (
      <CustomAmountTotalsSkeleton
        isMoneyAccountDeposit={isMoneyAccountDeposit}
      />
    );
  }

  if (stage === CustomAmountStage.NoQuote) {
    return null;
  }

  if (isMoneyAccountDeposit) {
    return (
      <>
        <BridgeTimeRow />
        <BridgeFeeRow />
        <TotalRow />
      </>
    );
  }

  return (
    <>
      <BridgeFeeRow />
      <BridgeTimeRow />
      <TotalRow />
    </>
  );
}

function CustomAmountTotalsSkeleton({
  isMoneyAccountDeposit,
}: {
  isMoneyAccountDeposit: boolean;
}) {
  if (isMoneyAccountDeposit) {
    return (
      <>
        <InfoRowSkeleton testId="bridge-time-row-skeleton" />
        <InfoRowSkeleton testId="bridge-fee-row-skeleton" />
        <InfoRowSkeleton testId="total-row-skeleton" />
      </>
    );
  }

  return (
    <>
      <InfoRowSkeleton testId="bridge-fee-row-skeleton" />
      <InfoRowSkeleton testId="bridge-time-row-skeleton" />
      <InfoRowSkeleton testId="total-row-skeleton" />
    </>
  );
}
