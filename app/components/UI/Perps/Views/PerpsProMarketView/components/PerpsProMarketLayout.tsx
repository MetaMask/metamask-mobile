import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProMarketLayoutProps {
  orderForm: ReactNode;
  orderBook: ReactNode;
}

const PRO_TRADING_AREA_MIN_HEIGHT = 682;
const PRO_DIVIDER_COLUMN_WIDTH = 24;
const PRO_ORDER_BOOK_COLUMN_WIDTH = 132;

const styles = StyleSheet.create({
  container: {
    minHeight: PRO_TRADING_AREA_MIN_HEIGHT,
  },
  dividerColumn: {
    width: PRO_DIVIDER_COLUMN_WIDTH,
  },
  dividerLine: {
    width: 1,
  },
  orderFormColumn: {
    flex: 1,
  },
  orderBookColumn: {
    width: PRO_ORDER_BOOK_COLUMN_WIDTH,
  },
});

/**
 * Two-column trading area for the Pro-mode market screen.
 *
 * Matches the current Figma layout: the order form fills the left column and
 * the order book occupies the fixed-width right column. Configurable panel
 * positioning is deferred until the rearrangeable-layout feature consumes the
 * controller preferences.
 */
const PerpsProMarketLayout = ({
  orderForm,
  orderBook,
}: PerpsProMarketLayoutProps) => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.LAYOUT}
    flexDirection={BoxFlexDirection.Row}
    twClassName="px-4"
    style={styles.container}
  >
    <Box
      testID={PerpsProMarketViewSelectorsIDs.LEFT_COLUMN}
      style={styles.orderFormColumn}
    >
      {orderForm}
    </Box>
    <Box
      testID={PerpsProMarketViewSelectorsIDs.VERTICAL_DIVIDER}
      twClassName="items-center"
      style={styles.dividerColumn}
    >
      <Box twClassName="flex-1 bg-border-muted" style={styles.dividerLine} />
    </Box>
    <Box
      testID={PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN}
      style={styles.orderBookColumn}
    >
      {orderBook}
    </Box>
  </Box>
);

export default PerpsProMarketLayout;
