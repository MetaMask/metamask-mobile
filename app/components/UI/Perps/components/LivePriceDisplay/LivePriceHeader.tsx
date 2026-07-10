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
  /** Fallback price when live subscription hasn't delivered data yet */
  currentPrice: number;
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
 * Component that displays live price and change for header
 * Subscribes to price stream for real-time updates of both price and 24h change.
 * Falls back to currentPrice prop when subscription hasn't delivered data yet.
 */
const LivePriceHeader: React.FC<LivePriceHeaderProps> = ({
  symbol,
  testIDPrice,
  testIDChange,
  throttleMs = 1000, // Balanced updates for header (1 update per second)
  currentPrice,
}) => {
  const { styles } = useStyles(styleSheet, {});
  // Subscribe to price stream for real-time price and 24h change percentage
  const prices = usePerpsLivePrices({
    symbols: [symbol],
    throttleMs,
  });

  const priceData = prices[symbol];

  // Use live price from subscription when available, fall back to prop
  const displayPrice = useMemo(() => {
    if (priceData?.price) {
      const parsed = Number.parseFloat(priceData.price);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return currentPrice;
  }, [priceData, currentPrice]);

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
      ? TextColor.Default // Neutral color for loading state
      : isPositiveChange
        ? TextColor.Success
        : TextColor.Error;

  // Format price display with edge case handling
  const formattedPrice = useMemo(() => {
    // Handle invalid or edge case values
    if (!displayPrice || displayPrice <= 0 || !Number.isFinite(displayPrice)) {
      return PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    try {
      return formatPerpsFiat(displayPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      });
    } catch {
      // Fallback if formatPrice throws
      return PERPS_CONSTANTS.FallbackPriceDisplay;
    }
  }, [displayPrice]);

  const formattedChange = useMemo(() => {
    // If displayChange is null, we're still loading - show loading indicator
    if (displayChange === null) {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }

    if (!displayPrice || displayPrice <= 0 || !Number.isFinite(displayPrice)) {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }

    try {
      return formatPercentage(displayChange.toString());
    } catch {
      return PERPS_CONSTANTS.FallbackPercentageDisplay;
    }
  }, [displayPrice, displayChange]);

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
