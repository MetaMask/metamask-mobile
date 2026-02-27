import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { MarketInsightsTweetCardProps } from './MarketInsightsTweetCard.types';
import { getNormalizedHandle } from '../../utils/marketInsightsFormatting';

// MarketInsightsTweetCard renders a social media post card.
const MarketInsightsTweetCard: React.FC<MarketInsightsTweetCardProps> = ({
  tweet,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

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
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {getNormalizedHandle(tweet.author)}
        </Text>
      </Box>
    </Pressable>
  );
};

export default MarketInsightsTweetCard;
