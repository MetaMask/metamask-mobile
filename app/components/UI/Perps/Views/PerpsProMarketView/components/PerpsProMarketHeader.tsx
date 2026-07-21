import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProMarketHeaderProps {
  symbol: string;
}

const styles = StyleSheet.create({
  container: {
    height: 64,
  },
});

/**
 * Fixed Pro-mode market header.
 *
 * Scaffold only: renders the normalized asset symbol for orientation. Header
 * actions remain placeholders until their owning capability is implemented.
 */
const PerpsProMarketHeader = ({ symbol }: PerpsProMarketHeaderProps) => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.HEADER}
    twClassName="px-4"
    style={styles.container}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
  >
    <Text
      testID={PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL}
      variant={TextVariant.HeadingMd}
    >
      {symbol}
    </Text>
    <Box twClassName="h-8 w-28 rounded-lg bg-muted" />
  </Box>
);

export default PerpsProMarketHeader;
