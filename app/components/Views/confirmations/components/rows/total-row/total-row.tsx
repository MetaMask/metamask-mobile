import React from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { strings } from '../../../../../../../locales/i18n';
import { View } from 'react-native';
import { SkeletonRow } from '../skeleton-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useIsTransactionPayLoading';

export function TotalRow() {
  const { totalFormatted } = useTransactionTotalFiat({ log: true });
  const { isLoading } = useIsTransactionPayLoading();

  if (isLoading) {
    return <SkeletonRow testId="total-row-skeleton" />;
  }

  return (
    <View testID="total-row">
      <InfoRow label={strings('confirm.label.total')}>
        <Text>{totalFormatted}</Text>
      </InfoRow>
    </View>
  );
}
