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
 *
 * IDs use the `MarketTypeFilter` form (e.g. `"stocks"` not `"stock"`) so
 * they can be passed directly to navigation params, filter state, and
 * translation keys under `perps.home.tabs.*`.
 */
export const usePerpsCategories = (): PerpsCategory[] => {
  const { markets } = usePerpsMarkets();

  return useMemo(() => {
    const seen = new Set<Exclude<MarketTypeFilter, 'all'>>();
    const result: PerpsCategory[] = [];

    for (const market of markets) {
      const id: Exclude<MarketTypeFilter, 'all'> | undefined = market.isHip3
        ? (getFilterForMarketType(market.marketType ?? '') as
            | Exclude<MarketTypeFilter, 'all'>
            | undefined)
        : 'crypto';

      if (!id || seen.has(id)) continue;
      seen.add(id);

      result.push({
        id,
        label: strings(`perps.home.tabs.${id.replace(/-/g, '_')}`),
      });
    }

    return result;
  }, [markets]);
};
