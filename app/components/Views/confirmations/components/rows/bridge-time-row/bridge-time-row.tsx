import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import Text from '../../../../../../component-library/components/Texts/Text';
import { SkeletonRow } from '../skeleton-row';

export function BridgeTimeRow() {
  const { id: transactionId } = useTransactionMetadataOrThrow();

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const showEstimate = isQuotesLoading || Boolean(quotes?.length);

  const estimatedTimeSeconds = quotes?.reduce(
    (acc, quote) => acc + quote.estimatedProcessingTimeInSeconds,
    0,
  );

  if (!showEstimate) {
    return null;
  }

  if (isQuotesLoading) {
    return <SkeletonRow testId="bridge-time-row-skeleton" />;
  }

  return (
    <InfoRow label={strings('confirm.label.bridge_estimated_time')}>
      <Text>
        {estimatedTimeSeconds} {strings('unit.second')}
      </Text>
    </InfoRow>
  );
}
