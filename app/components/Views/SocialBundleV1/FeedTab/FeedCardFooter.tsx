import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import type { FeedFooter } from './mocks/types';

interface FeedCardFooterProps {
  footer: FeedFooter;
}

const CounterButton: React.FC<{
  icon: IconName;
  count: number;
  onPress: () => void;
}> = ({ icon, count, onPress }) => {
  const tw = useTailwind();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        style={tw.style('gap-1.5')}
      >
        <Icon
          name={icon}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {count}
        </Text>
      </Box>
    </Pressable>
  );
};

/**
 * Like / comment / repost counter row rendered under every card. All buttons
 * are `Pressable` no-ops in this prototype PR — they only report touch
 * feedback for now.
 */
const FeedCardFooter: React.FC<FeedCardFooterProps> = ({ footer }) => {
  const tw = useTailwind();
  const noop = useCallback(() => undefined, []);
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      style={tw.style('gap-6 pt-3')}
    >
      <CounterButton
        icon={IconName.Heart}
        count={footer.likes}
        onPress={noop}
      />
      <CounterButton
        icon={IconName.Messages}
        count={footer.comments}
        onPress={noop}
      />
      <CounterButton
        icon={IconName.Refresh}
        count={footer.reposts}
        onPress={noop}
      />
    </Box>
  );
};

export default FeedCardFooter;
