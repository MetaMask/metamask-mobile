import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

interface FixedTabPlaceholderProps {
  title: string;
}

/**
 * Lightweight stand-in for a hub destination that has no screen in this checkout.
 * Gacha Popular, Packs, and Market are not implemented yet.
 */
const FixedTabPlaceholder = ({ title }: FixedTabPlaceholderProps) => (
  <Box
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="flex-1 bg-default px-4"
    testID={`fixed-tab-placeholder-${title}`}
  >
    <Text variant={TextVariant.HeadingMd}>{title}</Text>
  </Box>
);

export default FixedTabPlaceholder;
