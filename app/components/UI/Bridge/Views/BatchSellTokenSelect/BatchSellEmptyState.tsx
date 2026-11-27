import React from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import { BatchSellTokenSelectSelectorsIDs } from './BatchSellTokenSelect.testIds';

interface BatchSellEmptyStateProps {
  onExploreTokensPress: () => void;
}

export function BatchSellEmptyState({
  onExploreTokensPress,
}: BatchSellEmptyStateProps) {
  const tw = useTailwind();

  return (
    <Box
      testID={BatchSellTokenSelectSelectorsIDs.EMPTY_STATE}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={3}
      className="flex-1 p-4"
    >
      <Image
        source={emptyStateDefiLight}
        resizeMode="contain"
        style={tw.style('h-[72px] w-[72px]')}
      />
      <Box alignItems={BoxAlignItems.Center} gap={3} className="px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          className="w-[240px] text-center"
        >
          {strings('bridge.batch_sell_empty_state_description')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={onExploreTokensPress}
          className="self-center"
          testID={BatchSellTokenSelectSelectorsIDs.EXPLORE_TOKENS_BUTTON}
        >
          {strings('bridge.explore_tokens')}
        </Button>
      </Box>
    </Box>
  );
}
