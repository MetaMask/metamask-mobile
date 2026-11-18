import React from 'react';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import InfoRow from '../../UI/info-row';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

const SAME_CHAIN_DURATION_SECONDS = '< 10';

export function BridgeTimeRow() {
  const isLoading = useIsTransactionPayLoading();
  const { estimatedDuration } = useTransactionPayTotals() ?? {};
  const quotes = useTransactionPayQuotes();
  const { payToken } = useTransactionPayToken();
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId } = transactionMetadata ?? {};
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();
  const isMoneyAccountDeposit = hasTransactionType(transactionMetadata, [
    TransactionType.moneyAccountDeposit,
  ]);

  const isSameChain = payToken?.chainId != null && payToken.chainId === chainId;

  const showEstimate =
    (isLoading || Boolean(quotes?.length) || isSameChain) &&
    !selectedFiatPaymentMethod;

  if (!showEstimate) {
    return null;
  }

  if (isLoading) {
    return <InfoRowSkeleton testId="bridge-time-row-skeleton" />;
  }
  const formattedSeconds = formatSeconds(
    estimatedDuration ?? 0,
    isSameChain,
    isMoneyAccountDeposit,
  );

  return (
    <InfoRow
      label={strings('confirm.label.bridge_estimated_time')}
      rowVariant={InfoRowVariant.Small}
    >
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={ConfirmationRowComponentIDs.BRIDGE_TIME}
      >
        {formattedSeconds}
      </Text>
    </InfoRow>
  );
}

function formatSeconds(
  seconds: number,
  isSameChainPayment: boolean,
  isMoneyAccountDeposit: boolean,
) {
  if (isMoneyAccountDeposit) {
    if (isSameChainPayment || seconds <= 30) {
      return strings('confirm.money_deposit.less_than_one_min');
    }
  }

  if (isSameChainPayment) {
    return `${SAME_CHAIN_DURATION_SECONDS} ${strings('unit.second')}`;
  }

  if (seconds <= 30) {
    return `< 1 ${strings('unit.minute')}`;
  }

  if (seconds <= 60) {
    return `1 ${strings('unit.minute')}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${strings('unit.minute')}`;
}
