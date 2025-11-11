import React, { ReactNode, useMemo } from 'react';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../../UI/Box/box.types';
import { SkeletonRow } from '../skeleton-row';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionPayTotals } from '@metamask/transaction-pay-controller';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayFiat } from '../../../hooks/pay/useTransactionPayFiat';
import { BigNumber } from 'bignumber.js';

export function BridgeFeeRow() {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const { formatFiat } = useTransactionPayFiat();
  const isLoading = useIsTransactionPayLoading();
  const quotes = useTransactionPayQuotes();
  const totals = useTransactionPayTotals();

  const feeTotalUsd = useMemo(() => {
    if (!totals?.fees) return '';

    return formatFiat(
      new BigNumber(totals.fees.provider.usd)
        .plus(totals.fees.sourceNetwork.usd)
        .plus(totals.fees.targetNetwork.usd),
    );
  }, [totals, formatFiat]);

  const metamaskFeeUsd = useMemo(
    () => formatFiat(new BigNumber(0)),
    [formatFiat],
  );

  if (isLoading) {
    return (
      <>
        <SkeletonRow testId="bridge-fee-row-skeleton" />
        <SkeletonRow testId="metamask-fee-row-skeleton" />
      </>
    );
  }

  const hasQuotes = Boolean(quotes?.length);

  return (
    <>
      <InfoRow
        testID="bridge-fee-row"
        label={strings('confirm.label.transaction_fee')}
        tooltip={
          hasQuotes && totals ? (
            <Tooltip transactionMeta={transactionMetadata} totals={totals} />
          ) : undefined
        }
        tooltipTitle={strings('confirm.tooltip.title.transaction_fee')}
      >
        <Text>{feeTotalUsd}</Text>
      </InfoRow>
      {hasQuotes && (
        <InfoRow
          testID="metamask-fee-row"
          label={strings('confirm.label.metamask_fee')}
        >
          <Text>{metamaskFeeUsd}</Text>
        </InfoRow>
      )}
    </>
  );
}

function Tooltip({
  transactionMeta,
  totals,
}: {
  transactionMeta: TransactionMeta;
  totals: TransactionPayTotals;
}): ReactNode {
  let message: string | undefined;

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    message = strings('confirm.tooltip.predict_deposit.transaction_fee');
  }

  switch (transactionMeta.type) {
    case TransactionType.perpsDeposit:
      message = strings('confirm.tooltip.perps_deposit.transaction_fee');
      break;
  }

  if (!message) return null;

  return <FeesTooltip message={message} totals={totals} />;
}

function FeesTooltip({
  message,
  totals,
}: {
  message: string;
  totals: TransactionPayTotals;
}) {
  const { formatFiat } = useTransactionPayFiat();

  const networkFeeUsd = useMemo(
    () =>
      formatFiat(
        new BigNumber(totals.fees.sourceNetwork.usd).plus(
          totals.fees.targetNetwork.usd,
        ),
      ),
    [totals, formatFiat],
  );

  const providerFeeUsd = useMemo(
    () => formatFiat(new BigNumber(totals.fees.provider.usd)),
    [totals, formatFiat],
  );

  return (
    <Box gap={14}>
      <Text>{message}</Text>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Text color={TextColor.Alternative}>
          {strings('confirm.label.network_fee')}
        </Text>
        <Text color={TextColor.Alternative}>{networkFeeUsd}</Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Text color={TextColor.Alternative}>
          {strings('confirm.label.bridge_fee')}
        </Text>
        <Text color={TextColor.Alternative}>{providerFeeUsd}</Text>
      </Box>
    </Box>
  );
}
