import React from 'react';
import { Pressable } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { MoneyMusdTokenRowTestIds } from './MoneyMusdTokenRow.testIds';
import type { ImageOrSvgSrc } from '@metamask/design-system-react-native/dist/components/temp-components/ImageOrSvg/ImageOrSvg.types.d.cts';

interface MoneyMusdTokenRowProps {
  /**
   * Handler fired when the row is tapped. Navigates to the mUSD asset detail
   * page.
   */
  onPress?: () => void;
  /**
   * Handler fired when the Add button is tapped. Opens the Add money action
   * sheet (MUSD-487).
   */
  onAddPress?: () => void;
}

const MoneyMusdTokenRow = ({ onPress, onAddPress }: MoneyMusdTokenRowProps) => (
  <Pressable onPress={onPress} testID={MoneyMusdTokenRowTestIds.CONTAINER}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3 gap-4"
    >
      <AvatarToken
        name={MUSD_TOKEN.symbol}
        src={MUSD_TOKEN.imageSource as ImageOrSvgSrc}
        size={AvatarTokenSize.Md}
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
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={onAddPress}
        testID={MoneyMusdTokenRowTestIds.ADD_BUTTON}
      >
        {strings('money.musd_row.add')}
      </Button>
    </Box>
  </Pressable>
);

export default MoneyMusdTokenRow;
