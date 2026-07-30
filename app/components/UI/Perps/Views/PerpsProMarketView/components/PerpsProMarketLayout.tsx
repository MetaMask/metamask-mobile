import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProMarketLayoutProps {
  orderForm: ReactNode;
  orderBook: ReactNode;
  /**
   * When true, the order-book column and divider are hidden so the order form
   * expands to full width. The order form itself renders the control that
   * restores the book (Figma: order-book icon beside the direction control).
   *
   * Collapse unmounts the order-book panel (subscriptions disconnect). On
   * expand, session-only UI state in that panel — list currency, metric, and
   * view mode — resets to defaults. Price grouping is unchanged because it is
   * persisted per market separately from this layout.
   */
  isOrderBookCollapsed?: boolean;
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
  orderBookGroup: {
    flexDirection: 'row',
  },
});

/**
 * Two-column trading area for the Pro-mode market screen.
 *
 * Matches the current Figma layout: the order form fills the left column and
 * the order book occupies the fixed-width right column. Configurable panel
 * positioning is deferred until the rearrangeable-layout feature consumes the
 * controller preferences.
 *
 * The 16px screen-edge inset is applied once here (`px-4` on the row), not
 * by either column individually — Figma's own two-column section is inset
 * this way, with both inner columns at `px-0`. Applying it per-column would
 * double the gap next to the divider (column padding + divider width).
 *
 * When the book is collapsed, `{orderBook}` is not rendered so the panel
 * unmounts and live order-book sockets disconnect. That remount-on-expand
 * path intentionally drops session-only book preferences (currency, metric,
 * view mode); persisted grouping survives via `usePerpsOrderBookGrouping`.
 */
const PerpsProMarketLayout = ({
  orderForm,
  orderBook,
  isOrderBookCollapsed = false,
}: PerpsProMarketLayoutProps) => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.LAYOUT}
    flexDirection={BoxFlexDirection.Row}
    twClassName="px-2"
    style={styles.container}
  >
    <Animated.View
      testID={PerpsProMarketViewSelectorsIDs.LEFT_COLUMN}
      style={styles.orderFormColumn}
      layout={LinearTransition.duration(AnimationDuration.Fast)}
    >
      {orderForm}
    </Animated.View>
    {/* Omit the column while collapsed: unmount disconnects subscriptions.
        The fade in/out is purely visual — Reanimated still lets React unmount
        the column immediately, it just keeps the last frame on screen for the
        exit animation's duration. */}
    {!isOrderBookCollapsed ? (
      <Animated.View
        style={styles.orderBookGroup}
        entering={FadeIn.duration(AnimationDuration.Fast)}
        exiting={FadeOut.duration(AnimationDuration.Fast)}
      >
        <Box
          testID={PerpsProMarketViewSelectorsIDs.VERTICAL_DIVIDER}
          twClassName="items-center"
          style={styles.dividerColumn}
        >
          <Box
            twClassName="flex-1 bg-border-muted"
            style={styles.dividerLine}
          />
        </Box>
        <Box
          testID={PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN}
          style={styles.orderBookColumn}
        >
          {orderBook}
        </Box>
      </Animated.View>
    ) : null}
  </Box>
);

export default PerpsProMarketLayout;
