import React from 'react';
import { Box } from '../../../../UI/Box/Box';
import { BridgeFeeRow } from '../../../../Views/confirmations/components/rows/bridge-fee-row';
import { BridgeTimeRow } from '../../../../Views/confirmations/components/rows/bridge-time-row';
import { PercentageRow } from '../../../../Views/confirmations/components/rows/percentage-row';
import { TotalRow } from '../../../../Views/confirmations/components/rows/total-row';
import { InfoRowSkeleton } from '../../../../Views/confirmations/components/UI/info-row/info-row';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../../../../Views/confirmations/hooks/pay/useTransactionPayData';

export const PerpsDepositFees = () => {
  const isResultReady = useIsResultReady();

  if (!isResultReady) {
    return (
      <Box>
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <BridgeFeeRow />
      <BridgeTimeRow />
      <TotalRow />
      <PercentageRow />
    </Box>
  );
};

function useIsResultReady() {
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const requiredTokens = useTransactionPayRequiredTokens();
  const sourceAmounts = useTransactionPaySourceAmounts();

  const hasSourceAmount = sourceAmounts?.some((a) =>
    requiredTokens.some(
      (rt) =>
        rt.address.toLowerCase() === a.targetTokenAddress.toLowerCase() &&
        !rt.skipIfBalance,
    ),
  );

  return isQuotesLoading || Boolean(quotes?.length) || !hasSourceAmount;
}
