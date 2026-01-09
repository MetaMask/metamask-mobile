import React from 'react';
import InfoRow from '../../UI/info-row';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';

// TODO: Add tests
export function EarningPercentageRow() {
  const isLoading = useIsTransactionPayLoading();

  if (isLoading) {
    return <InfoRowSkeleton testId="earning-percentage-row-skeleton" />;
  }

  return (
    <InfoRow label="Earning">
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {MUSD_CONVERSION_APY}%
      </Text>
    </InfoRow>
  );
}
