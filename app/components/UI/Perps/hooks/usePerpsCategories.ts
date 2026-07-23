import { useMemo } from 'react';
import { type MarketTypeFilter } from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { usePerpsMarkets } from './usePerpsMarkets';
import {
  CATEGORY_DISPLAY_ORDER,
  isHip3Filter,
  normalizeFilterKey,
} from '../utils/marketCategoryMapping';

export interface PerpsCategory {
  id: Exclude<MarketTypeFilter, 'all'>;
  label: string;
}

/**
 * Pseudo-category for markets listed within the last 30 days. Shared by
 * `PerpsMarketCategoryBadges` (market list filter bar) and `PerpsProducts`
 * (home pills) so both surfaces show/link to the same "New" concept.
 * Visibility is gated by `useHasNewMarkets`.
 */
export const NEW_CATEGORY: PerpsCategory = {
  id: 'new',
  label: strings('perps.home.tabs.new'),
};

/**
 * Derives unique market categories with localised labels from the current
 * markets list.  Non-HIP-3 markets are bucketed under `'crypto'`.
 *
 * IDs use the `MarketTypeFilter` form (e.g. `"stock"`, `"commodity"`) so
 * they can be passed directly to navigation params, filter state, and
 * translation keys under `perps.home.tabs.*`.
 */
export const usePerpsCategories = (): PerpsCategory[] => {
  const { markets } = usePerpsMarkets();

  return useMemo(() => {
    const seen = new Set<Exclude<MarketTypeFilter, 'all'>>();
    const result: PerpsCategory[] = [];

    for (const market of markets) {
      const id: Exclude<MarketTypeFilter, 'all'> | undefined = !market.isHip3
        ? 'crypto'
        : isHip3Filter(market.marketType)
          ? market.marketType
          : undefined;

      if (!id || seen.has(id)) continue;
      seen.add(id);

      result.push({
        id,
        label: strings(`perps.home.tabs.${normalizeFilterKey(id)}`),
      });
    }

    const orderIndex = new Map(
      CATEGORY_DISPLAY_ORDER.map((key, index) => [key, index]),
    );
    result.sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? Infinity) - (orderIndex.get(b.id) ?? Infinity),
    );

    return result;
  }, [markets]);
};
