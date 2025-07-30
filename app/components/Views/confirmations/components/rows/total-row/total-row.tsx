import React from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionRequiredFiat } from '../../../hooks/pay/useTransactionRequiredFiat';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { useConfirmationContext } from '../../../context/confirmation-context';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';

export function TotalRow() {
  const formatFiat = useFiatFormatter();
  const { totalWithBalanceFiat } = useTransactionRequiredFiat();
  const { quotesLoading } = useConfirmationContext();

  const formattedTotal = formatFiat(new BigNumber(totalWithBalanceFiat));

  return (
    <InfoSection>
      <InfoRow label="Total">
        {quotesLoading ? (
          <AnimatedSpinner size={SpinnerSize.SM} />
        ) : (
          <Text>{formattedTotal}</Text>
        )}
      </InfoRow>
    </InfoSection>
  );
}
