import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface OrderDataRowProps {
  label: string;
  value: string;
  testID?: string;
  valueColor?: TextColor;
  bold?: boolean;
}

/** One labelled value row shared by the quoted Order Preview and the Order
 * Receipt presentations. */
export const OrderDataRow = ({
  label,
  value,
  testID,
  valueColor,
  bold = false,
}: OrderDataRowProps) => (
  <Box twClassName="flex-row items-center justify-between gap-4">
    <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={bold ? FontWeight.Bold : FontWeight.Medium}
      color={valueColor}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);
