import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import InfoRow from '../../UI/info-row';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { ConfirmationRowComponentIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';

const SAME_CHAIN_DURATION_SECONDS = '< 10';

const HIDE_TYPES = [TransactionType.musdConversion];

export function BridgeTimeRow() {
  const isLoading = useIsTransactionPayLoading();
  const { estimatedDuration } = useTransactionPayTotals() ?? {};
  const quotes = useTransactionPayQuotes();
  const { payToken } = useTransactionPayToken();
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId } = transactionMetadata ?? {};

  const showEstimate =
    !hasTransactionType(transactionMetadata, HIDE_TYPES) &&
    (isLoading || Boolean(quotes?.length));

  if (!showEstimate) {
    return null;
  }

  if (isLoading) {
    return <InfoRowSkeleton testId="bridge-time-row-skeleton" />;
  }

  const isSameChain = payToken?.chainId === chainId;
  const formattedSeconds = formatSeconds(estimatedDuration ?? 0, isSameChain);

  return (
    <InfoRow
      label={strings('confirm.label.bridge_estimated_time')}
      rowVariant={InfoRowVariant.Small}
    >
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        testID={ConfirmationRowComponentIDs.BRIDGE_TIME}
      >
        {formattedSeconds}
      </Text>
    </InfoRow>
  );
}

function formatSeconds(seconds: number, isSameChainPayment: boolean) {
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
