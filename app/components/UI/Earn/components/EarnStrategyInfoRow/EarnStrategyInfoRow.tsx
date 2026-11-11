import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { EarnStrategyInfoRowProps } from './EarnStrategyInfoRow.types';

const EarnStrategyInfoRow = ({
  text,
  startAccessory,
  testID,
}: EarnStrategyInfoRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    testID={testID}
  >
    {startAccessory ? <Box twClassName="mr-3">{startAccessory}</Box> : null}
    <Box twClassName="min-w-0 flex-1">
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {text}
      </Text>
    </Box>
  </Box>
);

export default EarnStrategyInfoRow;
