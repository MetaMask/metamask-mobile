import { createSelector } from 'reselect';
import {
  MARKET_CATEGORIES,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import { RootState } from '../../../../../reducers';

const VALID_MARKET_TYPE_FILTERS = new Set<MarketTypeFilter>([
  'all',
  'new',
  ...MARKET_CATEGORIES,
]);

export interface PerpsMarketListPreferences {
  marketTypeFilter: MarketTypeFilter;
  showFavoritesOnly: boolean;
}

const DEFAULT_MARKET_LIST_PREFERENCES: PerpsMarketListPreferences = {
  marketTypeFilter: 'all',
  showFavoritesOnly: false,
};

const selectSettings = (state: RootState) => state.settings;

const isMarketTypeFilter = (value: unknown): value is MarketTypeFilter =>
  typeof value === 'string' &&
  VALID_MARKET_TYPE_FILTERS.has(value as MarketTypeFilter);

export const selectPerpsMarketListPreferences = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>): PerpsMarketListPreferences => {
    const preferences = settingsState.perpsMarketListPreferences as
      | Record<string, unknown>
      | undefined;

    return {
      marketTypeFilter: isMarketTypeFilter(preferences?.marketTypeFilter)
        ? preferences.marketTypeFilter
        : DEFAULT_MARKET_LIST_PREFERENCES.marketTypeFilter,
      showFavoritesOnly: preferences?.showFavoritesOnly === true,
    };
  },
);
