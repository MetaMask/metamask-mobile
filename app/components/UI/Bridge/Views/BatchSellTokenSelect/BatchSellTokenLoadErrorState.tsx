import React from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import { BatchSellTokenSelectSelectorsIDs } from './BatchSellTokenSelect.testIds';

export function BatchSellTokenLoadErrorState() {
  const tw = useTailwind();

  return (
    <Box
      testID={BatchSellTokenSelectSelectorsIDs.ERROR_STATE}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={3}
      twClassName="flex-1 px-4 py-4"
    >
      <Image
        source={emptyStateDefiLight}
        resizeMode="contain"
        style={tw.style('h-[72px] w-[72px]')}
      />
      <Box alignItems={BoxAlignItems.Center} gap={2} twClassName="px-4">
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          twClassName="w-[240px] text-center"
        >
          {strings('bridge.batch_sell_token_load_error_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="w-[240px] text-center"
        >
          {strings('bridge.batch_sell_token_load_error_description')}
        </Text>
      </Box>
    </Box>
  );
}
