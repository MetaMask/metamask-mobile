import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import {
  resolvePerpsProLayoutConfig,
  type PerpsProLayoutConfig,
} from '../PerpsProMarketView.types';

interface PerpsProMarketLayoutProps {
  orderForm: ReactNode;
  orderBook: ReactNode;
  config: PerpsProLayoutConfig;
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
  const resolvedConfig = resolvePerpsProLayoutConfig(config);
  const orderFormIsLeft = resolvedConfig.orderFormPosition === 'left';
  const leftPanel = orderFormIsLeft ? orderForm : orderBook;
  const rightPanel = orderFormIsLeft ? orderBook : orderForm;
  const leftColumnStyle = orderFormIsLeft
    ? styles.orderFormColumn
    : styles.orderBookColumn;
  const rightColumnStyle = orderFormIsLeft
    ? styles.orderBookColumn
    : styles.orderFormColumn;

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.LAYOUT}
      flexDirection={BoxFlexDirection.Row}
      twClassName="px-4"
      style={styles.container}
    >
      <Box
        testID={PerpsProMarketViewSelectorsIDs.LEFT_COLUMN}
        style={leftColumnStyle}
      >
        {leftPanel}
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
        style={rightColumnStyle}
      >
        {rightPanel}
      </Box>
    </Box>
  );
};

export default PerpsProMarketLayout;
