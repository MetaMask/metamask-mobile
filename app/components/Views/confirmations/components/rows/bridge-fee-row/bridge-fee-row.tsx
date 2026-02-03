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
import {
  hasTransactionType,
  isWithdrawalTransaction,
} from '../../../utils/transaction';
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
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';
import { Json } from '@metamask/utils';

const NETWORK_FEE_ONLY_TYPES = [TransactionType.musdConversion];

export function BridgeFeeRow() {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const isLoading = useIsTransactionPayLoading();
  const quotes = useTransactionPayQuotes();
  const totals = useTransactionPayTotals();
  const { fieldAlerts } = useAlerts();
  const hasAlert = fieldAlerts.some((a) => a.field === RowAlertKey.PayWithFee);
  const isWithdrawal = isWithdrawalTransaction(transactionMetadata);

  if (hasTransactionType(transactionMetadata, NETWORK_FEE_ONLY_TYPES)) {
    return (
      <>
        <NetworkFeeRow
          totals={totals}
          hasAlert={hasAlert}
          isLoading={isLoading}
        />
        <MetaMaskFeeRow quotes={quotes} isLoading={isLoading} />
      </>
    );
  }

  // For withdrawals, only show provider fee (network fee is negligible on Polygon)
  if (isWithdrawal) {
    return <WithdrawalProviderFeeRow totals={totals} isLoading={isLoading} />;
  }

  return (
    <>
      <TransactionFeeRow
        totals={totals}
        quotes={quotes}
        transactionMeta={transactionMetadata}
        hasAlert={hasAlert}
        isLoading={isLoading}
      />
      <MetaMaskFeeRow quotes={quotes} isLoading={isLoading} />
    </>
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
      new BigNumber(totals.fees.provider.usd)
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

function NetworkFeeRow({
  totals,
  hasAlert,
  isLoading,
}: {
  totals?: TransactionPayTotals;
  hasAlert: boolean;
  isLoading: boolean;
}) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const networkFeeUsd = useMemo(() => {
    const networkFeeUsdBN = getNetworkFeeUsdBN({ totals });
    return networkFeeUsdBN ? formatFiat(networkFeeUsdBN) : '';
  }, [totals, formatFiat]);

  if (isLoading) return <InfoRowSkeleton testId="network-fee-row-skeleton" />;

  return (
    <AlertRow
      testID="network-fee-row"
      label={strings('confirm.label.network_fee')}
      alertField={RowAlertKey.PayWithFee}
      tooltipTitle={strings('confirm.label.network_fee')}
      tooltip={strings('confirm.tooltip.network_fee')}
      tooltipColor={IconColor.Alternative}
      rowVariant={InfoRowVariant.Small}
    >
      <Text
        variant={TextVariant.BodyMD}
        color={hasAlert ? TextColor.Error : TextColor.Alternative}
        testID={ConfirmationRowComponentIDs.NETWORK_FEE}
      >
        {networkFeeUsd}
      </Text>
    </AlertRow>
  );
}

function MetaMaskFeeRow({
  quotes,
  isLoading,
}: {
  quotes?: TransactionPayQuote<Json>[];
  isLoading: boolean;
}) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const hasQuotes = Boolean(quotes?.length);

  const metamaskFeeUsd = useMemo(
    () => formatFiat(new BigNumber(0)),
    [formatFiat],
  );

  if (isLoading) return <InfoRowSkeleton testId="metamask-fee-row-skeleton" />;

  if (!hasQuotes) return null;

  return (
    <InfoRow
      testID="metamask-fee-row"
      label={strings('confirm.label.metamask_fee')}
      rowVariant={InfoRowVariant.Small}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {metamaskFeeUsd}
      </Text>
    </InfoRow>
  );
}

/**
 * Transaction fee row for withdrawals.
 */
function WithdrawalProviderFeeRow({
  totals,
  isLoading,
}: {
  totals?: TransactionPayTotals;
  isLoading: boolean;
}) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const transactionFeeUsd = useMemo(() => {
    if (!totals?.fees?.provider?.usd) return '';
    const providerFee = new BigNumber(totals.fees.provider.usd);
    if (providerFee.isZero()) return '';
    return formatFiat(providerFee);
  }, [totals, formatFiat]);

  if (isLoading)
    return <InfoRowSkeleton testId="withdrawal-transaction-fee-row-skeleton" />;

  if (!transactionFeeUsd) return null;

  return (
    <InfoRow
      testID="withdrawal-transaction-fee-row"
      label={strings('confirm.label.transaction_fee')}
      rowVariant={InfoRowVariant.Small}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {transactionFeeUsd}
      </Text>
    </InfoRow>
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

  const networkFeeUsd = useMemo(() => {
    const networkFeeUsdBN = getNetworkFeeUsdBN({ totals });
    return networkFeeUsdBN ? formatFiat(networkFeeUsdBN) : '';
  }, [totals, formatFiat]);

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
