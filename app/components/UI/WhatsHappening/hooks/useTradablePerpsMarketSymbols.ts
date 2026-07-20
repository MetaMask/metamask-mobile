import { useMemo } from 'react';
import { usePerpsMarkets } from '../../Perps/hooks/usePerpsMarkets';

export interface UseTradablePerpsMarketSymbolsResult {
  /**
   * Set of perps market symbols that pass the tradability guardrail
   * (non-zero volume and open interest). Matches the same filtering applied
   * everywhere in the Perps UI via usePerpsMarkets → filterAndSortMarkets.
   *
   * An empty Set during initial load means the list has not arrived yet — do
   * not treat it as "no tradable markets exist".
   */
  tradableSymbols: Set<string>;
  isLoading: boolean;
}

/**
 * Returns a Set of tradable perps market symbols derived from the canonical
 * perps market list. Markets are already filtered by the existing guardrail
 * (filterAndSortMarkets via usePerpsMarkets) — this hook only projects those
 * results to a symbol Set for O(1) membership checks.
 *
 * No volume/open-interest logic is re-implemented here. The single source of
 * truth remains filterAndSortMarkets (invoked inside usePerpsMarkets).
 */
export function useTradablePerpsMarketSymbols(): UseTradablePerpsMarketSymbolsResult {
  const { markets, isLoading } = usePerpsMarkets();

  const tradableSymbols = useMemo(
    () => new Set(markets.map((m) => m.symbol)),
    [markets],
  );

  return { tradableSymbols, isLoading };
}
