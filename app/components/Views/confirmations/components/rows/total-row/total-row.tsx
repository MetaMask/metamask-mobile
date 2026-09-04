import React, { useMemo } from 'react';
import InfoRow from '../../UI/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { isTransactionPayWithdraw } from '../../../utils/transaction';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

function isSameTokenAddressAndChain(
  left: { address?: string; chainId?: string } | undefined,
  right: { address?: string; chainId?: string } | undefined,
): boolean {
  if (!left?.address || !left.chainId || !right?.address || !right.chainId) {
    return false;
  }

  return (
    left.address.toLowerCase() === right.address.toLowerCase() &&
    left.chainId.toLowerCase() === right.chainId.toLowerCase()
  );
}

function isSameTokenAddressAndChain(
  left: { address?: string; chainId?: string } | undefined,
  right: { address?: string; chainId?: string } | undefined,
): boolean {
  if (!left?.address || !left.chainId || !right?.address || !right.chainId) {
    return false;
  }

  return (
    left.address.toLowerCase() === right.address.toLowerCase() &&
    left.chainId.toLowerCase() === right.chainId.toLowerCase()
  );
}

/**
 * Row component that owns the bottom line of the totals section.
 *
 * For withdrawal flows (when the feature flag allows selecting a withdraw
 * token), input-based quotes, and non-withdraw flows when Max is selected, the
 * "You receive" row is shown so the user can see the authoritative destination
 * amount. Otherwise the total cost row is shown.
 */
export function TotalRow() {
  const { canSelectWithdrawToken } = useTransactionPayWithdraw();
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const totals = useTransactionPayTotals();
  const transactionMetadata = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMetadata);

  const showReceiveRow =
    canSelectWithdrawToken ||
    totals?.isInputBased === true ||
    (Boolean(isMaxAmount) && !isWithdraw);

  if (showReceiveRow) {
    return <ReceiveRow />;
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
 * Displays "You'll receive" for withdrawal, input-based, and Max flows.
 *
 * Prefers `totals.targetAmount.usd` from executable quotes (after fees). Direct
 * same-token routes only produce a None-strategy no-op quote, which is excluded
 * from totals and leaves targetAmount at 0 — fall back to the required token
 * amount only when the destination payment token matches that required token
 * (same-chain mUSD Money Account withdraw). Cross-token routes must not show
 * the source amount as received when the quote is missing.
 */
function ReceiveRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const requiredTokens = useTransactionPayRequiredTokens();
  const { payToken } = useTransactionPayToken();

  const receiveUsd = useMemo(() => {
    const targetAmountUsd = totals?.targetAmount?.usd;
    const targetBn =
      targetAmountUsd == null ? null : new BigNumber(targetAmountUsd);

    if (targetBn?.gt(0)) {
      return formatFiat(targetBn);
    }

    const primaryRequiredToken = (requiredTokens ?? []).find(
      (token) => !token.skipIfBalance,
    );
    const isDirectSameTokenRoute = isSameTokenAddressAndChain(
      primaryRequiredToken,
      payToken,
    );

    if (
      isDirectSameTokenRoute &&
      primaryRequiredToken?.amountUsd &&
      new BigNumber(primaryRequiredToken.amountUsd).gt(0)
    ) {
      return formatFiat(new BigNumber(primaryRequiredToken.amountUsd));
    }

    if (targetBn == null) {
      return '';
    }

    return formatFiat(targetBn);
  }, [formatFiat, payToken, requiredTokens, totals?.targetAmount?.usd]);

  if (isLoading) {
    return <InfoRowSkeleton testId="receive-row-skeleton" />;
  }

  return (
    <View testID="receive-row">
      <InfoRow
        label={strings('confirm.label.you_receive')}
        rowVariant={InfoRowVariant.Small}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={ConfirmationRowComponentIDs.RECEIVE}
        >
          {receiveUsd}
        </Text>
      </InfoRow>
    </View>
  );
}
