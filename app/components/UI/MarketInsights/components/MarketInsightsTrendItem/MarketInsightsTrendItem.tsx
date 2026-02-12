import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { MarketInsightsTrendItemProps } from './MarketInsightsTrendItem.types';

/**
 * MarketInsightsTrendItem renders a single trend in the "What's driving the price?" section.
 * Shows the trend title and description.
 */
const MarketInsightsTrendItem: React.FC<MarketInsightsTrendItemProps> = ({
  trend,
  testID,
}) => (
  <Box twClassName="px-4 py-3" testID={testID}>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName="mb-2"
    >
      {trend.title}
    </Text>
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {trend.description}
    </Text>
  </Box>
);

export default MarketInsightsTrendItem;
