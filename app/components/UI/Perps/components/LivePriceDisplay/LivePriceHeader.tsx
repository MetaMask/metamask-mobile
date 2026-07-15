import React, { memo, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
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
  /** Current price from candle stream - syncs header with chart */
  currentPrice: number;
  /**
   * Visual size of the price/change row.
   * - `default`: compact, muted price (used inside the market header).
   * - `large`: prominent price shown below the market header.
   */
  size?: 'default' | 'large';
}

const styleSheet = () =>
  StyleSheet.create({
    container: {
      // Allow the row to shrink within a constrained parent so long prices or
      // larger system font sizes don't overflow adjacent content.
      flexShrink: 1,
    },
    price: {
      flexShrink: 1,
    },
  });

// Compact header keeps the change inline with the price; the prominent header
// stacks the change below the price (matches the asset overview screen).
const inlineLayout: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'baseline',
  gap: 6,
};
const stackedLayout: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
};

/**
 * Component that displays live price and change for header
 * Uses currentPrice prop from candle stream, subscribes to price stream for 24h change only
 */
const LivePriceHeader: React.FC<LivePriceHeaderProps> = ({
  symbol,
  testIDPrice,
  testIDChange,
  throttleMs = 1000, // Balanced updates for header (1 update per second)
  currentPrice,
  size = 'default',
}) => {
  const isLarge = size === 'large';
  const priceVariant = isLarge ? TextVariant.DisplayLg : TextVariant.BodySm;
  const priceColor = isLarge
    ? TextColor.TextDefault
    : TextColor.TextAlternative;
  const changeVariant = TextVariant.BodySm;
  // Match the asset overview screen, which uses a medium-weight change line.
  const changeFontWeight = isLarge ? FontWeight.Medium : FontWeight.Regular;
  const { styles } = useStyles(styleSheet, {});
  // Subscribe to price stream only for 24h change percentage
  const prices = usePerpsLivePrices({
    symbols: [symbol],
    throttleMs,
  });

  const priceData = prices[symbol];

  // Use null to indicate loading state - only use actual values (including 0) when available
  // When we have live price data, only use percentChange from that data - don't fall back
  const displayChange = useMemo(() => {
    if (!priceData) return null;
    if (priceData.percentChange24h === undefined) return null;
    return Number.parseFloat(priceData.percentChange24h);
  }, [priceData]);

  // Only determine change color when we have actual data (not loading)
  const isPositiveChange = displayChange !== null && displayChange >= 0;
  const changeColor =
    displayChange === null
      ? TextColor.TextDefault // Neutral color for loading state
      : isPositiveChange
        ? TextColor.SuccessDefault
        : TextColor.ErrorDefault;

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

  // Absolute 24h change derived from the current price and the 24h percentage
  // (the price stream only exposes the percentage). prevPrice = current / (1 + pct/100).
  const absoluteChange = useMemo(() => {
    if (displayChange === null) return null;
    if (!currentPrice || currentPrice <= 0 || !Number.isFinite(currentPrice)) {
      return null;
    }
    const previousPrice = currentPrice / (1 + displayChange / 100);
    if (!Number.isFinite(previousPrice)) return null;
    return currentPrice - previousPrice;
  }, [currentPrice, displayChange]);

  const formattedChange = useMemo(() => {
    // If displayChange is null, we're still loading - show loading indicator
    if (displayChange === null) {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }

    if (!currentPrice || currentPrice <= 0 || !Number.isFinite(currentPrice)) {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }

    try {
      const percentage = formatPercentage(displayChange.toString());

      // Compact header stays percentage-only; the prominent header mirrors the
      // asset overview screen by showing the absolute change and percentage,
      // e.g. "+$3.57 (+0.21%)".
      if (!isLarge || absoluteChange === null) {
        return percentage;
      }

      const sign = absoluteChange > 0 ? '+' : absoluteChange < 0 ? '-' : '';
      const formattedAbsoluteChange = formatPerpsFiat(
        Math.abs(absoluteChange),
        {
          ranges: PRICE_RANGES_UNIVERSAL,
        },
      );
      return `${sign}${formattedAbsoluteChange} (${percentage})`;
    } catch {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }
  }, [currentPrice, displayChange, isLarge, absoluteChange]);

  return (
    <View style={[styles.container, isLarge ? stackedLayout : inlineLayout]}>
      <Text
        variant={priceVariant}
        color={priceColor}
        style={styles.price}
        numberOfLines={1}
        ellipsizeMode="tail"
        testID={testIDPrice}
      >
        {formattedPrice}
      </Text>
      <Text
        variant={changeVariant}
        fontWeight={changeFontWeight}
        color={changeColor}
        numberOfLines={1}
        testID={testIDChange}
      >
        {formattedChange}
      </Text>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(LivePriceHeader);
