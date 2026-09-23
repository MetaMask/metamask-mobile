import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { DetailRowSelectorsIDs } from './testIds';
import type { DetailRowProps } from './types';

export const DetailRow = ({
  label,
  labelAccessory,
  children,
  testID = DetailRowSelectorsIDs.CONTAINER,
  hidden,
  error,
}: DetailRowProps) => {
  if (hidden) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={2}
      paddingHorizontal={4}
      paddingVertical={1}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={error ? TextColor.ErrorAlternative : TextColor.TextAlternative}
          testID={DetailRowSelectorsIDs.LABEL}
        >
          {label}
        </Text>
        {labelAccessory}
      </Box>
      {children}
    </Box>
  );
};
