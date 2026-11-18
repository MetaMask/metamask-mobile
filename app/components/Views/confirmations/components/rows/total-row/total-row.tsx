import React, { useCallback, useMemo, useState } from 'react';
import InfoRow from '../../UI/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { Pressable, View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayQuotesRaw,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { isNoOpQuote } from '../../../../../../selectors/transactionPayController';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { isTransactionPayWithdraw } from '../../../utils/transaction';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  normalizeUsdFiatString,
  useMoneyDepositFiatFormatter,
} from '../../../hooks/pay/useMoneyDepositFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import DottedUnderline from '../../../../../UI/DottedUnderline';
import { useTheme } from '../../../../../../util/theme';
import { MoneyMusdInfoSheet } from '../../modals/money-musd-info-sheet';

/**
 * Row component that owns the bottom line of the totals section.
 *
 * For withdrawal flows (when the feature flag allows selecting a withdraw
 * token), Money Account deposits, input-based quotes, and non-withdraw flows
 * when Max is selected, the "You receive" row is shown so the user can see
 * the authoritative destination amount. Otherwise the total cost row is shown.
 */
export function TotalRow() {
  const { canSelectWithdrawToken } = useTransactionPayWithdraw();
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const totals = useTransactionPayTotals();
  const transactionMetadata = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMetadata);
  const isMoneyAccountDeposit = hasTransactionType(transactionMetadata, [
    TransactionType.moneyAccountDeposit,
  ]);

  const showReceiveRow =
    isMoneyAccountDeposit ||
    canSelectWithdrawToken ||
    totals?.isInputBased === true ||
    (Boolean(isMaxAmount) && !isWithdraw);

  if (showReceiveRow) {
    return <ReceiveRow isMoneyAccountDeposit={isMoneyAccountDeposit} />;
  }

  return <TotalFeesRow />;
}

/**
 * Displays the total cost for deposit/payment transactions.
 */
function TotalFeesRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const { isHeadlessBuyInProgress } = useConfirmationContext();

  const totalUsd = useMemo(() => {
    if (!totals?.total) return '';
    return formatFiat(new BigNumber(totals.total.usd));
  }, [totals, formatFiat]);

  if (isLoading) {
    return <InfoRowSkeleton testId="total-row-skeleton" />;
  }

  const textColor = isHeadlessBuyInProgress
    ? TextColor.TextMuted
    : TextColor.TextAlternative;

  return (
    <View testID="total-row">
      <InfoRow
        label={strings('confirm.label.total')}
        variant={textColor}
        rowVariant={InfoRowVariant.Small}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={textColor}
          testID={ConfirmationRowComponentIDs.TOTAL}
        >
          {totalUsd}
        </Text>
      </InfoRow>
    </View>
  );
}

/**
 * Displays "You'll receive" for withdrawal, Money Account deposit, input-based, and Max flows.
 *
 * Prefers `totals.targetAmount.usd` from executable quotes (after fees). A
 * route needing no conversion only produces a no-op quote, which is excluded
 * from totals and leaves `targetAmount` at 0 — nothing is converted, so the
 * required token amount is what gets received.
 */
function ReceiveRow({
  isMoneyAccountDeposit,
}: {
  isMoneyAccountDeposit: boolean;
}) {
  const formatFiat = useFiatFormatter({
    currency: 'usd',
    fractionDigits: isMoneyAccountDeposit ? 2 : undefined,
  });
  const formatSheetFiat = useMoneyDepositFiatFormatter();
  const tw = useTailwind();
  const { colors } = useTheme();
  const [isMusdSheetOpen, setIsMusdSheetOpen] = useState(false);
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const requiredTokens = useTransactionPayRequiredTokens();
  const rawQuotes = useTransactionPayQuotesRaw();

  const receiveBn = useMemo(() => {
    const targetAmountUsd = totals?.targetAmount?.usd;
    const targetBn =
      targetAmountUsd == null ? null : new BigNumber(targetAmountUsd);

    if (targetBn?.gt(0)) {
      return targetBn;
    }

    const isNoOpRoute = (rawQuotes ?? []).some(isNoOpQuote);

    const requiredAmountUsd = (requiredTokens ?? []).find(
      (token) => !token.skipIfBalance,
    )?.amountUsd;

    if (
      (isNoOpRoute || isMoneyAccountDeposit) &&
      requiredAmountUsd &&
      new BigNumber(requiredAmountUsd).gt(0)
    ) {
      return new BigNumber(requiredAmountUsd);
    }

    return targetBn;
  }, [
    isMoneyAccountDeposit,
    rawQuotes,
    requiredTokens,
    totals?.targetAmount?.usd,
  ]);

  const receiveUsd = useMemo(() => {
    if (receiveBn == null) {
      return '';
    }
    const formatted = formatFiat(receiveBn);
    return isMoneyAccountDeposit
      ? normalizeUsdFiatString(formatted)
      : formatted;
  }, [formatFiat, isMoneyAccountDeposit, receiveBn]);

  const receiveSheetUsd = useMemo(
    () => (receiveBn == null ? '' : formatSheetFiat(receiveBn)),
    [formatSheetFiat, receiveBn],
  );

  const handleReceivePress = useCallback(() => {
    if (!receiveSheetUsd) {
      return;
    }
    setIsMusdSheetOpen(true);
  }, [receiveSheetUsd]);

  const handleMusdSheetClose = useCallback(() => {
    setIsMusdSheetOpen(false);
  }, []);

  if (isLoading) {
    return <InfoRowSkeleton testId="receive-row-skeleton" />;
  }

  const labelText = strings('confirm.label.you_receive');

  return (
    <View testID="receive-row">
      <InfoRow label={labelText} rowVariant={InfoRowVariant.Small}>
        {isMoneyAccountDeposit && receiveUsd ? (
          <Pressable
            onPress={handleReceivePress}
            accessibilityRole="button"
            accessibilityLabel={`${labelText} ${receiveUsd}`}
            hitSlop={8}
            style={({ pressed }) => tw.style('pb-px', pressed && 'opacity-50')}
            testID={ConfirmationRowComponentIDs.RECEIVE_PRESSABLE}
          >
            <DottedUnderline color={colors.text.alternative}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={ConfirmationRowComponentIDs.RECEIVE}
              >
                {receiveUsd}
              </Text>
            </DottedUnderline>
          </Pressable>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={ConfirmationRowComponentIDs.RECEIVE}
          >
            {receiveUsd}
          </Text>
        )}
      </InfoRow>
      {isMoneyAccountDeposit && isMusdSheetOpen ? (
        <MoneyMusdInfoSheet
          open={isMusdSheetOpen}
          onClose={handleMusdSheetClose}
          receiveAmountFiat={receiveSheetUsd}
        />
      ) : null}
    </View>
  );
}
