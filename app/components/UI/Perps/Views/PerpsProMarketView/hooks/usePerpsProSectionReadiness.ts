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
      deliveryRevisions?: { positions: number; orders: number };
    }
  >
>;

interface UsePerpsProSectionReadinessOptions {
  accountState: PerpsMarketDetailSectionState;
  chartContextKey: string;
  currentSymbol?: string;
  isOrderBookCollapsed: boolean;
  isUserContextReady: boolean;
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
  isUserContextReady,
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
      deliveryRevisions?: { positions: number; orders: number },
    ) => {
      setResolvedSections((current) => {
        const previous = current[section];
        if (
          previous?.symbol === symbol &&
          previous.state === state &&
          previous.contextKey === contextKey &&
          previous.deliveryRevisions?.positions ===
            deliveryRevisions?.positions &&
          previous.deliveryRevisions?.orders === deliveryRevisions?.orders
        ) {
          return current;
        }
        return {
          ...current,
          [section]: { symbol, state, contextKey, deliveryRevisions },
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
    (
      symbol: string,
      state: PerpsMarketDetailSectionState,
      deliveryRevisions: { positions: number; orders: number },
    ) =>
      updateResolvedSection(
        'positions_orders',
        symbol,
        state,
        userContextKey,
        deliveryRevisions,
      ),
    [updateResolvedSection, userContextKey],
  );

  const positionsOrdersResolution = resolvedSections.positions_orders;
  const positionsOrdersDeliveryRevisions =
    positionsOrdersResolution &&
    positionsOrdersResolution.symbol === currentSymbol &&
    positionsOrdersResolution.contextKey === userContextKey
      ? positionsOrdersResolution.deliveryRevisions
      : undefined;

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
      [PERPS_MARKET_DETAIL_SECTION.ACCOUNT]: isUserContextReady
        ? accountState
        : 'loading',
      [PERPS_MARKET_DETAIL_SECTION.ORDER_BOOK]: isOrderBookCollapsed
        ? 'not_applicable'
        : stateForCurrentSymbol('order_book', marketContextKey),
      [PERPS_MARKET_DETAIL_SECTION.POSITIONS_ORDERS]: isUserContextReady
        ? stateForCurrentSymbol('positions_orders', userContextKey)
        : 'loading',
    }),
    [
      accountState,
      chartContextKey,
      isOrderBookCollapsed,
      isUserContextReady,
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
    positionsOrdersDeliveryRevisions,
    sections,
    statsState,
  };
}
