import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  HeaderRoot,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import FixedTabRow from './FixedTabRow';
import { FixedHubChrome } from './FixedHubChrome';
import HubProfileButton from './HubProfileButton';

interface FixedTabPlaceholderProps {
  title: string;
}

/**
 * Lightweight stand-in for a hub destination that has no screen in this checkout.
 * Gacha Popular, Packs, and Market are not implemented yet.
 */
const FixedTabPlaceholder = ({ title }: FixedTabPlaceholderProps) => (
  <Box
    twClassName="flex-1 bg-default"
    testID={`fixed-tab-placeholder-${title}`}
  >
    <FixedHubChrome>
      <HeaderRoot includesTopInset>
        <HubProfileButton />
      </HeaderRoot>
      <FixedTabRow />
    </FixedHubChrome>
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="flex-1 px-4"
    >
      <Text variant={TextVariant.HeadingMd}>{title}</Text>
    </Box>
  </Box>
);

export default FixedTabPlaceholder;
