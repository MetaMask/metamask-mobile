import React, { useMemo, useCallback } from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import type {
  OrderBookData,
  OrderBookLevel,
} from '../../hooks/stream/usePerpsLiveOrderBook';
import styleSheet from './PerpsOrderBookTable.styles';
import { PerpsOrderBookTableSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';

export type UnitDisplay = 'base' | 'usd';

export interface PerpsOrderBookTableProps {
  /** Order book data from usePerpsLiveOrderBook hook */
  orderBook: OrderBookData | null;
  /** Symbol being displayed (e.g., 'BTC') */
  symbol: string;
  /** Current unit display preference */
  unit: UnitDisplay;
  /** Whether the order book is loading */
  isLoading?: boolean;
  /** Test ID for E2E testing */
  testID?: string;
}

/**
 * Order book table component displaying bid/ask levels with depth visualization
 *
 * Features:
 * - Bid/Ask split view with prices meeting in the center
 * - Depth bars showing relative size at each level
 * - Unit toggle (base currency vs USD)
 */
const PerpsOrderBookTable: React.FC<PerpsOrderBookTableProps> = ({
  orderBook,
  symbol,
  unit,
  isLoading = false,
  testID = PerpsOrderBookTableSelectorsIDs.CONTAINER,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Calculate depth bar width as percentage of max total
  const getDepthBarWidth = useCallback(
    (level: OrderBookLevel, maxTotal: string): number => {
      const max = parseFloat(maxTotal);
      if (max === 0) return 0;
      const total = parseFloat(level.total);
      return (total / max) * 100;
    },
    [],
  );

  // Format total based on unit preference
  const formatTotal = useCallback(
    (level: OrderBookLevel): string => {
      if (unit === 'usd') {
        return formatPerpsFiat(parseFloat(level.totalNotional), {
          ranges: PRICE_RANGES_UNIVERSAL,
        });
      }
      // Base currency
      const total = parseFloat(level.total);
      if (total >= 1) {
        return total.toFixed(4);
      }
      return total.toFixed(6);
    },
    [unit],
  );

  // Format price with appropriate precision
  const formatPrice = useCallback((price: string): string => {
    const p = parseFloat(price);
    return formatPerpsFiat(p, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
  }, []);

  // Render a single bid row
  const renderBidRow = useCallback(
    (level: OrderBookLevel, index: number) => {
      const depthWidth = orderBook
        ? getDepthBarWidth(level, orderBook.maxTotal)
        : 0;

      return (
        <View
          key={`bid-${index}`}
          style={styles.row}
          testID={`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-${index}`}
        >
          {/* Depth bar */}
          <View
            style={[
              styles.depthBar,
              styles.bidDepthBar,
              { width: `${depthWidth}%` },
            ]}
          />

          {/* Total (left for bids) */}
          <View style={styles.totalColumn}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {formatTotal(level)}
            </Text>
          </View>

          {/* Price (right for bids, colored green) */}
          <View style={styles.priceColumnBid}>
            <Text variant={TextVariant.BodySM} color={TextColor.Success}>
              {formatPrice(level.price)}
            </Text>
          </View>
        </View>
      );
    },
    [orderBook, styles, formatTotal, formatPrice, getDepthBarWidth],
  );

  // Render a single ask row
  const renderAskRow = useCallback(
    (level: OrderBookLevel, index: number) => {
      const depthWidth = orderBook
        ? getDepthBarWidth(level, orderBook.maxTotal)
        : 0;

      return (
        <View
          key={`ask-${index}`}
          style={styles.row}
          testID={`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-${index}`}
        >
          {/* Depth bar */}
          <View
            style={[
              styles.depthBar,
              styles.askDepthBar,
              { width: `${depthWidth}%` },
            ]}
          />

          {/* Price (left for asks, colored red) */}
          <View style={styles.priceColumnAsk}>
            <Text variant={TextVariant.BodySM} color={TextColor.Error}>
              {formatPrice(level.price)}
            </Text>
          </View>

          {/* Total (right for asks) */}
          <View style={styles.totalColumnRight}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {formatTotal(level)}
            </Text>
          </View>
        </View>
      );
    },
    [orderBook, styles, formatTotal, formatPrice, getDepthBarWidth],
  );

  // Memoize bid rows - highest bids at top (price descending)
  const bidRows = useMemo(() => {
    if (!orderBook?.bids) return null;
    return orderBook.bids.map((level, index) => renderBidRow(level, index));
  }, [orderBook?.bids, renderBidRow]);

  // Memoize ask rows
  const askRows = useMemo(() => {
    if (!orderBook?.asks) return null;
    return orderBook.asks.map((level, index) => renderAskRow(level, index));
  }, [orderBook?.asks, renderAskRow]);

  // Unit label based on selection
  const unitLabel = unit === 'usd' ? 'USD' : symbol;

  if (isLoading || !orderBook) {
    return (
      <View style={styles.emptyState} testID={testID}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {isLoading
            ? strings('perps.order_book.loading')
            : strings('perps.order_book.no_data')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Column Headers */}
      <View style={styles.header}>
        <View style={styles.headerColumn}>
          <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
            {strings('perps.order_book.total')} ({unitLabel})
          </Text>
        </View>
        <View style={styles.headerColumnCenter}>
          <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
            {strings('perps.order_book.price')}
          </Text>
        </View>
        <View style={styles.headerColumnCenter}>
          <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
            {strings('perps.order_book.price')}
          </Text>
        </View>
        <View style={styles.headerColumnRight}>
          <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
            {strings('perps.order_book.total')} ({unitLabel})
          </Text>
        </View>
      </View>

      {/* Order Book Split View */}
      <View style={styles.bookContainer}>
        {/* Bids Side (Left) */}
        <View style={styles.bidsSide}>{bidRows}</View>

        {/* Asks Side (Right) */}
        <View style={styles.asksSide}>{askRows}</View>
      </View>
    </View>
  );
};

export default PerpsOrderBookTable;
