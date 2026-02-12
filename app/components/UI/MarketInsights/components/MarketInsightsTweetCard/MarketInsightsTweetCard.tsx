import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { MarketInsightsTweetCardProps } from './MarketInsightsTweetCard.types';

// TODO: Move to a shared utility file.
const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// MarketInsightsTweetCard renders a social media post card.
const MarketInsightsTweetCard: React.FC<MarketInsightsTweetCardProps> = ({
  tweet,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const relativeTime = useMemo(
    () => getRelativeTime(tweet.date),
    [tweet.date],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style('rounded-2xl bg-muted p-3', pressed && 'opacity-80')
      }
      testID={testID}
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-3"
      >
        {tweet.contentSummary}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {tweet.author}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {relativeTime}
          </Text>
        </Box>
        <Icon
          name={IconName.X}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Pressable>
  );
};

export default MarketInsightsTweetCard;
