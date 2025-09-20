import React from 'react';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { strings } from '../../../../../../../locales/i18n';

export function BridgeFeeRow() {
  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { bridgeFeeFormatted } = useTransactionTotalFiat();

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const show = isQuotesLoading || Boolean(quotes?.length);

  if (!show) {
    return null;
  }

  return (
    <InfoRow label={strings('confirm.label.bridge_fee')}>
      {isQuotesLoading ? (
        <AnimatedSpinner size={SpinnerSize.SM} />
      ) : (
        <Text>{bridgeFeeFormatted}</Text>
      )}
    </InfoRow>
  );
}
