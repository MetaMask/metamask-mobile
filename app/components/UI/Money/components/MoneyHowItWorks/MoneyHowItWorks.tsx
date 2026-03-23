import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyHowItWorksTestIds } from './MoneyHowItWorks.testIds';
import { MUSD_CONVERSION_APY, MUSD_TOKEN } from '../../../Earn/constants/musd';

interface MoneyHowItWorksProps {
  onGetMusdPress?: () => void;
  onHeaderPress?: () => void;
}

const MoneyHowItWorks = ({
  onGetMusdPress = () => undefined,
  onHeaderPress,
}: MoneyHowItWorksProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyHowItWorksTestIds.CONTAINER}>
    <MoneySectionHeader
      title={strings('money.how_it_works.title')}
      onPress={onHeaderPress}
    />

    <Box twClassName="mt-3">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('money.how_it_works.description_prefix')}
        <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
          {strings('money.apy_label', { percentage: MUSD_CONVERSION_APY })}
        </Text>
        {strings('money.how_it_works.description_suffix')}
      </Text>
    </Box>

    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="mt-3 py-3"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 gap-4"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-10 w-10 rounded-full bg-muted"
        >
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            m$
          </Text>
        </Box>
        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {/* TODO: Probably don't need to MetaMask USD translated since it's the same across locales. */}
            {strings('money.how_it_works.musd_name')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {MUSD_TOKEN.symbol}
          </Text>
        </Box>
      </Box>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={onGetMusdPress}
        testID={MoneyHowItWorksTestIds.GET_MUSD_BUTTON}
      >
        {strings('money.how_it_works.get_musd')}
      </Button>
    </Box>
  </Box>
);

export default MoneyHowItWorks;
