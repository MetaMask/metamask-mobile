import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { AnimationDuration } from '@metamask/design-tokens';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import {
  usePerpsLiveOrderBook,
  type OrderBookLevel,
} from '../../../hooks/stream/usePerpsLiveOrderBook';
import { usePerpsOrderBookGrouping } from '../../../hooks/usePerpsOrderBookGrouping';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../../utils/formatUtils';
import {
  calculateAggregationParams,
  calculateGroupingOptions,
  formatColumnValue,
  formatSpreadPercent,
  getDepthRatio,
  getDepthWidth,
  groupOrderBook,
  FAST_ORDER_BOOK_LEVELS,
  ORDER_BOOK_AGGREGATED_LEVELS,
  selectDefaultGrouping,
  type OrderBookListCurrency,
  type OrderBookListMetric,
} from '../../../utils/orderBookGrouping';
import PerpsProOrderBookConfigSheet from './PerpsProOrderBookConfigSheet';
import styles from './PerpsProOrderBookPanel.styles';

const DEPTH_BAR_OPACITY = 0.15;

type OrderBookViewMode = 'default' | 'buy' | 'sell';

export interface PerpsProOrderBookPanelProps {
  /** Market symbol (e.g. 'BTC', 'xyz:TSLA'). */
  symbol: string;
  /**
   * Fallback mid/market price used to derive grouping options before the raw
   * order book produces its own mid.
   */
  marketPrice?: number;
  /** Asset base-size decimal precision (Hyperliquid `szDecimals`). */
  szDecimals?: number;
  /** Called when a ladder row is tapped (limit-price prefills). */
  onSelectPrice?: (price: string) => void;
  /** Hides the order-book column so the order form can go full width. */
  onCollapse?: () => void;
}

interface OrderBookRowProps {
  level: OrderBookLevel;
  side: 'bid' | 'ask';
  currency: OrderBookListCurrency;
  metric: OrderBookListMetric;
  maxTotal: number;
  depthBarColor: string;
  szDecimals?: number;
  onSelectPrice?: (price: string) => void;
  testID: string;
}

const OrderBookRow = ({
  level,
  side,
  currency,
  metric,
  maxTotal,
  depthBarColor,
  szDecimals,
  onSelectPrice,
  testID,
}: OrderBookRowProps) => {
  const depthWidth = getDepthWidth(level, maxTotal);
  const isBid = side === 'bid';
  const sideColor = isBid ? TextColor.SuccessDefault : TextColor.ErrorDefault;

  // Ladder rows are reused positionally across live ticks (see key comment
  // below), so this same instance's width target changes as new data
  // arrives — animate that change instead of snapping the bar.
  const depthWidthSv = useSharedValue(depthWidth);
  useEffect(() => {
    depthWidthSv.value = withTiming(depthWidth, {
      duration: AnimationDuration.Fast,
    });
  }, [depthWidth, depthWidthSv]);
  const depthBarAnimatedStyle = useAnimatedStyle(() => ({
    width: `${depthWidthSv.value}%`,
  }));

  const content = (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.depthBar,
          depthBarAnimatedStyle,
          {
            backgroundColor: depthBarColor,
            opacity: DEPTH_BAR_OPACITY,
          },
        ]}
      />
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        color={sideColor}
        twClassName="relative z-10"
        testID={`${testID}-price`}
      >
        {formatPerpsFiat(level.price, { ranges: PRICE_RANGES_UNIVERSAL })}
      </Text>
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        color={sideColor}
        twClassName="relative z-10"
        testID={`${testID}-value`}
      >
        {formatColumnValue(level, currency, metric, szDecimals)}
      </Text>
    </>
  );

  if (onSelectPrice) {
    return (
      <Pressable
        onPress={() => onSelectPrice(level.price)}
        accessibilityRole="button"
        accessibilityLabel={strings('perps.order_book.use_price', {
          price: formatPerpsFiat(level.price, {
            ranges: PRICE_RANGES_UNIVERSAL,
          }),
        })}
        testID={testID}
        style={styles.interactiveRow}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="relative h-full"
        >
          {content}
        </Box>
      </Pressable>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="relative h-8"
      testID={testID}
    >
      {content}
    </Box>
  );
};

