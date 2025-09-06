import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatPrice,
  formatPercentage,
  formatPnl,
} from '../../utils/formatUtils';
import { useStyles } from '../../../../../component-library/hooks';

interface LivePriceHeaderProps {
  symbol: string;
  fallbackPrice?: string;
  fallbackChange?: string;
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
    positionValue: {
      fontWeight: '700',
    },
    priceChange24h: {
      fontSize: 12,
    },
  });

/**
 * Component that displays live price and change for header
 * Subscribes to price stream independently to avoid parent re-renders
 */
const LivePriceHeader: React.FC<LivePriceHeaderProps> = ({
  symbol,
  fallbackPrice = '0',
  fallbackChange = '0',
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
  const displayChange = priceData
    ? parseFloat(priceData.percentChange24h || '0')
    : parseFloat(fallbackChange);

  const isPositiveChange = displayChange >= 0;
  const changeColor = isPositiveChange ? TextColor.Success : TextColor.Error;

  // Calculate fiat change amount (exactly as original)
  const changeAmount = (displayChange / 100) * displayPrice;

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.HeadingSM}
        color={TextColor.Default}
        style={styles.positionValue}
        testID={testIDPrice}
      >
        {formatPrice(displayPrice)}
      </Text>
      <Text
        variant={TextVariant.BodySM}
        color={changeColor}
        style={styles.priceChange24h}
        testID={testIDChange}
      >
        {formatPnl(changeAmount)} ({formatPercentage(displayChange.toString())})
      </Text>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(LivePriceHeader);
