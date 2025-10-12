import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import Text from '../../../../../../component-library/components/Texts/Text';
import { SkeletonRow } from '../skeleton-row';
import {
  selectIsTransactionPayLoadingByTransactionId,
  selectTransactionPayQuotesByTransactionId,
  selectTransactionPayTotalsByTransactionId,
} from '../../../../../../selectors/transactionPayController';

const SAME_CHAIN_DURATION_SECONDS = 2;

export function BridgeTimeRow() {
  const { id: transactionId } = useTransactionMetadataOrThrow();

  const isLoading = useSelector((state: RootState) =>
    selectIsTransactionPayLoadingByTransactionId(state, transactionId),
  );

  const { estimatedDuration } =
    useSelector((state: RootState) =>
      selectTransactionPayTotalsByTransactionId(state, transactionId),
    ) ?? {};

  const quotes = useSelector((state: RootState) =>
    selectTransactionPayQuotesByTransactionId(state, transactionId),
  );

  const showEstimate = isLoading || Boolean(quotes?.length);

  if (!showEstimate) {
    return null;
  }

  if (isLoading || estimatedDuration === undefined) {
    return <SkeletonRow testId="bridge-time-row-skeleton" />;
  }

  const formattedSeconds = formatSeconds(estimatedDuration, false);

  return (
    <InfoRow label={strings('confirm.label.bridge_estimated_time')}>
      <Text>{formattedSeconds}</Text>
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