/**
 * Buy/sell depth-ratio bars. Widths animate on change instead of snapping,
 * since the ratio recomputes on every live order-book tick.
 */
const DepthRatioBars = ({
  buyPercent,
  sellPercent,
  buyColor,
  sellColor,
}: {
  buyPercent: number;
  sellPercent: number;
  buyColor: string;
  sellColor: string;
}) => {
  const buyPercentSv = useSharedValue(buyPercent);
  const sellPercentSv = useSharedValue(sellPercent);

  useEffect(() => {
    buyPercentSv.value = withTiming(buyPercent, {
      duration: AnimationDuration.Fast,
    });
    sellPercentSv.value = withTiming(sellPercent, {
      duration: AnimationDuration.Fast,
    });
  }, [buyPercent, sellPercent, buyPercentSv, sellPercentSv]);

  const buyBarStyle = useAnimatedStyle(() => ({
    width: `${buyPercentSv.value}%`,
  }));
  const sellBarStyle = useAnimatedStyle(() => ({
    width: `${sellPercentSv.value}%`,
  }));

  return (
    <>
      <Animated.View
        style={[styles.ratioBar, buyBarStyle, { backgroundColor: buyColor }]}
      />
      <Animated.View
        style={[styles.ratioBar, sellBarStyle, { backgroundColor: sellColor }]}
      />
    </>
  );
};

/**
 * View-toggle glyph: four left-aligned descending bars. Colors reflect the
 * active view (green = buy, red = sell), matching Extension's order-book
 * view toggle.
 */
const OrderBookViewIcon = ({
  mode,
  buyColor,
  sellColor,
}: {
  mode: OrderBookViewMode;
  buyColor: string;
  sellColor: string;
}) => {
  const colors: [string, string, string, string] =
    mode === 'buy'
      ? [buyColor, buyColor, buyColor, buyColor]
      : mode === 'sell'
        ? [sellColor, sellColor, sellColor, sellColor]
        : [buyColor, buyColor, sellColor, sellColor];
  const widths = [18, 14, 10, 6] as const;

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-0.5">
      {widths.map((width, index) => (
        <View
          key={width}
          style={[
            styles.viewToggleBar,
            {
              width,
              backgroundColor: colors[index],
            },
          ]}
        />
      ))}
    </Box>
  );
};

/**
 * Skeleton ladder matching loaded layout: 5 ask rows + spread + 5 bid rows +
 * depth-ratio footer (Hyperliquid fast book ≤5 levels/side). Keeps header /
 * column chrome mounted so height stays stable while data loads.
 */
