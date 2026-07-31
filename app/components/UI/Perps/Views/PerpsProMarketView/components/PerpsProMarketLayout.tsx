import { AnimationDuration } from '@metamask/design-tokens';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import styles from './PerpsProMarketLayout.styles';

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

/**
 * Two-column trading area for the Pro-mode market screen.
 *
 * Uses an 8px (`px-2`) screen-edge inset aligned with the positions panel.
 */
const PerpsProMarketLayout = ({
  orderForm,
  orderBook,
  isOrderBookCollapsed = false,
}: PerpsProMarketLayoutProps) => (
  <View testID={PerpsProMarketViewSelectorsIDs.LAYOUT} style={styles.container}>
    <Animated.View
      testID={PerpsProMarketViewSelectorsIDs.LEFT_COLUMN}
      style={styles.orderFormColumn}
      layout={LinearTransition.duration(AnimationDuration.Fast)}
    >
      {orderForm}
    </Animated.View>
    {!isOrderBookCollapsed ? (
      <Animated.View
        testID={PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN}
        style={styles.orderBookColumn}
        entering={FadeIn.duration(AnimationDuration.Fast)}
        exiting={FadeOut.duration(AnimationDuration.Fast)}
      >
        {orderBook}
      </Animated.View>
    ) : null}
  </View>
);

export default PerpsProMarketLayout;
