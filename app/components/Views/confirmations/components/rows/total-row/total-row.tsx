import React from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';

export function TotalRow() {
  const { formatted: totalFiat } = useTransactionTotalFiat();

  return (
    <InfoSection>
      <InfoRow label={'Total'}>
        <Text>{totalFiat}</Text>
      </InfoRow>
    </InfoSection>
  );
}
