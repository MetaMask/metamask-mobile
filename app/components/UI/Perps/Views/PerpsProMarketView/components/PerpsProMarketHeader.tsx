import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProMarketHeaderProps {
  symbol?: string;
}

/**
 * Pro-mode market header (nav row + price/24h row).
 *
 * Scaffold only: renders the asset symbol for orientation. The Pro tag,
 * compare/star/settings icons and price/change values are placeholder
 * containers, filled in by later Pro-mode tickets.
 */
const PerpsProMarketHeader = ({ symbol }: PerpsProMarketHeaderProps) => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.HEADER}
    twClassName="px-4 pt-2 pb-2 gap-2"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Text variant={TextVariant.HeadingMd}>{symbol ?? ''}</Text>
      <Box twClassName="h-8 w-28 rounded-lg bg-muted" />
    </Box>
    <Box twClassName="h-6 w-40 rounded-lg bg-muted" />
  </Box>
);

export default PerpsProMarketHeader;
