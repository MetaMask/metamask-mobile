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
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';

interface LivePriceHeaderProps {
  symbol: string;
  fallbackPrice?: string;
  testIDPrice?: string;
  testIDChange?: string;
  throttleMs?: number;
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
 * Subscribes to price stream independently to avoid parent re-renders
 */
const LivePriceHeader: React.FC<LivePriceHeaderProps> = ({
  symbol,
  fallbackPrice = '0',
  testIDPrice,
  testIDChange,
  throttleMs = 1000, // Balanced updates for header (1 update per second)
}) => {
  const { styles } = useStyles(styleSheet, {});
  const prices = usePerpsLivePrices({
    symbols: [symbol],
    throttleMs,
  });

  const priceData = prices[symbol];

  // Use fallback data if no live data yet
  const displayPrice = priceData
    ? parseFloat(priceData.price)
    : parseFloat(fallbackPrice);

  // Use null to indicate loading state - only use actual values (including 0) when available
  // When we have live price data, only use percentChange from that data - don't fall back
  const displayChange = priceData
    ? priceData.percentChange24h !== undefined
      ? parseFloat(priceData.percentChange24h)
      : null
    : null;

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
      return PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }

    try {
      return formatPerpsFiat(displayPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      });
    } catch {
      // Fallback if formatPrice throws
      return PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }
  }, [displayPrice]);

  const formattedChange = useMemo(() => {
    // If displayChange is null, we're still loading - show loading indicator
    if (displayChange === null) {
      return PERPS_CONSTANTS.FALLBACK_PERCENTAGE_DISPLAY;
    }

    if (!displayPrice || displayPrice <= 0 || !Number.isFinite(displayPrice)) {
      return PERPS_CONSTANTS.FALLBACK_PERCENTAGE_DISPLAY;
    }

    try {
      return formatPercentage(displayChange.toString());
    } catch {
      return PERPS_CONSTANTS.FALLBACK_PERCENTAGE_DISPLAY;
    }
  }, [displayPrice, displayChange]);

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Default}
        testID={testIDPrice}
      >
        {formattedPrice}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
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
