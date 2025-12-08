import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import type { OrderBookData } from '../../hooks/stream/usePerpsLiveOrderBook';
import styleSheet from './PerpsOrderBookDepthChart.styles';
import { PerpsOrderBookDepthChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';

export interface PerpsOrderBookDepthChartProps {
  /** Order book data from usePerpsLiveOrderBook hook */
  orderBook: OrderBookData | null;
  /** Height of the chart in pixels */
  height?: number;
  /** Test ID for E2E testing */
  testID?: string;
}

/**
 * Depth chart component visualizing cumulative buy/sell orders
 *
 * Features:
 * - Area chart with bids (green) on left, asks (red) on right
 * - Cumulative volume on Y-axis
 * - Price on X-axis
 * - Mid-price indicator in center
 */
const PerpsOrderBookDepthChart: React.FC<PerpsOrderBookDepthChartProps> = ({
  orderBook,
  height = 150,
  testID = PerpsOrderBookDepthChartSelectorsIDs.CONTAINER,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});

  // Chart dimensions - memoized to prevent re-renders
  const chartDimensions = useMemo(() => {
    const chartWidth = 100; // Percentage-based for SVG viewBox
    const chartHeight = height;
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    return { chartWidth, chartHeight, padding, innerWidth, innerHeight };
  }, [height]);

  // Generate SVG paths for bid and ask depth curves
  const { bidPath, askPath, priceRange } = useMemo(() => {
    if (!orderBook?.bids?.length || !orderBook?.asks?.length) {
      return { bidPath: '', askPath: '', priceRange: { min: 0, max: 0 } };
    }

    const { padding, innerWidth, innerHeight } = chartDimensions;
    const bids = orderBook.bids;
    const asks = orderBook.asks;

    // Get price range (bids are highest first, asks are lowest first)
    const minBidPrice = parseFloat(bids[bids.length - 1]?.price || '0');
    const maxBidPrice = parseFloat(bids[0]?.price || '0');
    const minAskPrice = parseFloat(asks[0]?.price || '0');
    const maxAskPrice = parseFloat(asks[asks.length - 1]?.price || '0');

    const minPrice = minBidPrice;
    const maxPrice = maxAskPrice;
    const priceSpan = maxPrice - minPrice;

    // Get max cumulative volume for Y-axis scaling
    const maxBidVolume = parseFloat(bids[bids.length - 1]?.total || '0');
    const maxAskVolume = parseFloat(asks[asks.length - 1]?.total || '0');
    const maxVol = Math.max(maxBidVolume, maxAskVolume);

    // Helper to convert price to X coordinate
    const priceToX = (price: number): number =>
      padding.left + ((price - minPrice) / priceSpan) * innerWidth;

    // Helper to convert volume to Y coordinate (inverted - higher volume = lower Y)
    const volumeToY = (volume: number): number =>
      padding.top + innerHeight - (volume / maxVol) * innerHeight;

    // Build bid path (right to left, cumulative increases)
    // Start from mid price at bottom, go left with increasing cumulative
    let bidPathStr = `M ${priceToX(maxBidPrice)} ${volumeToY(0)}`;

    // Add points for each bid level
    bids.forEach((level) => {
      const x = priceToX(parseFloat(level.price));
      const y = volumeToY(parseFloat(level.total));
      bidPathStr += ` L ${x} ${y}`;
    });

    // Close the path at the bottom
    bidPathStr += ` L ${priceToX(minBidPrice)} ${volumeToY(0)}`;
    bidPathStr += ' Z';

    // Build ask path (left to right, cumulative increases)
    let askPathStr = `M ${priceToX(minAskPrice)} ${volumeToY(0)}`;

    // Add points for each ask level
    asks.forEach((level) => {
      const x = priceToX(parseFloat(level.price));
      const y = volumeToY(parseFloat(level.total));
      askPathStr += ` L ${x} ${y}`;
    });

    // Close the path at the bottom
    askPathStr += ` L ${priceToX(maxAskPrice)} ${volumeToY(0)}`;
    askPathStr += ' Z';

    return {
      bidPath: bidPathStr,
      askPath: askPathStr,
      priceRange: { min: minPrice, max: maxPrice },
    };
  }, [orderBook, chartDimensions]);

  // Format price for labels
  const formatPrice = (price: number): string =>
    formatPerpsFiat(price, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });

  if (!orderBook) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.bidDot]} />
          <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
            {strings('perps.order_book.bids')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.askDot]} />
          <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
            {strings('perps.order_book.asks')}
          </Text>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.chartContainer}>
        <Svg
          width="100%"
          height={chartDimensions.chartHeight}
          viewBox={`0 0 ${chartDimensions.chartWidth} ${chartDimensions.chartHeight}`}
          preserveAspectRatio="none"
        >
          <Defs>
            {/* Bid gradient (green) */}
            <LinearGradient id="bidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop
                offset="0%"
                stopColor={theme.colors.success.default}
                stopOpacity={0.4}
              />
              <Stop
                offset="100%"
                stopColor={theme.colors.success.default}
                stopOpacity={0.1}
              />
            </LinearGradient>
            {/* Ask gradient (red) */}
            <LinearGradient id="askGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop
                offset="0%"
                stopColor={theme.colors.error.default}
                stopOpacity={0.4}
              />
              <Stop
                offset="100%"
                stopColor={theme.colors.error.default}
                stopOpacity={0.1}
              />
            </LinearGradient>
          </Defs>

          {/* Bid area */}
          {bidPath && (
            <Path
              d={bidPath}
              fill="url(#bidGradient)"
              stroke={theme.colors.success.default}
              strokeWidth={1}
            />
          )}

          {/* Ask area */}
          {askPath && (
            <Path
              d={askPath}
              fill="url(#askGradient)"
              stroke={theme.colors.error.default}
              strokeWidth={1}
            />
          )}
        </Svg>

        {/* Mid price line */}
        <View style={styles.midPriceContainer} />
      </View>

      {/* Price labels */}
      <View style={styles.labelContainer}>
        <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
          {formatPrice(priceRange.min)}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Default}>
          {formatPrice(parseFloat(orderBook.midPrice))}
        </Text>
        <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
          {formatPrice(priceRange.max)}
        </Text>
      </View>
    </View>
  );
};

export default PerpsOrderBookDepthChart;
