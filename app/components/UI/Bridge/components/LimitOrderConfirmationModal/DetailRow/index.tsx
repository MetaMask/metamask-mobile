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

export const DetailRow = ({ label, children }: DetailRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    gap={2}
    paddingHorizontal={4}
    paddingVertical={1}
    testID={DetailRowSelectorsIDs.CONTAINER}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      testID={DetailRowSelectorsIDs.LABEL}
    >
      {label}
    </Text>
    {children}
  </Box>
);
