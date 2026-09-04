import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { usePerpsMarkets } from './usePerpsMarkets';

/**
 * Records the market as recently viewed whenever this screen is focused.
 *
 * `useFocusEffect` (rather than a mount-keyed `useEffect`) is required because
 * `navigation.navigate()` can reveal an already-mounted MARKET_DETAILS instance
 * (e.g. from the homepage) instead of remounting it, which would otherwise skip
 * the view recording entirely.
 */
export function usePerpsRecordMarketViewed(symbol?: string): void {
  const { markets, hasResolvedInitialData } = usePerpsMarkets();
  const tradableSymbols = useMemo(
    () => new Set(markets.map((market) => market.symbol)),
    [markets],
  );

  useFocusEffect(
    useCallback(() => {
      if (!symbol) {
        return;
      }
      if (hasResolvedInitialData && !tradableSymbols.has(symbol)) {
        return;
      }
      Engine.context.PerpsController.recordMarketViewed(symbol);
    }, [hasResolvedInitialData, symbol, tradableSymbols]),
  );
}
