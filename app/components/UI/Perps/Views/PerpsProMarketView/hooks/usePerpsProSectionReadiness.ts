import { useCallback, useMemo, useState } from 'react';
import {
  PERPS_MARKET_DETAIL_SECTION,
  type PerpsMarketDetailSections,
  type PerpsMarketDetailSectionState,
} from '../../../hooks/usePerpsMarketDetailSession';

type ResolvedSection = 'chart' | 'stats' | 'order_book' | 'positions_orders';
type ResolvedSections = Partial<
  Record<
    ResolvedSection,
    {
      symbol: string;
      state: PerpsMarketDetailSectionState;
      contextKey?: string;
    }
  >
>;

interface UsePerpsProSectionReadinessOptions {
  accountState: PerpsMarketDetailSectionState;
  chartContextKey: string;
  currentSymbol?: string;
  isOrderBookCollapsed: boolean;
  marketContextKey: string;
  marketState: PerpsMarketDetailSectionState;
  priceState: PerpsMarketDetailSectionState;
  userContextKey: string;
}

export function usePerpsProSectionReadiness({
  accountState,
  chartContextKey,
  currentSymbol,
  isOrderBookCollapsed,
  marketContextKey,
  marketState,
  priceState,
  userContextKey,
}: UsePerpsProSectionReadinessOptions) {
  const [resolvedSections, setResolvedSections] = useState<ResolvedSections>(
    {},
  );

  const updateResolvedSection = useCallback(
    (
      section: ResolvedSection,
      symbol: string,
      state: PerpsMarketDetailSectionState,
      contextKey?: string,
    ) => {
      setResolvedSections((current) => {
        const previous = current[section];
        if (
          previous?.symbol === symbol &&
          previous.state === state &&
          previous.contextKey === contextKey
        ) {
          return current;
        }
        return {
          ...current,
          [section]: { symbol, state, contextKey },
        };
      });
    },
    [],
  );

  const stateForCurrentSymbol = useCallback(
    (
      section: ResolvedSection,
      contextKey?: string,
    ): PerpsMarketDetailSectionState => {
      const resolved = resolvedSections[section];
      return resolved &&
        resolved.symbol === currentSymbol &&
        resolved.contextKey === contextKey
        ? resolved.state
        : 'loading';
    },
    [currentSymbol, resolvedSections],
  );

  const onChartResolved = useCallback(
    (
      symbol: string,
      state: PerpsMarketDetailSectionState,
      contextKey: string,
    ) => updateResolvedSection('chart', symbol, state, contextKey),
    [updateResolvedSection],
  );
  const onStatsResolved = useCallback(
    (symbol: string, state: PerpsMarketDetailSectionState) =>
      updateResolvedSection('stats', symbol, state, marketContextKey),
    [marketContextKey, updateResolvedSection],
  );
  const onOrderBookResolved = useCallback(
    (symbol: string, state: PerpsMarketDetailSectionState) =>
      updateResolvedSection('order_book', symbol, state, marketContextKey),
    [marketContextKey, updateResolvedSection],
  );
  const onPositionsOrdersResolved = useCallback(
    (symbol: string, state: PerpsMarketDetailSectionState) =>
      updateResolvedSection('positions_orders', symbol, state, userContextKey),
    [updateResolvedSection, userContextKey],
  );

  const statsState = stateForCurrentSymbol('stats', marketContextKey);
  const sections = useMemo<PerpsMarketDetailSections>(
    () => ({
      [PERPS_MARKET_DETAIL_SECTION.MARKET]: marketState,
      [PERPS_MARKET_DETAIL_SECTION.PRICE]: priceState,
      [PERPS_MARKET_DETAIL_SECTION.CHART]: stateForCurrentSymbol(
        'chart',
        chartContextKey,
      ),
      [PERPS_MARKET_DETAIL_SECTION.STATS]: statsState,
      [PERPS_MARKET_DETAIL_SECTION.ACCOUNT]: accountState,
      [PERPS_MARKET_DETAIL_SECTION.ORDER_BOOK]: isOrderBookCollapsed
        ? 'not_applicable'
        : stateForCurrentSymbol('order_book', marketContextKey),
      [PERPS_MARKET_DETAIL_SECTION.POSITIONS_ORDERS]: stateForCurrentSymbol(
        'positions_orders',
        userContextKey,
      ),
    }),
    [
      accountState,
      chartContextKey,
      isOrderBookCollapsed,
      marketContextKey,
      marketState,
      priceState,
      stateForCurrentSymbol,
      statsState,
      userContextKey,
    ],
  );

  return {
    onChartResolved,
    onOrderBookResolved,
    onPositionsOrdersResolved,
    onStatsResolved,
    sections,
    statsState,
  };
}
