import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  formatPercentage,
} from '../../utils/formatUtils';
import { useStyles } from '../../../../../component-library/hooks';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';

interface LivePriceHeaderProps {
  symbol: string;
  testIDPrice?: string;
  testIDChange?: string;
  throttleMs?: number;
  /**
   * Current price to display. Source varies by caller — e.g. the candle
   * stream for chart-synced screens (PerpsMarketInlineHeader,
   * PerpsOrderBookView), or the focused-price stream for ticket screens
   * (PerpsOrderHeader) — this component itself is source-agnostic.
   */
  currentPrice: number;
  /**
   * Optional 24h percent change override, bypassing this component's own
   * price-stream subscription. Pass `null` while the caller's own value is
   * still loading, or a number once available. Used by callers (e.g.
   * PerpsOrderHeader) that already source both price and percent change
   * from a single shared hook, so the two values update together instead of
   * from two independent subscriptions. When omitted entirely (undefined),
   * falls back to this component's existing internal subscription — no
   * behavior change for callers that don't pass it (e.g. market details).
   */
  percentChange24h?: number | null;
}

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
  });

/**
 * Component that displays live price and change for header.
 * Renders the `currentPrice` prop as-is (source-agnostic). Subscribes to the
 * price stream for 24h change only when the caller doesn't supply its own
 * `percentChange24h` override.
 */
const LivePriceHeader: React.FC<LivePriceHeaderProps> = ({
  symbol,
  testIDPrice,
  testIDChange,
  throttleMs = 1000, // Balanced updates for header (1 update per second)
  currentPrice,
  percentChange24h: percentChange24hOverride,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const hasPercentChangeOverride = percentChange24hOverride !== undefined;

  // Skip this component's own subscription when the caller supplies its own
  // percent-change value — avoids a redundant duplicate subscription to the
  // same symbol.
  const prices = usePerpsLivePrices({
    symbols: hasPercentChangeOverride ? [] : [symbol],
    throttleMs,
  });

  const priceData = prices[symbol];

  // Use null to indicate loading state - only use actual values (including 0) when available
  // When we have live price data, only use percentChange from that data - don't fall back
  const displayChange = useMemo(() => {
    if (hasPercentChangeOverride) {
      return percentChange24hOverride ?? null;
    }
    if (!priceData) return null;
    if (priceData.percentChange24h === undefined) return null;
    return Number.parseFloat(priceData.percentChange24h);
  }, [hasPercentChangeOverride, percentChange24hOverride, priceData]);

  // Only determine change color when we have actual data (not loading)
  const isPositiveChange = displayChange !== null && displayChange >= 0;
  const changeColor =
    displayChange === null
      ? TextColor.Default // Neutral color for loading state
      : isPositiveChange
        ? TextColor.Success
        : TextColor.Error;

  // Format price display with edge case handling
  const formattedPrice = useMemo(() => {
    // Handle invalid or edge case values
    if (!currentPrice || currentPrice <= 0 || !Number.isFinite(currentPrice)) {
      return PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    try {
      return formatPerpsFiat(currentPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      });
    } catch {
      // Fallback if formatPrice throws
      return PERPS_CONSTANTS.FallbackPriceDisplay;
    }
  }, [currentPrice]);

  const formattedChange = useMemo(() => {
    // If displayChange is null, we're still loading - show loading indicator
    if (displayChange === null) {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }

    if (!currentPrice || currentPrice <= 0 || !Number.isFinite(currentPrice)) {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }

    try {
      return formatPercentage(displayChange.toString());
    } catch {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }
  }, [currentPrice, displayChange]);

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        testID={testIDPrice}
      >
        {formattedPrice}
      </Text>
      <Text
        variant={TextVariant.BodySM}
        color={changeColor}
        testID={testIDChange}
      >
        {formattedChange}
      </Text>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(LivePriceHeader);
