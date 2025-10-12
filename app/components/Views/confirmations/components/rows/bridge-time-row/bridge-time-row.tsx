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

export function BridgeTimeRow() {
  const { id: transactionId } = useTransactionMetadataOrThrow();

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionPayLoadingByTransactionId(state, transactionId),
  );

  const totals = useSelector((state: RootState) =>
    selectTransactionPayTotalsByTransactionId(state, transactionId),
  );

  const quotes = useSelector((state: RootState) =>
    selectTransactionPayQuotesByTransactionId(state, transactionId),
  );

  const showEstimate = isQuotesLoading || Boolean(quotes?.length);

  if (!showEstimate) {
    return null;
  }

  if (isQuotesLoading) {
    return <SkeletonRow testId="bridge-time-row-skeleton" />;
  }

  return (
    <InfoRow label={strings('confirm.label.bridge_estimated_time')}>
      <Text>
        {totals?.estimatedDuration} {strings('unit.second')}
      </Text>
    </InfoRow>
  );
}
