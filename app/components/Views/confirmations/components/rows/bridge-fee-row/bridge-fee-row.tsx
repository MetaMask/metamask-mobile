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
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import {
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import {
  useIsTransactionPayLoading,
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useIsPaidByMetaMask } from '../../../hooks/pay/useIsPaidByMetaMask';
import { BigNumber } from 'bignumber.js';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import AlertRow from '../../UI/info-row/alert-row';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import { useAlerts } from '../../../context/alert-system-context';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { Json } from '@metamask/utils';
import { useConfirmationContext } from '../../../context/confirmation-context';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { resolveTransactionType } from '../../../utils/transaction';

export function BridgeFeeRow() {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const isLoading = useIsTransactionPayLoading();
  const quotes = useTransactionPayQuotes();
  const totals = useTransactionPayTotals();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const paidByMetaMask = useIsPaidByMetaMask();
  const { fieldAlerts } = useAlerts();
  const hasAlert = fieldAlerts.some((a) => a.field === RowAlertKey.PayWithFee);
  const { isHeadlessBuyInProgress } = useConfirmationContext();
  const fiatPayment = useTransactionPayFiatPayment();
  const isFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);

  return (
    <TransactionFeeRow
      totals={totals}
      quotes={quotes}
      transactionMeta={transactionMetadata}
      hasSourceAmounts={Boolean(sourceAmounts?.length)}
      hasAlert={hasAlert}
      isLoading={isLoading}
      isFiatPayment={isFiatPayment}
      paidByMetaMask={paidByMetaMask}
      tooltipDisabled={isHeadlessBuyInProgress}
      isDisabled={isHeadlessBuyInProgress}
    />
  );
}

function TransactionFeeRow({
  transactionMeta,
  hasAlert,
  hasSourceAmounts,
  quotes,
  totals,
  isLoading,
  isFiatPayment,
  paidByMetaMask,
  tooltipDisabled,
  isDisabled,
}: {
  transactionMeta: TransactionMeta;
  hasAlert: boolean;
  hasSourceAmounts: boolean;
  quotes?: TransactionPayQuote<Json>[];
  totals?: TransactionPayTotals;
  isLoading: boolean;
  isFiatPayment: boolean;
  paidByMetaMask: boolean;
  tooltipDisabled?: boolean;
  isDisabled?: boolean;
}) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const hasQuotes = Boolean(quotes?.length);

  const feeTotalUsd = useMemo(() => {
    if (
      transactionMeta?.isGasFeeSponsored &&
      !hasSourceAmounts &&
      !isFiatPayment
    ) {
      return formatFiat(new BigNumber(0));
    }

    if (!totals?.fees) return '';

    const metaMask = totals.fees.metaMask.usd ?? 0;
    const provider = totals.fees.provider.usd;
    const sourceNetwork = totals.fees.sourceNetwork.estimate.usd;
    const targetNetwork = totals.fees.targetNetwork.usd;

    return formatFiat(
      new BigNumber(metaMask)
        .plus(provider)
        .plus(sourceNetwork)
        .plus(targetNetwork),
    );
  }, [
    totals,
    formatFiat,
    transactionMeta?.isGasFeeSponsored,
    hasSourceAmounts,
    isFiatPayment,
  ]);

  if (isLoading) return <InfoRowSkeleton testId="bridge-fee-row-skeleton" />;

  const labelColor = isDisabled ? TextColor.Muted : undefined;
  const valueColor = isDisabled
    ? TextColor.Muted
    : hasAlert
      ? TextColor.Error
      : TextColor.Alternative;

  return (
    <AlertRow
      testID="bridge-fee-row"
      alertField={RowAlertKey.PayWithFee}
      label={strings('confirm.label.transaction_fees')}
      tooltip={
        !paidByMetaMask && hasQuotes && totals ? (
          <Tooltip transactionMeta={transactionMeta} totals={totals} />
        ) : undefined
      }
      tooltipTitle={strings('confirm.tooltip.title.transaction_fee')}
      tooltipDisabled={tooltipDisabled}
      tooltipColor={isDisabled ? IconColor.Muted : undefined}
      rowVariant={InfoRowVariant.Small}
      variant={labelColor}
    >
      {paidByMetaMask ? (
        <PaidByLabel />
      ) : (
        <Text
          variant={TextVariant.BodyMD}
          color={valueColor}
          testID={ConfirmationRowComponentIDs.TRANSACTION_FEE}
        >
          {feeTotalUsd}
        </Text>
      )}
    </AlertRow>
  );
}

