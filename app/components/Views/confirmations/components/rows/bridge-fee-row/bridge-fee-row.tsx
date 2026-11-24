import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../../locales/i18n';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
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
import { TooltipModal } from '../../UI/Tooltip/Tooltip';
import { useAlerts } from '../../../context/alert-system-context';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { Hex, Json } from '@metamask/utils';
import { useConfirmationContext } from '../../../context/confirmation-context';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { resolveTransactionType } from '../../../utils/transaction';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import DottedUnderline from '../../../../../UI/DottedUnderline';
import { useTheme } from '../../../../../../util/theme';
import { decodeEvmAssetId } from '../../../../../../util/transactions/payment-token';

// TODO: temporary cast. Read `fees.lighter` directly once this app depends on a
// `@metamask/transaction-pay-controller` release with MetaMask/core#11730,
// which adds it to `TransactionPayFees`.
function getLighterFee(
  fees: TransactionPayTotals['fees'],
): { usd: string } | undefined {
  return (fees as TransactionPayTotals['fees'] & { lighter?: { usd: string } })
    .lighter;
}

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
  const tw = useTailwind();
  const { colors } = useTheme();
  const [isFeeTooltipOpen, setIsFeeTooltipOpen] = useState(false);

  const hasQuotes = Boolean(quotes?.length);
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const hasFeeTooltip = Boolean(!paidByMetaMask && hasQuotes && totals);
  const useDottedFeeTooltip = isMoneyAccountDeposit && hasFeeTooltip;

  const handleOpenFeeTooltip = useCallback(() => {
    if (tooltipDisabled) {
      return;
    }
    setIsFeeTooltipOpen(true);
  }, [tooltipDisabled]);

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
    const lighter = getLighterFee(totals.fees)?.usd ?? 0;

    return formatFiat(
      new BigNumber(metaMask)
        .plus(lighter)
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

  const labelColor = isDisabled ? TextColor.TextMuted : undefined;
  const valueColor = isDisabled
    ? TextColor.TextMuted
    : hasAlert
      ? TextColor.ErrorDefault
      : TextColor.TextAlternative;

  const underlineColor = isDisabled
    ? colors.text.muted
    : hasAlert
      ? colors.error.default
      : colors.text.alternative;
  const tooltipTitle = strings('confirm.tooltip.title.transaction_fee');
  const tooltipContent =
    hasFeeTooltip && totals ? (
      <Tooltip
        quotes={quotes}
        transactionMeta={transactionMeta}
        totals={totals}
      />
    ) : undefined;

  return (
    <>
      <AlertRow
        testID="bridge-fee-row"
        alertField={RowAlertKey.PayWithFee}
        label={strings('confirm.label.transaction_fees')}
        tooltip={useDottedFeeTooltip ? undefined : tooltipContent}
        tooltipTitle={tooltipTitle}
        tooltipDisabled={tooltipDisabled}
        tooltipColor={isDisabled ? IconColor.Muted : undefined}
        rowVariant={InfoRowVariant.Small}
        variant={labelColor}
      >
        {paidByMetaMask ? (
          <PaidByLabel />
        ) : useDottedFeeTooltip ? (
          <Pressable
            onPress={handleOpenFeeTooltip}
            disabled={tooltipDisabled}
            accessibilityRole="button"
            accessibilityLabel={`${tooltipTitle} ${feeTotalUsd}`}
            hitSlop={8}
            style={({ pressed }) => tw.style('pb-px', pressed && 'opacity-50')}
            testID={ConfirmationRowComponentIDs.TRANSACTION_FEE_PRESSABLE}
          >
            <DottedUnderline color={underlineColor}>
              <Text
                variant={TextVariant.BodyMd}
                color={valueColor}
                testID={ConfirmationRowComponentIDs.TRANSACTION_FEE}
              >
                {feeTotalUsd}
              </Text>
            </DottedUnderline>
          </Pressable>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={valueColor}
            testID={ConfirmationRowComponentIDs.TRANSACTION_FEE}
          >
            {feeTotalUsd}
          </Text>
        )}
      </AlertRow>
      {useDottedFeeTooltip && tooltipContent ? (
        <TooltipModal
          open={isFeeTooltipOpen}
          setOpen={setIsFeeTooltipOpen}
          content={tooltipContent}
          title={tooltipTitle}
          tooltipTestId="info-row-tooltip"
        />
      ) : null}
    </>
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
      <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
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
    'confirm.tooltip.perps_withdraw.swap_to_token',
  [TransactionType.predictWithdraw]:
    'confirm.tooltip.predict_withdraw.swap_to_token',
  [TransactionType.predictDeposit]:
    'confirm.tooltip.predict_deposit.transaction_fee',
  [TransactionType.moneyAccountWithdraw]:
    'confirm.tooltip.money_account_withdraw.transaction_fee',
  [TransactionType.moneyAccountDeposit]:
    'confirm.tooltip.money_account_deposit.transaction_fee',
  [TransactionType.perpsDeposit]:
    'confirm.tooltip.perps_deposit.transaction_fee',
  [TransactionType.perpsLighterDeposit]:
    'confirm.tooltip.perps_deposit.transaction_fee',
  [TransactionType.perpsLighterWithdraw]:
    'confirm.tooltip.perps_withdraw.swap_to_token',
};

function Tooltip({
  quotes,
  transactionMeta,
  totals,
}: {
  quotes?: TransactionPayQuote<Json>[];
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

  return (
    <FeesTooltip
      message={strings(key)}
      quotes={quotes}
      totals={totals}
      transactionMeta={transactionMeta}
    />
  );
}

/**
 * Resolve the token that pays the source network fee.
 *
 * The source is read from the quote request rather than the payment token,
 * since post-quote flows (withdrawals) treat the payment token as the
 * destination. Defaults to the native token of the source chain, unless a gas
 * fee token is used, which the gas station always prices in the source token.
 */
function getNetworkFeeToken({
  quotes,
  totals,
  transactionMeta,
}: {
  quotes?: TransactionPayQuote<Json>[];
  totals: TransactionPayTotals;
  transactionMeta: TransactionMeta;
}): { address: Hex; chainId: Hex } {
  const request = quotes?.[0]?.request;
  const sourceAsset = request && decodeEvmAssetId(request.sourceAssetId);
  const chainId = sourceAsset?.chainId ?? transactionMeta.chainId;

  const address =
    totals.fees.isSourceGasFeeToken && sourceAsset
      ? sourceAsset.address
      : getNativeTokenAddress(chainId);

  return { address, chainId };
}

function FeesTooltip({
  message,
  quotes,
  totals,
  transactionMeta,
}: {
  message: string;
  quotes?: TransactionPayQuote<Json>[];
  totals: TransactionPayTotals;
  transactionMeta: TransactionMeta;
}) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const networkFeeToken = getNetworkFeeToken({
    quotes,
    totals,
    transactionMeta,
  });

  const networkFeeUsdBN = useMemo(
    () => getNetworkFeeUsdBN({ totals }),
    [totals],
  );

  const networkFeeUsd = useMemo(
    () => (networkFeeUsdBN ? formatFiat(networkFeeUsdBN) : ''),
    [networkFeeUsdBN, formatFiat],
  );

  // No token is paid when there is no fee, so the icon would be misleading.
  const showNetworkFeeToken = Boolean(networkFeeUsdBN?.isGreaterThan(0));

  const providerFeeUsd = useMemo(
    () => formatFiat(new BigNumber(totals.fees.provider.usd)),
    [totals, formatFiat],
  );

  const metaMaskFeeUsd = useMemo(
    () => formatFiat(new BigNumber(totals.fees.metaMask.usd ?? 0)),
    [totals, formatFiat],
  );

  const lighterFeeUsd = useMemo(() => {
    const lighterFee = getLighterFee(totals.fees);
    return lighterFee ? formatFiat(new BigNumber(lighterFee.usd)) : undefined;
  }, [totals, formatFiat]);

  return (
    <Box gap={14}>
      <Text>{message}</Text>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
      >
        <Text color={TextColor.TextAlternative}>
          {strings('confirm.label.network_fee')}
        </Text>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={6}
        >
          {showNetworkFeeToken && (
            <TokenIcon
              address={networkFeeToken.address}
              chainId={networkFeeToken.chainId}
              variant={TokenIconVariant.Row}
            />
          )}
          <Text color={TextColor.TextAlternative}>{networkFeeUsd}</Text>
        </Box>
      </Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Text color={TextColor.TextAlternative}>
          {strings('confirm.label.provider_fee')}
        </Text>
        <Text color={TextColor.TextAlternative}>{providerFeeUsd}</Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Text color={TextColor.TextAlternative}>
          {strings('confirm.label.metamask_fee')}
        </Text>
        <Text color={TextColor.TextAlternative}>{metaMaskFeeUsd}</Text>
      </Box>
      {lighterFeeUsd !== undefined && (
        <Box
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
        >
          <Text color={TextColor.TextAlternative}>
            {strings('confirm.label.lighter_fee')}
          </Text>
          <Text color={TextColor.TextAlternative}>{lighterFeeUsd}</Text>
        </Box>
      )}
    </Box>
  );
}
