import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { selectTransactionBridgeQuotesById } from '../../../../../../core/redux/slices/confirmationMetrics';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import Text from '../../../../../../component-library/components/Texts/Text';
import { SkeletonRow } from '../skeleton-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useIsTransactionPayLoading';

const SAME_CHAIN_DURATION_SECONDS = 2;

export function BridgeTimeRow() {
  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { isLoading } = useIsTransactionPayLoading();

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const showEstimate = isLoading || Boolean(quotes?.length);

  const estimatedTimeSeconds = quotes?.reduce(
    (acc, quote) => acc + quote.estimatedProcessingTimeInSeconds,
    0,
  );

  const isSameChainPayment = (quotes ?? []).some(
    (quote) => quote.quote.srcChainId === quote.quote.destChainId,
  );

  if (!showEstimate) {
    return null;
  }

  if (isLoading) {
    return <SkeletonRow testId="bridge-time-row-skeleton" />;
  }

  return (
    <InfoRow label={strings('confirm.label.bridge_estimated_time')}>
      <Text>
        {formatSeconds(estimatedTimeSeconds ?? 0, isSameChainPayment)}
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