function PaidByLabel() {
  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={4}
      testID={ConfirmationRowComponentIDs.PAID_BY_METAMASK}
    >
      <Icon
        name={IconName.CheckBold}
        color={IconColor.Success}
        size={IconSize.Sm}
      />
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {strings('transactions.paid_by_metamask')}
      </Text>
    </Box>
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

const TOOLTIP_MESSAGE_KEY: Partial<Record<TransactionType, string>> = {
  [TransactionType.perpsWithdraw]:
    'confirm.tooltip.perps_withdraw.transaction_fee',
  [TransactionType.predictWithdraw]:
    'confirm.tooltip.predict_withdraw.transaction_fee',
  [TransactionType.predictDeposit]:
    'confirm.tooltip.predict_deposit.transaction_fee',
  [TransactionType.musdConversion]:
    'confirm.tooltip.musd_conversion.transaction_fee',
  [TransactionType.moneyAccountWithdraw]:
    'confirm.tooltip.money_account_withdraw.transaction_fee',
  [TransactionType.moneyAccountDeposit]:
    'confirm.tooltip.money_account_deposit.transaction_fee',
  [TransactionType.perpsDeposit]:
    'confirm.tooltip.perps_deposit.transaction_fee',
};

function Tooltip({
  transactionMeta,
  totals,
}: {
  transactionMeta: TransactionMeta;
  totals: TransactionPayTotals;
}): ReactNode {
  const transactionType = resolveTransactionType(
    transactionMeta,
    Object.keys(TOOLTIP_MESSAGE_KEY) as TransactionType[],
  );

  const key =
    transactionType !== undefined
      ? TOOLTIP_MESSAGE_KEY[transactionType]
      : undefined;

  if (!key) return null;

  return <FeesTooltip message={strings(key)} totals={totals} />;
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

  // On-ramp (e.g. Transak) fee, only present for the fiat strategy. The
  // combined `provider` fee bucket includes both the on-ramp leg and any
  // bridge/relay provider fee, so we break the on-ramp portion out separately
  // and show the remainder as the (bridge) provider fee. This keeps the line
  // items summing to the same row total while disclosing all fees up front.
  const onRampFeeUsdBN = useMemo(
    () => new BigNumber(totals.fees.providerFiat?.usd ?? 0),
    [totals],
  );
  const hasOnRampFee = onRampFeeUsdBN.gt(0);

  const providerFeeUsdBN = useMemo(() => {
    const provider = new BigNumber(totals.fees.provider.usd);
    return hasOnRampFee ? provider.minus(onRampFeeUsdBN) : provider;
  }, [totals, onRampFeeUsdBN, hasOnRampFee]);

  const providerFeeUsd = useMemo(
    () => formatFiat(providerFeeUsdBN),
    [providerFeeUsdBN, formatFiat],
  );

  const onRampFeeUsd = useMemo(
    () => formatFiat(onRampFeeUsdBN),
    [onRampFeeUsdBN, formatFiat],
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
      {hasOnRampFee && (
        <Box
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
        >
          <Text color={TextColor.Alternative}>
            {strings('confirm.label.onramp_fee')}
          </Text>
          <Text color={TextColor.Alternative}>{onRampFeeUsd}</Text>
        </Box>
      )}
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