const OrderBookLadderSkeleton = ({ testID }: { testID: string }) => {
  const rowIndexes = useMemo(
    () => Array.from({ length: FAST_ORDER_BOOK_LEVELS }, (_, index) => index),
    [],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      testID={`${testID}-skeleton`}
      accessibilityState={{ busy: true }}
    >
      {rowIndexes.map((index) => (
        <Box
          // eslint-disable-next-line react/no-array-index-key
          key={`ask-skeleton-${index}`}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          style={styles.interactiveRow}
        >
          <Skeleton height={12} width="42%" />
          <Skeleton height={12} width="32%" />
        </Box>
      ))}

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="h-8"
      >
        <Skeleton height={12} width="28%" />
        <Skeleton height={12} width="48%" />
      </Box>

      {rowIndexes.map((index) => (
        <Box
          // eslint-disable-next-line react/no-array-index-key
          key={`bid-skeleton-${index}`}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          style={styles.interactiveRow}
        >
          <Skeleton height={12} width="42%" />
          <Skeleton height={12} width="32%" />
        </Box>
      ))}

      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="gap-1 pt-2 pb-1"
      >
        <Skeleton height={4} width="100%" twClassName="rounded-full" />
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="w-full"
        >
          <Skeleton height={12} width={52} />
          <Skeleton height={12} width={52} />
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Pro-mode order book column — live bid/ask ladder with depth bars.
 *
 * Mirrors Extension's `PerpsOrderBook`: raw book on the shared controller
 * socket (mid / spread) + server-aggregated book on a dedicated
 * `AggregatedOrderBookConnection` (ladder rows).
 */
const PerpsProOrderBookPanel = ({
  symbol,
  marketPrice,
  szDecimals,
  onSelectPrice,
  onCollapse,
}: PerpsProOrderBookPanelProps) => {
  const testID = PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL;
  const displaySymbol = getPerpsDisplaySymbol(symbol);
  const { colors } = useTheme();
  const buyColor = colors.success.default;
  const sellColor = colors.error.default;

  const [currency, setCurrency] = useState<OrderBookListCurrency>('usd');
  const [metric, setMetric] = useState<OrderBookListMetric>('total');
  const [viewMode, setViewMode] = useState<OrderBookViewMode>('default');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const { savedGrouping, saveGrouping } = usePerpsOrderBookGrouping(symbol);
  const [selectedGrouping, setSelectedGrouping] = useState<number | null>(
    savedGrouping ?? null,
  );

  // Local grouping must follow the active market. Without this, a prior
  // market's selection can stick when its value still appears in the new
  // options list and override that asset's saved/default grouping.
  useEffect(() => {
    setSelectedGrouping(savedGrouping ?? null);
  }, [symbol, savedGrouping]);

  const handleCycleViewMode = useCallback(() => {
    setViewMode((current) => {
      if (current === 'default') {
        return 'buy';
      }
      if (current === 'buy') {
        return 'sell';
      }
      return 'default';
    });
  }, []);

  const showBids = viewMode !== 'sell';
  const showAsks = viewMode !== 'buy';

  let viewModeAccessibilityValue = strings('perps.order_book.view_mode_both');
  if (viewMode === 'buy') {
    viewModeAccessibilityValue = strings('perps.order_book.view_mode_bids');
  } else if (viewMode === 'sell') {
    viewModeAccessibilityValue = strings('perps.order_book.view_mode_asks');
  }

  // Raw, full-precision book — mid price + spread (shared controller socket).
  const { orderBook: rawOrderBook } = usePerpsLiveOrderBook({
    symbol,
    enabled: Boolean(symbol),
    // Leave nSigFigs at default 5 / no mantissa so this stays full-precision
    // relative to the aggregated channel's coarser grouping.
    levels: ORDER_BOOK_AGGREGATED_LEVELS,
  });

  const midPriceValue = useMemo<number | null>(() => {
    const orderBookMid = Number.parseFloat(rawOrderBook?.midPrice ?? '');
    if (Number.isFinite(orderBookMid) && orderBookMid > 0) {
      return orderBookMid;
    }
    if (typeof marketPrice === 'number' && marketPrice > 0) {
      return marketPrice;
    }
    return null;
  }, [rawOrderBook?.midPrice, marketPrice]);

  const groupingOptions = useMemo(
    () => calculateGroupingOptions(midPriceValue ?? 0),
    [midPriceValue],
  );

  const currentGrouping = useMemo(() => {
    if (
      selectedGrouping !== null &&
      groupingOptions.includes(selectedGrouping)
    ) {
      return selectedGrouping;
    }
    if (
      savedGrouping !== undefined &&
      groupingOptions.includes(savedGrouping)
    ) {
      return savedGrouping;
    }
    return groupingOptions.length
      ? selectDefaultGrouping(groupingOptions)
      : null;
  }, [selectedGrouping, groupingOptions, savedGrouping]);

  const aggregationParams = useMemo(() => {
    if (!currentGrouping || !midPriceValue) {
      return { nSigFigs: 5 as const };
    }
    return calculateAggregationParams(currentGrouping, midPriceValue);
  }, [currentGrouping, midPriceValue]);

  // Server-aggregated book on its own dedicated socket (does not disturb raw).
  const {
    orderBook: aggregatedOrderBook,
    isLoading: isInitialLoading,
    connectionStatus,
    reconnect,
  } = usePerpsLiveOrderBook({
    symbol,
    channel: 'orderBookAggregated',
    enabled: Boolean(symbol),
    levels: ORDER_BOOK_AGGREGATED_LEVELS,
    nSigFigs: aggregationParams.nSigFigs,
    mantissa: aggregationParams.mantissa,
  });

  const grouped = useMemo(
    () =>
      aggregatedOrderBook
        ? groupOrderBook(
            aggregatedOrderBook,
            null,
            ORDER_BOOK_AGGREGATED_LEVELS,
          )
        : null,
    [aggregatedOrderBook],
  );

  // Asks render above the spread, farthest-to-closest top to bottom (highest
  // ask first) — the standard order-book convention, with the ask nearest
  // the spread sitting right above it.
  const reversedAsks = useMemo(
    () => (grouped ? [...grouped.asks].reverse() : []),
    [grouped],
  );

  const depthRatio = useMemo(
    () => (grouped ? getDepthRatio(grouped.bids, grouped.asks) : null),
    [grouped],
  );

  const spreadDisplay = useMemo(() => {
    if (!rawOrderBook) {
      return null;
    }
    const spread = Number.parseFloat(rawOrderBook.spread);
    const spreadPercent = Number.parseFloat(rawOrderBook.spreadPercentage);
    if (!Number.isFinite(spread) || !Number.isFinite(spreadPercent)) {
      return null;
    }
    return `${formatPerpsFiat(spread, {
      ranges: PRICE_RANGES_UNIVERSAL,
    })} (${formatSpreadPercent(spreadPercent)})`;
  }, [rawOrderBook]);

  const handleApplyConfig = useCallback(
    (next: {
      currency: OrderBookListCurrency;
      metric: OrderBookListMetric;
      grouping: number;
    }) => {
      setCurrency(next.currency);
      setMetric(next.metric);
      setSelectedGrouping(next.grouping);
      saveGrouping(next.grouping);
    },
    [saveGrouping],
  );

  const hasLadder = Boolean(
    grouped && (grouped.bids.length > 0 || grouped.asks.length > 0),
  );
  const hasConnectionError = connectionStatus === 'error';
  // Skeleton only when we have no ladder yet (initial connect / reconnect).
  // Avoids collapsing the column into a short "Loading..." message.
  const showSkeleton =
    !hasConnectionError &&
    !hasLadder &&
    (isInitialLoading || connectionStatus === 'connecting');
  const showEmptyPlaceholder =
    !showSkeleton && (hasConnectionError || !hasLadder);

  let placeholderMessage = strings('perps.order_book.no_data');
  if (hasConnectionError) {
    placeholderMessage = strings('perps.order_book.connection_error');
  }

  const unitLabel = currency === 'usd' ? 'USD' : displaySymbol;
  const metricLabel =
    metric === 'total'
      ? strings('perps.order_book.total')
      : strings('perps.order_book.size');

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Column}
      collapsable={false}
      twClassName="w-full py-2"
    >
      {/* Header: flush with the ladder rows below (no inset — Figma's column
          is px-0; the screen/divider edges come from PerpsProMarketLayout's
          outer px-2), settings sit flush on the right */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.End}
        twClassName="pb-1"
      >
        {/* Buy/sell-only view-toggle hidden for now (2026-07-30): the ladder
            only ever shows ~5 rows/side today, so filtering to one side adds
            little value. Logic (viewMode/handleCycleViewMode/showBids/
            showAsks) is kept as-is so the button can be restored later by
            un-gating this block. */}
        {false && (
          <Pressable
            onPress={handleCycleViewMode}
            accessibilityRole="button"
            accessibilityLabel={strings('perps.order_book.view_toggle')}
            accessibilityValue={{ text: viewModeAccessibilityValue }}
            testID={`${testID}-view-toggle`}
            hitSlop={8}
            style={styles.viewToggleButton}
          >
            <OrderBookViewIcon
              mode={viewMode}
              buyColor={buyColor}
              sellColor={sellColor}
            />
          </Pressable>
        )}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="-mr-1 gap-1"
        >
          {onCollapse ? (
            <ButtonIcon
              iconName={IconName.Collapse}
              accessibilityLabel={strings('perps.order_book.collapse')}
              size={ButtonIconSize.Md}
              onPress={onCollapse}
              testID={PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLLAPSE_BUTTON}
            />
          ) : null}
          <ButtonIcon
            iconName={IconName.Setting}
            accessibilityLabel={strings('perps.order_book.config_title')}
            size={ButtonIconSize.Md}
            onPress={() => setIsConfigOpen(true)}
            testID={`${testID}-grouping-trigger`}
          />
        </Box>
      </Box>

      {/* Column headers */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="pb-1"
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('perps.order_book.price')}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {`${metricLabel} (${unitLabel})`}
        </Text>
      </Box>

      {/* Ladder */}
      {showSkeleton ? (
        <OrderBookLadderSkeleton testID={testID} />
      ) : showEmptyPlaceholder || !grouped ? (
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="gap-3 px-2 py-8"
          testID={hasConnectionError ? `${testID}-connection-error` : undefined}
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {placeholderMessage}
          </Text>
          {hasConnectionError && (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              onPress={reconnect}
              testID={`${testID}-reconnect`}
            >
              {strings('perps.order_book.reconnect')}
            </Button>
          )}
        </Box>
      ) : (
        <Box flexDirection={BoxFlexDirection.Column}>
          {showAsks && (
            <Box flexDirection={BoxFlexDirection.Column}>
              {reversedAsks.map((level, index) => (
                <OrderBookRow
                  // Key by ladder rank, not price — positional slots reused
                  // across live ticks avoid remounts (same as Extension).
                  // eslint-disable-next-line react/no-array-index-key
                  key={`ask-${index}`}
                  level={level}
                  side="ask"
                  currency={currency}
                  metric={metric}
                  maxTotal={grouped.maxTotal}
                  depthBarColor={sellColor}
                  szDecimals={szDecimals}
                  onSelectPrice={onSelectPrice}
                  testID={`${testID}-ask-row-${index}`}
                />
              ))}
            </Box>
          )}

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="h-8"
            testID={`${testID}-spread`}
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('perps.order_book.spread')}
            </Text>
            {spreadDisplay ? (
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {spreadDisplay}
              </Text>
            ) : null}
          </Box>

          {showBids && (
            <Box flexDirection={BoxFlexDirection.Column}>
              {grouped.bids.map((level, index) => (
                <OrderBookRow
                  // eslint-disable-next-line react/no-array-index-key
                  key={`bid-${index}`}
                  level={level}
                  side="bid"
                  currency={currency}
                  metric={metric}
                  maxTotal={grouped.maxTotal}
                  depthBarColor={buyColor}
                  szDecimals={szDecimals}
                  onSelectPrice={onSelectPrice}
                  testID={`${testID}-bid-row-${index}`}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Buy/Sell depth ratio */}
      {depthRatio ? (
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="gap-1 pt-2 pb-1"
          testID={`${testID}-ratio`}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="w-full gap-1"
            accessibilityLabel={strings('perps.order_book.depth_ratio', {
              buy: String(depthRatio.buyPercent),
              sell: String(depthRatio.sellPercent),
            })}
          >
            <DepthRatioBars
              buyPercent={depthRatio.buyPercent}
              sellPercent={depthRatio.sellPercent}
              buyColor={buyColor}
              sellColor={sellColor}
            />
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="w-full"
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {strings('perps.order_book.buy_percent', {
                percent: String(depthRatio.buyPercent),
              })}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.ErrorDefault}
            >
              {strings('perps.order_book.sell_percent', {
                percent: String(depthRatio.sellPercent),
              })}
            </Text>
          </Box>
        </Box>
      ) : null}

      <PerpsProOrderBookConfigSheet
        isVisible={isConfigOpen}
        baseSymbol={displaySymbol}
        currency={currency}
        metric={metric}
        grouping={currentGrouping}
        groupingOptions={groupingOptions}
        onApply={handleApplyConfig}
        onClose={() => setIsConfigOpen(false)}
        testID={`${testID}-config-sheet`}
      />
    </Box>
  );
};

export default PerpsProOrderBookPanel;
