import { AnimationDuration } from '@metamask/design-tokens';
import type { ProLayoutPreferences } from '@metamask/perps-controller';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useStyles } from '../../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import { createStyles } from './PerpsProMarketLayout.styles';

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
  /**
   * Side the order-book column is pinned to, from the user's persisted
   * preference. Only the column order changes; widths and the divider are the
   * same either way. Required so a caller cannot silently pin a side.
   */
  orderBookPosition: ProLayoutPreferences['orderBookPosition'];
}

/**
 * Two-column trading area for the Pro-mode market screen.
 *
 * Uses an 8px (`px-2`) screen-edge inset aligned with the positions panel.
 */
const PerpsProMarketLayout = ({
  orderForm,
  orderBook,
  isOrderBookCollapsed = false,
  orderBookPosition,
}: PerpsProMarketLayoutProps) => {
  const { styles } = useStyles(createStyles);

  // Keyed so a side swap moves each column rather than remounting both, which
  // would drop the order book's socket and the order form's in-progress input.
  const orderFormColumn = (
    <Animated.View
      key="order-form"
      testID={PerpsProMarketViewSelectorsIDs.ORDER_FORM_COLUMN}
      style={styles.orderFormColumn}
      layout={LinearTransition.duration(AnimationDuration.Fast)}
    >
      {orderForm}
    </Animated.View>
  );

  const orderBookColumn = !isOrderBookCollapsed ? (
    <Animated.View
      key="order-book"
      testID={PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLUMN}
      style={styles.orderBookColumn}
      entering={FadeIn.duration(AnimationDuration.Fast)}
      exiting={FadeOut.duration(AnimationDuration.Fast)}
    >
      {orderBook}
    </Animated.View>
  ) : null;

  const columns =
    orderBookPosition === 'left'
      ? [orderBookColumn, orderFormColumn]
      : [orderFormColumn, orderBookColumn];

  return (
    <View
      testID={PerpsProMarketViewSelectorsIDs.LAYOUT}
      style={styles.container}
    >
      {columns[0]}
      {orderBookColumn ? <View style={styles.columnDivider} /> : null}
      {columns[1]}
    </View>
  );
};

export default PerpsProMarketLayout;
