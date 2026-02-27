import React from 'react';
import InfoRow, { InfoRowSkeleton } from '../../UI/info-row/info-row';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { MUSD_TOKEN } from '../../../../../UI/Earn/constants/musd';
import { strings } from '../../../../../../../locales/i18n';

interface RateRowProps {
  tokenSymbol: string;
  isLoading: boolean;
}

const RateRowTestIds = {
  CONTAINER: 'rate-row-container',
  SKELETON: 'rate-row-skeleton',
} as const;

export function RateRow({ tokenSymbol, isLoading }: RateRowProps) {
  if (isLoading) {
    return <InfoRowSkeleton testId={RateRowTestIds.SKELETON} />;
  }

  return (
    <InfoRow
      label={strings('earn.musd_conversion.rate')}
      testID={RateRowTestIds.CONTAINER}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {`1 ${tokenSymbol} = 1 ${MUSD_TOKEN.symbol}`}
      </Text>
    </InfoRow>
  );
}
