import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { type PerpsMarketData } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsMarkets } from './usePerpsMarkets';

interface RecordedMarket {
  symbol?: string;
  marketKey?: string;
  venues?: readonly PerpsMarketData[];
}

/**
 * Records the market as recently viewed whenever this screen is focused.
 *
 * `useFocusEffect` (rather than a mount-keyed `useEffect`) is required because
 * `navigation.navigate()` can reveal an already-mounted MARKET_DETAILS instance
 * (e.g. from the homepage) instead of remounting it, which would otherwise skip
 * the view recording entirely.
 */
export function usePerpsRecordMarketViewed(
  marketOrSymbol?: string | RecordedMarket,
): void {
  const symbol =
    typeof marketOrSymbol === 'string'
      ? marketOrSymbol
      : marketOrSymbol?.symbol;
  const marketKey =
    typeof marketOrSymbol === 'string' ? undefined : marketOrSymbol?.marketKey;
  const venues =
    typeof marketOrSymbol === 'string' ? undefined : marketOrSymbol?.venues;
  // The zero-volume/open-interest filters exist to keep inactive markets out of
  // browsing lists. Here the list is only used to tell tradable symbols from
  // delisted ones, and production defaults would drop valid but inactive
  // markets reached from a position or deeplink.
  const { markets, hasResolvedInitialData } = usePerpsMarkets({
    showZeroVolume: true,
    showZeroOpenInterest: true,
  });
  const tradableSymbols = useMemo(
    () => new Set(markets.map((market) => market.symbol)),
    [markets],
  );

  useFocusEffect(
    useCallback(() => {
      // Wait for the authoritative tradable market list. Recording before it
      // resolves can persist an arbitrary deeplink symbol as the Pro landing
      // target for 24 hours.
      if (!symbol || hasResolvedInitialData === false) {
        return;
      }
      // Production always supplies this field. The explicit comparison keeps
      // legacy test doubles that predate it backward compatible.
      if (hasResolvedInitialData === true && !tradableSymbols.has(symbol)) {
        return;
      }
      if (marketKey || venues) {
        Engine.context.PerpsController.recordMarketViewed(
          symbol,
          marketKey,
          venues,
        );
        return;
      }
      Engine.context.PerpsController.recordMarketViewed(symbol);
    }, [hasResolvedInitialData, marketKey, symbol, tradableSymbols, venues]),
  );
}
