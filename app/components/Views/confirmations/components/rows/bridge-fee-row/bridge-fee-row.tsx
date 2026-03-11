import React, { ReactNode, useMemo } from 'react';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../../UI/Box/box.types';
import { hasTransactionType } from '../../../utils/transaction';
import {
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { BigNumber } from 'bignumber.js';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import AlertRow from '../../UI/info-row/alert-row';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import { useAlerts } from '../../../context/alert-system-context';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { Json } from '@metamask/utils';

export function BridgeFeeRow() {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const isLoading = useIsTransactionPayLoading();
  const quotes = useTransactionPayQuotes();
  const totals = useTransactionPayTotals();
  const { fieldAlerts } = useAlerts();
  const hasAlert = fieldAlerts.some((a) => a.field === RowAlertKey.PayWithFee);

  return (
    <TransactionFeeRow
      totals={totals}
      quotes={quotes}
      transactionMeta={transactionMetadata}
      hasAlert={hasAlert}
      isLoading={isLoading}
    />
  );
}

function TransactionFeeRow({
  transactionMeta,
  hasAlert,
  quotes,
  totals,
  isLoading,
}: {
  transactionMeta: TransactionMeta;
  hasAlert: boolean;
  quotes?: TransactionPayQuote<Json>[];
  totals?: TransactionPayTotals;
  isLoading: boolean;
}) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const feeTotalUsd = useMemo(() => {
    if (!totals?.fees) return '';

    return formatFiat(
      new BigNumber(totals.fees.metaMask.usd ?? 0)
        .plus(totals.fees.provider.usd)
        .plus(
          // this cast is temporary until we release core and update TPC version in mobile
          (totals.fees as unknown as { fiatProvider?: { usd: number } })
            ?.fiatProvider?.usd ?? 0,
        )
        .plus(totals.fees.sourceNetwork.estimate.usd)
        .plus(totals.fees.targetNetwork.usd),
    );
  }, [totals, formatFiat]);

  if (isLoading) return <InfoRowSkeleton testId="bridge-fee-row-skeleton" />;

  const hasQuotes = Boolean(quotes?.length);

  return (
    <AlertRow
      testID="bridge-fee-row"
      alertField={RowAlertKey.PayWithFee}
      label={strings('confirm.label.transaction_fee')}
      tooltip={
        hasQuotes && totals ? (
          <Tooltip transactionMeta={transactionMeta} totals={totals} />
        ) : undefined
      }
      tooltipTitle={strings('confirm.tooltip.title.transaction_fee')}
      rowVariant={InfoRowVariant.Small}
    >
      <Text
        variant={TextVariant.BodyMD}
        color={hasAlert ? TextColor.Error : TextColor.Alternative}
        testID={ConfirmationRowComponentIDs.TRANSACTION_FEE}
      >
        {feeTotalUsd}
      </Text>
    </AlertRow>
  );
}

function getNetworkFeeUsdBN({
  totals,
}: {
  totals?: TransactionPayTotals;
}): BigNumber | undefined {
  const sourceNetworkUsd = totals?.fees?.sourceNetwork?.estimate?.usd;
  const targetNetworkUsd = totals?.fees?.targetNetwork?.usd;

  if (sourceNetworkUsd == null || targetNetworkUsd == null) return undefined;

  return new BigNumber(sourceNetworkUsd).plus(targetNetworkUsd);
}

function Tooltip({
  transactionMeta,
  totals,
}: {
  transactionMeta: TransactionMeta;
  totals: TransactionPayTotals;
}): ReactNode {
  let message: string | undefined;

  if (
    hasTransactionType(transactionMeta, [
      TransactionType.predictDeposit,
      TransactionType.predictWithdraw,
    ])
  ) {
    message = hasTransactionType(transactionMeta, [
      TransactionType.predictWithdraw,
    ])
      ? strings('confirm.tooltip.predict_withdraw.transaction_fee')
      : strings('confirm.tooltip.predict_deposit.transaction_fee');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.musdConversion])) {
    message = strings('confirm.tooltip.musd_conversion.transaction_fee');
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
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const networkFeeUsd = useMemo(() => {
    const networkFeeUsdBN = getNetworkFeeUsdBN({ totals });
    return networkFeeUsdBN ? formatFiat(networkFeeUsdBN) : '';
  }, [totals, formatFiat]);

  const providerFeeUsd = useMemo(
    () =>
      formatFiat(
        new BigNumber(totals.fees.provider.usd).plus(
          // this cast is temporary until we release core and update TPC version in mobile
          (totals.fees as unknown as { fiatProvider?: { usd: number } })
            ?.fiatProvider?.usd ?? 0,
        ),
      ),
    [totals, formatFiat],
  );

  const metaMaskFeeUsd = useMemo(
    () => formatFiat(new BigNumber(totals.fees.metaMask.usd ?? 0)),
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
          {strings('confirm.label.provider_fee')}
        </Text>
        <Text color={TextColor.Alternative}>{providerFeeUsd}</Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Text color={TextColor.Alternative}>
          {strings('confirm.label.metamask_fee')}
        </Text>
        <Text color={TextColor.Alternative}>{metaMaskFeeUsd}</Text>
      </Box>
    </Box>
  );
}
