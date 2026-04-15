import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyHowItWorksTestIds } from './MoneyHowItWorks.testIds';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';

interface MoneyHowItWorksProps {
  onHeaderPress?: () => void;
}

const MoneyHowItWorks = ({ onHeaderPress }: MoneyHowItWorksProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyHowItWorksTestIds.CONTAINER}>
    <MoneySectionHeader
      title={strings('money.how_it_works.title')}
      onPress={onHeaderPress}
    />

    <Box twClassName="mt-3">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={MoneyHowItWorksTestIds.DESCRIPTION}
      >
        {strings('money.how_it_works.description_prefix')}
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
          testID={MoneyHowItWorksTestIds.APY}
        >
          {strings('money.apy_label', {
            percentage: String(MUSD_CONVERSION_APY),
          })}
        </Text>
        {strings('money.how_it_works.description_suffix')}
      </Text>
    </Box>
  </Box>
);

export default MoneyHowItWorks;
