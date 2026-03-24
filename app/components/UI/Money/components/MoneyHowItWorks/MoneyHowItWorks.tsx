import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
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
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import type { ImageOrSvgSrc } from '@metamask/design-system-react-native/dist/components/temp-components/ImageOrSvg/ImageOrSvg.types.d.cts';

interface MoneyHowItWorksProps {
  onAddMusdPress?: () => void;
  onHeaderPress?: () => void;
}

const MoneyHowItWorks = ({
  onAddMusdPress = () => undefined,
  onHeaderPress,
}: MoneyHowItWorksProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyHowItWorksTestIds.CONTAINER}>
    <MoneySectionHeader
      title={strings('money.how_it_works.title')}
      onPress={onHeaderPress}
    />

    <Box twClassName="mt-3">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('money.how_it_works.description')}
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
        <AvatarToken
          name={MUSD_TOKEN.symbol}
          src={MUSD_TOKEN.imageSource as ImageOrSvgSrc}
          size={AvatarTokenSize.Lg}
        />
        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {MUSD_TOKEN.name}
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
        onPress={onAddMusdPress}
        testID={MoneyHowItWorksTestIds.ADD_MUSD_BUTTON}
      >
        {strings('money.how_it_works.add')}
      </Button>
    </Box>
  </Box>
);

export default MoneyHowItWorks;
