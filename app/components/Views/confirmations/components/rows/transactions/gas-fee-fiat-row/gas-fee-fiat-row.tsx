import React from 'react';
import Text from '../../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../../UI/info-row';
import { strings } from '../../../../../../../../locales/i18n';
import { useTransactionTotalFiat } from '../../../../hooks/pay/useTransactionTotalFiat';
import { useSelector } from 'react-redux';
import { selectIsTransactionBridgeQuotesLoadingById } from '../../../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../../../reducers';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../../UI/AnimatedSpinner';

export function GasFeeFiatRow() {
  const { id: transactionId } = useTransactionMetadataRequest() ?? {};
  const { totalNativeEstimatedFormatted } = useTransactionTotalFiat();

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId ?? ''),
  );

  return (
    <InfoRow label={strings('transactions.network_fee')}>
      {isQuotesLoading && <AnimatedSpinner size={SpinnerSize.SM} />}
      {!isQuotesLoading && <Text>{totalNativeEstimatedFormatted}</Text>}
    </InfoRow>
  );
}
