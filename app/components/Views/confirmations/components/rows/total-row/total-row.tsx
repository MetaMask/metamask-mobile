import React, { useMemo } from 'react';
import InfoRow from '../../UI/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
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
 * The net received amount is the target amount computed by the Transaction Pay
 * controller (after all provider, network, and MetaMask fees), so this row
 * simply renders `totals.targetAmount.usd` rather than re-deriving it from the
 * input amount.
 */
function ReceiveRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();

  const receiveUsd = useMemo(() => {
    const targetAmountUsd = totals?.targetAmount?.usd;

    if (targetAmountUsd == null) return '';

    return formatFiat(new BigNumber(targetAmountUsd));
  }, [totals?.targetAmount?.usd, formatFiat]);

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
