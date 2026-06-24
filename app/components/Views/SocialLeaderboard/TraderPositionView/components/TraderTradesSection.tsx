import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  SectionList,
  type SectionListData,
  type RefreshControlProps,
} from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import { formatTradeDayLabel, getTradeDayKey } from '../../utils/formatters';
import TradeRow from './TradeRow';

interface TradeDaySection {
  dayKey: string;
  dayLabel: string;
  data: Trade[];
}

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
}

/**
 * Groups trades into day sections (`Jan 1 2026`) and renders them in a
 * `SectionList` whose section headers are sticky: the header pinned at the top
 * always reads `Trades - <day of the topmost visible trade>` and swaps as the
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
    },
    ref,
  ) => {
    const tw = useTailwind();
    const listRef = useRef<SectionList<Trade, TradeDaySection>>(null);
    // Remembered target so onScrollToIndexFailed can retry once layout settles.
    const pendingScrollRef = useRef<{
      sectionIndex: number;
      itemIndex: number;
    } | null>(null);

    const tradesLabel = strings('social_leaderboard.trader_position.trades');

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
      ({
        section,
      }: {
        section: SectionListData<Trade, TradeDaySection>;
      }) => (
        <Box twClassName="bg-default px-4 pt-3 pb-2">
          <Box twClassName="self-start pb-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {`${tradesLabel} - ${section.dayLabel}`}
            </Text>
          </Box>
          <Box twClassName="h-px bg-muted" />
        </Box>
      ),
      [tradesLabel],
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
      <SectionList
        ref={listRef}
        style={tw.style('flex-1')}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
        refreshControl={refreshControl}
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
