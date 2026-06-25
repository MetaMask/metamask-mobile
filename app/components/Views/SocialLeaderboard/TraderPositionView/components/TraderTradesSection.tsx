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
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type LayoutChangeEvent,
  SectionList,
  type RefreshControlProps,
  type SectionListData,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { type ScrollHandlerProcessed } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { formatTradeDayLabel, getTradeDayKey } from '../../utils/formatters';
import { computeSectionStartOffsets } from '../utils/traderPositionScrollLayout';
import TradeRow from './TradeRow';

interface TradeDaySection {
  dayKey: string;
  dayLabel: string;
  data: Trade[];
}

/**
 * Geometry the parent needs to drive the floating sticky day header from scroll
 * offset (smoothly, on the UI thread) instead of the batched/laggy
 * `onViewableItemsChanged`: the day label per section and each section's start
 * offset relative to the first section (see {@link computeSectionStartOffsets}).
 */
export interface TraderTradesSectionGeometry {
  dayLabels: string[];
  sectionOffsets: number[];
}

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<Trade, TradeDaySection>,
);

const sectionHeaderStyles = StyleSheet.create({
  hiddenBySticky: {
    opacity: 0,
  },
});

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
   * Reports the measured section geometry (day labels + relative start offsets)
   * whenever the sections or measured row / header heights change, so the parent
   * can resolve the top-most day from scroll offset on the UI thread and render a
   * custom sticky day header below the pinned chart (the native sticky header
   * would be hidden behind the chart overlay).
   */
  onSectionGeometryChange?: (geometry: TraderTradesSectionGeometry) => void;
  /**
   * When the parent renders a custom sticky day header for this label, the
   * matching in-list section header is hidden to avoid duplicate day labels.
   */
  stickyDayLabel?: string | null;
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
      onSectionGeometryChange,
      stickyDayLabel,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const listRef = useRef<SectionList<Trade, TradeDaySection>>(null);

    // Stable ref so the geometry effect doesn't re-run when the parent passes a
    // new callback identity.
    const onSectionGeometryChangeRef = useRef(onSectionGeometryChange);
    onSectionGeometryChangeRef.current = onSectionGeometryChange;

    // Uniform row / section-header heights, measured once from the first laid-out
    // instance of each. They feed the offset-based sticky day header so the label
    // tracks scroll position smoothly instead of lagging behind viewability
    // batches. Subsequent onLayout calls keep the first value (`prev` returned
    // unchanged), so React bails out of the re-render — no per-row state churn.
    const [rowHeight, setRowHeight] = useState(0);
    const [sectionHeaderHeight, setSectionHeaderHeight] = useState(0);

    const handleRowLayout = useCallback((event: LayoutChangeEvent) => {
      const height = Math.ceil(event.nativeEvent.layout.height);
      if (height > 0) {
        setRowHeight((prev) => (prev === 0 ? height : prev));
      }
    }, []);

    const handleSectionHeaderLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const height = Math.ceil(event.nativeEvent.layout.height);
        if (height > 0) {
          setSectionHeaderHeight((prev) => (prev === 0 ? height : prev));
        }
      },
      [],
    );
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

    // Recompute the section geometry only when the sections or the measured
    // constants change (never per scroll frame) and hand it to the parent, which
    // turns it into the offset-driven sticky day label.
    useEffect(() => {
      if (rowHeight === 0 || sectionHeaderHeight === 0) {
        return;
      }
      onSectionGeometryChangeRef.current?.({
        dayLabels: sections.map((section) => section.dayLabel),
        sectionOffsets: computeSectionStartOffsets(
          sections.map((section) => section.data.length),
          rowHeight,
          sectionHeaderHeight,
        ),
      });
    }, [sections, rowHeight, sectionHeaderHeight]);

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
      ({ section }: { section: SectionListData<Trade, TradeDaySection> }) => {
        const isHiddenBySticky =
          stickyDayLabel != null && section.dayLabel === stickyDayLabel;

        return (
          <View onLayout={handleSectionHeaderLayout}>
            <Box
              twClassName="bg-default px-4 pt-3"
              style={
                isHiddenBySticky
                  ? sectionHeaderStyles.hiddenBySticky
                  : undefined
              }
            >
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
          </View>
        );
      },
      [stickyDayLabel, handleSectionHeaderLayout],
    );

    const renderItem = useCallback(
      ({ item }: { item: Trade }) => (
        <View onLayout={handleRowLayout}>
          <TradeRow
            trade={item}
            traderImageUrl={traderImageUrl}
            traderAddress={traderAddress}
            onPress={onTradePress}
            isEmphasized={item.transactionHash === emphasizedTradeId}
          />
        </View>
      ),
      [
        traderImageUrl,
        traderAddress,
        onTradePress,
        emphasizedTradeId,
        handleRowLayout,
      ],
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
        // day header below the chart instead (fed by onSectionGeometryChange).
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={onScroll ? 16 : undefined}
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
