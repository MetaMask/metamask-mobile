import { useMemo } from 'react';
import { type MarketTypeFilter } from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { usePerpsMarkets } from './usePerpsMarkets';
import { getFilterForMarketType } from '../utils/marketCategoryMapping';

export interface PerpsCategory {
  id: Exclude<MarketTypeFilter, 'all'>;
  label: string;
}

/**
 * Derives unique market categories with localised labels from the current
 * markets list.  Non-HIP-3 markets are bucketed under `'crypto'`.
 * Translation keys use the MarketTypeFilter form (e.g. `"stocks"`) via
 * `getFilterForMarketType` since `perps.home.tabs.*` is keyed that way.
 */
export const usePerpsCategories = (): PerpsCategory[] => {
  const { markets } = usePerpsMarkets();

  return useMemo(() => {
    const seen = new Set<Exclude<MarketTypeFilter, 'all'>>();
    const result: PerpsCategory[] = [];

    for (const market of markets) {
      const id: Exclude<MarketTypeFilter, 'all'> = !market.isHip3
        ? 'crypto'
        : (market.marketType as Exclude<MarketTypeFilter, 'all'>);

      if (!id || seen.has(id)) continue;
      seen.add(id);

      const filterKey = getFilterForMarketType(id) ?? id;

      result.push({
        id,
        label: strings(`perps.home.tabs.${filterKey.replace(/-/g, '_')}`),
      });
    }

    return result;
  }, [markets]);
};
