import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { BreakdownRowProps } from './BreakdownRow.types';

const BreakdownRow = ({
  title,
  subtitle,
  value,
  testID,
  valueColor = TextColor.TextDefault,
}: BreakdownRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="gap-x-4"
    testID={testID}
  >
    <Box twClassName="flex-1 gap-y-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {subtitle}
      </Text>
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      color={valueColor}
    >
      {value}
    </Text>
  </Box>
);

export default BreakdownRow;
