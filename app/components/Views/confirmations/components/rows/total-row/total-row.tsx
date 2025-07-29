import React from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionRequiredFiat } from '../../../hooks/pay/useTransactionRequiredFiat';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';

export function TotalRow() {
  const formatFiat = useFiatFormatter();
  const { totalWithBalanceFiat } = useTransactionRequiredFiat();

  const formattedTotal = formatFiat(new BigNumber(totalWithBalanceFiat));

  return (
    <InfoSection>
      <InfoRow label="Total">
        <Text>{formattedTotal}</Text>
      </InfoRow>
    </InfoSection>
  );
}
