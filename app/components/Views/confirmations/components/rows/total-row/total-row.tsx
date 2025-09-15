import React from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { selectIsTransactionBridgeQuotesLoadingById } from '../../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../../reducers';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import { View } from 'react-native';
import { SkeletonRow } from '../skeleton-row';

export function TotalRow() {
  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { totalFormatted } = useTransactionTotalFiat({ log: true });

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  if (isQuotesLoading) {
    return <SkeletonRow testId="total-row-skeleton" />;
  }

  return (
    <View testID="total-row">
      <InfoRow label={strings('confirm.label.total')}>
        {isQuotesLoading ? (
          <AnimatedSpinner size={SpinnerSize.SM} />
        ) : (
          <Text>{totalFormatted}</Text>
        )}
      </InfoRow>
    </View>
  );
}
