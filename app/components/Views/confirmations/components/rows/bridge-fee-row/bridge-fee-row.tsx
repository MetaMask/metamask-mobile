import React, {
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal } from 'react-native';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../../locales/i18n';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  Box,
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import { useAlerts } from '../../../context/alert-system-context';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { Json } from '@metamask/utils';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { resolveTransactionType } from '../../../utils/transaction';
import { KeyValueRowSkeleton } from '../key-value-row-skeleton';

const FEE_TOOLTIP_TEST_ID = 'info-row-tooltip';

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
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

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

  const tooltipContent = useMemo(() => {
    if (paidByMetaMask || !hasQuotes || !totals) {
      return null;
    }
    return <FeesTooltip transactionMeta={transactionMeta} totals={totals} />;
  }, [paidByMetaMask, hasQuotes, totals, transactionMeta]);

  const handleSheetClosed = useCallback(() => {
    setIsTooltipOpen(false);
  }, []);

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  if (isLoading) {
    return <KeyValueRowSkeleton testID="bridge-fee-row-skeleton" />;
  }

  const valueColor = isDisabled
    ? TextColor.TextMuted
    : hasAlert
      ? TextColor.ErrorDefault
      : TextColor.TextDefault;

  const keyColor = isDisabled ? TextColor.TextMuted : TextColor.TextAlternative;

  return (
    <Box testID="bridge-fee-row">
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('confirm.label.transaction_fees')}
        keyTextProps={{
          color: keyColor,
        }}
        keyEndButtonIconProps={
          tooltipContent
            ? {
                iconName: IconName.Info,
                onPress: () => {
                  if (!tooltipDisabled) {
                    setIsTooltipOpen(true);
                  }
                },
                testID: `${FEE_TOOLTIP_TEST_ID}-open-btn`,
                iconProps: {
                  color: tooltipDisabled
                    ? IconColor.IconMuted
                    : IconColor.IconAlternative,
                },
              }
            : undefined
        }
        value={
          paidByMetaMask
            ? strings('transactions.paid_by_metamask')
            : feeTotalUsd
        }
        valueStartAccessory={
          paidByMetaMask ? (
            <Icon
              name={IconName.CheckBold}
              color={IconColor.SuccessDefault}
              size={IconSize.Sm}
            />
          ) : undefined
        }
        valueTextProps={{
          color: paidByMetaMask ? TextColor.SuccessDefault : valueColor,
          testID: paidByMetaMask
            ? ConfirmationRowComponentIDs.PAID_BY_METAMASK
            : ConfirmationRowComponentIDs.TRANSACTION_FEE,
        }}
      />
      {isTooltipOpen && tooltipContent && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleRequestClose}
        >
          <BottomSheet
            testID={FEE_TOOLTIP_TEST_ID}
            ref={bottomSheetRef}
            keyboardAvoidingViewEnabled={false}
            onClose={handleSheetClosed}
          >
            <BottomSheetHeader
              onClose={handleRequestClose}
              closeButtonProps={{
                testID: `${FEE_TOOLTIP_TEST_ID}-close-btn`,
              }}
            >
              {strings('confirm.tooltip.title.transaction_fee')}
            </BottomSheetHeader>
            {tooltipContent}
          </BottomSheet>
        </Modal>
      )}
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

function FeesTooltip({
  transactionMeta,
  totals,
}: {
  transactionMeta: TransactionMeta;
  totals: TransactionPayTotals;
}): ReactNode {
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const transactionType = resolveTransactionType(
    transactionMeta,
    Object.keys(TOOLTIP_MESSAGE_KEY) as TransactionType[],
  );

  const messageKey =
    transactionType !== undefined
      ? TOOLTIP_MESSAGE_KEY[transactionType]
      : undefined;

  const networkFeeUsd = useMemo(() => {
    const networkFeeUsdBN = getNetworkFeeUsdBN({ totals });
    return networkFeeUsdBN ? formatFiat(networkFeeUsdBN) : '';
  }, [totals, formatFiat]);

  const providerFeeUsd = useMemo(
    () => formatFiat(new BigNumber(totals.fees.provider.usd)),
    [totals, formatFiat],
  );

  const metaMaskFeeUsd = useMemo(
    () => formatFiat(new BigNumber(totals.fees.metaMask.usd ?? 0)),
    [totals, formatFiat],
  );

  if (!messageKey) {
    return null;
  }

  return (
    <Box twClassName="pb-4" gap={1}>
      <Text variant={TextVariant.BodyMd} twClassName="px-4 pb-3">
        {strings(messageKey)}
      </Text>
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('confirm.label.network_fee')}
        value={networkFeeUsd}
      />
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('confirm.label.provider_fee')}
        value={providerFeeUsd}
      />
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('confirm.label.metamask_fee')}
        value={metaMaskFeeUsd}
      />
    </Box>
  );
}
