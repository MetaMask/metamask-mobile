import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import type { PerpsProLayoutConfig } from '../PerpsProMarketView.types';

interface PerpsProMarketLayoutProps {
  orderForm: ReactNode;
  orderBook: ReactNode;
  config: PerpsProLayoutConfig;
}

const styles = StyleSheet.create({
  dividerColumn: {
    width: 24,
  },
  dividerLine: {
    width: 1,
  },
  rightColumn: {
    width: 132,
  },
});

/**
 * Two-column trading area for the Pro-mode market screen.
 *
 * Places the order form and order book panels into the left/right columns
 * based on `config`, with a vertical divider between them. Making placement
 * data-driven keeps the panels position-agnostic so a future
 * container-position feature (fed by `proLayoutPreferences`) only needs to
 * change the config, not the panels.
 */
const PerpsProMarketLayout = ({
  orderForm,
  orderBook,
  config,
}: PerpsProMarketLayoutProps) => {
  const orderFormIsLeft = config.orderFormPosition === 'left';
  const leftPanel = orderFormIsLeft ? orderForm : orderBook;
  const rightPanel = orderFormIsLeft ? orderBook : orderForm;

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.LAYOUT}
      flexDirection={BoxFlexDirection.Row}
      twClassName="px-4"
    >
      <Box twClassName="flex-1">{leftPanel}</Box>
      <Box twClassName="items-center" style={styles.dividerColumn}>
        <Box twClassName="flex-1 bg-border-muted" style={styles.dividerLine} />
      </Box>
      <Box style={styles.rightColumn}>{rightPanel}</Box>
    </Box>
  );
};

export default PerpsProMarketLayout;
