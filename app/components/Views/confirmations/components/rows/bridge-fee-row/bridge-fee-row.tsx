import React, { ReactNode, useMemo } from 'react';
import InfoRow from '../../UI/info-row';
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
import { TransactionPayTotals } from '@metamask/transaction-pay-controller';
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

export function BridgeFeeRow() {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const quotes = useTransactionPayQuotes();
  const totals = useTransactionPayTotals();
  const { fieldAlerts } = useAlerts();
  const hasAlert = fieldAlerts.some((a) => a.field === RowAlertKey.PayWithFee);

  const feeTotalUsd = useMemo(() => {
    if (!totals?.fees) return '';

    return formatFiat(
      new BigNumber(totals.fees.provider.usd)
        .plus(totals.fees.sourceNetwork.estimate.usd)
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
        <InfoRowSkeleton testId="bridge-fee-row-skeleton" />
        <InfoRowSkeleton testId="metamask-fee-row-skeleton" />
      </>
    );
  }

  const hasQuotes = Boolean(quotes?.length);

  return (
    <>
      <AlertRow
        testID="bridge-fee-row"
        alertField={RowAlertKey.PayWithFee}
        label={strings('confirm.label.transaction_fee')}
        tooltip={
          hasQuotes && totals ? (
            <Tooltip transactionMeta={transactionMetadata} totals={totals} />
          ) : undefined
        }
        tooltipTitle={strings('confirm.tooltip.title.transaction_fee')}
        rowVariant={InfoRowVariant.Small}
      >
        <Text
          variant={TextVariant.BodyMD}
          color={hasAlert ? TextColor.Error : TextColor.Alternative}
        >
          {feeTotalUsd}
        </Text>
      </AlertRow>
      {hasQuotes && (
        <InfoRow
          testID="metamask-fee-row"
          label={strings('confirm.label.metamask_fee')}
          rowVariant={InfoRowVariant.Small}
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {metamaskFeeUsd}
          </Text>
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

  const networkFeeUsd = useMemo(
    () =>
      formatFiat(
        new BigNumber(totals.fees.sourceNetwork.estimate.usd).plus(
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
