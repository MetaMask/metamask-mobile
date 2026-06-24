import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Trade } from '@metamask/social-controllers';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  SectionList,
  type RefreshControlProps,
  type SectionListData,
  type ViewToken,
} from 'react-native';
import Animated, { type ScrollHandlerProcessed } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { formatTradeDayLabel, getTradeDayKey } from '../../utils/formatters';
import TradeRow from './TradeRow';

interface TradeDaySection {
  dayKey: string;
  dayLabel: string;
  data: Trade[];
}

/**
 * Day label of the top-most visible section, used to drive the custom sticky
 * day header below the pinned chart. `viewableItems[0]` (with a 0% visibility
 * threshold) is the section currently behind the top of the list — i.e. the one
 * hidden under the chart overlay — which is exactly the day to pin.
 */
export function resolveTopDayLabel(
  viewableItems: Pick<ViewToken, 'section'>[],
): string | null {
  const topSection = viewableItems[0]?.section as TradeDaySection | undefined;
  return topSection?.dayLabel ?? null;
}

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<Trade, TradeDaySection>,
);

/** Imperative handle so the chart can scroll the list to a specific trade. */
export interface TraderTradesSectionHandle {
  /** Scrolls the list so the trade with this `transactionHash` is in view. */
  scrollToTrade: (transactionHash: string) => void;
}

export interface TraderTradesSectionProps {
  trades: Trade[];
  traderImageUrl?: string;
  traderAddress?: string;
  /** When provided, each row is tappable (e.g. to slide the chart to the trade). */
  onTradePress?: (trade: Trade) => void;
  /**
   * Transaction hash of the trade to visually emphasize (set by the reverse
   * interaction when a chart circle is tapped). Cleared by the parent.
   */
  emphasizedTradeId?: string | null;
  /** Pull-to-refresh control — this list owns the scroll for the page. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Reanimated scroll handler for header collapse (split-view layout). */
  onScroll?: ScrollHandlerProcessed<Record<string, unknown>>;
  /**
   * Rendered above the first trade section. In the scroll-linked pinned-chart
   * layout this carries the token info row (scrolls behind the nav), a spacer that
   * reserves room for the pinned chart overlay, and the PnL card.
   */
  listHeaderComponent?: React.ComponentProps<
    typeof SectionList
  >['ListHeaderComponent'];
  /**
   * Reports the day label of the top-most visible section as the user scrolls, so
   * the parent can render a custom sticky day header below the pinned chart
   * (the native sticky header would be hidden behind the chart overlay). `null`
   * when no section is visible (e.g. only the list header is on screen).
   */
  onTopDayLabelChange?: (dayLabel: string | null) => void;
}

/**
 * Groups trades into day sections (`Jan 1 2026`) and renders them in a
 * `SectionList` whose section headers are sticky: the header pinned at the top
 * always reads `<day of the topmost visible trade>` and swaps as the
 * user scrolls across days. The list owns the page's scroll (the chart and PnL
 * card above it stay pinned), and exposes {@link TraderTradesSectionHandle} so a
 * chart-marker tap can scroll to the matching trade.
 */
const TraderTradesSection = forwardRef<
  TraderTradesSectionHandle,
  TraderTradesSectionProps
>(
  (
    {
      trades,
      traderImageUrl,
      traderAddress,
      onTradePress,
      emphasizedTradeId,
      refreshControl,
      onScroll,
      listHeaderComponent,
      onTopDayLabelChange,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const listRef = useRef<SectionList<Trade, TradeDaySection>>(null);

    // Stable ref so onViewableItemsChanged stays referentially constant
    // (RN throws if it changes on the fly).
    const onTopDayLabelChangeRef = useRef(onTopDayLabelChange);
    onTopDayLabelChangeRef.current = onTopDayLabelChange;

    // Any pixel visible counts: viewableItems[0] is then the section currently
    // behind the top of the list (hidden under the pinned chart overlay), which
    // is exactly the day the custom sticky header should display.
    const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 0,
    }).current;
    const handleViewableItemsChanged = useRef(
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        onTopDayLabelChangeRef.current?.(resolveTopDayLabel(viewableItems));
      },
    ).current;
    // Remembered target so onScrollToIndexFailed can retry once layout settles.
    const pendingScrollRef = useRef<{
      sectionIndex: number;
      itemIndex: number;
    } | null>(null);

    // Consecutive grouping by calendar day, preserving the trades' order so the
    // sticky header reflects whatever day is currently at the top.
    const sections = useMemo<TradeDaySection[]>(() => {
      const result: TradeDaySection[] = [];
      for (const trade of trades) {
        const dayKey = getTradeDayKey(trade.timestamp);
        const last = result[result.length - 1];
        if (last && last.dayKey === dayKey) {
          last.data.push(trade);
        } else {
          result.push({
            dayKey,
            dayLabel: formatTradeDayLabel(trade.timestamp),
            data: [trade],
          });
        }
      }
      return result;
    }, [trades]);

    const scrollToLocation = useCallback(
      (location: { sectionIndex: number; itemIndex: number }) => {
        pendingScrollRef.current = location;
        try {
          listRef.current?.scrollToLocation({
            ...location,
            viewPosition: 0.35,
            animated: true,
          });
        } catch {
          // scrollToLocation can throw before the list has laid out; the
          // onScrollToIndexFailed handler retries.
        }
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        scrollToTrade: (transactionHash: string) => {
          for (let s = 0; s < sections.length; s++) {
            const itemIndex = sections[s].data.findIndex(
              (t) => t.transactionHash === transactionHash,
            );
            if (itemIndex >= 0) {
              scrollToLocation({ sectionIndex: s, itemIndex });
              return;
            }
          }
        },
      }),
      [sections, scrollToLocation],
    );

    const handleScrollToIndexFailed = useCallback(() => {
      const pending = pendingScrollRef.current;
      if (!pending) return;
      // Retry once after a frame so VirtualizedList can measure the target.
      pendingScrollRef.current = null;
      setTimeout(() => {
        try {
          listRef.current?.scrollToLocation({
            ...pending,
            viewPosition: 0.35,
            animated: true,
          });
        } catch {
          // Give up silently — emphasis still highlights the row.
        }
      }, 120);
    }, []);

    const renderSectionHeader = useCallback(
      ({ section }: { section: SectionListData<Trade, TradeDaySection> }) => (
        <Box twClassName="bg-default px-4 pt-3">
          <Box twClassName="self-start pb-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {section.dayLabel}
            </Text>
          </Box>
          <Box twClassName="h-px bg-muted" />
        </Box>
      ),
      [],
    );

    const renderItem = useCallback(
      ({ item }: { item: Trade }) => (
        <TradeRow
          trade={item}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
          onPress={onTradePress}
          isEmphasized={item.transactionHash === emphasizedTradeId}
        />
      ),
      [traderImageUrl, traderAddress, onTradePress, emphasizedTradeId],
    );

    const keyExtractor = useCallback((item: Trade) => item.transactionHash, []);

    return (
      <AnimatedSectionList
        ref={listRef}
        style={tw.style('flex-1')}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={listHeaderComponent}
        // Native sticky headers stick at the list's top edge, which is hidden
        // behind the pinned chart overlay. The parent renders a custom sticky
        // day header below the chart instead (fed by onTopDayLabelChange).
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={onScroll ? 16 : undefined}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={handleViewableItemsChanged}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        ListEmptyComponent={
          <Box twClassName="px-4 py-6 items-center">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.trader_position.no_trades')}
            </Text>
          </Box>
        }
      />
    );
  },
);

export default TraderTradesSection;
