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
import {
  getNormalizedHandle,
  formatRelativeTime,
} from '../../utils/marketInsightsFormatting';

const MarketInsightsTweetCard: React.FC<MarketInsightsTweetCardProps> = ({
  tweet,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const timeAgo = useMemo(() => formatRelativeTime(tweet.date), [tweet.date]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style('rounded-2xl bg-muted p-4', pressed && 'opacity-80')
      }
      testID={testID}
    >
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
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
          gap={1}
          twClassName="flex-1"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {getNormalizedHandle(tweet.author)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {'•'}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {timeAgo}
          </Text>
        </Box>
        <Icon
          name={IconName.X}
          size={IconSize.Sm}
          color={IconColor.IconDefault}
        />
      </Box>
    </Pressable>
  );
};

export default MarketInsightsTweetCard;
