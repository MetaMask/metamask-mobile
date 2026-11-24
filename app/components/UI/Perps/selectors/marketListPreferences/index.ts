import { createSelector } from 'reselect';
import {
  MARKET_CATEGORIES,
  type MarketTypeFilter,
  type PerpsProviderType,
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
  /**
   * Persisted venue filter for the markets list (TAT-4407). Undefined means
   * all available venues.
   */
  selectedProviderIds?: PerpsProviderType[];
}

const DEFAULT_MARKET_LIST_PREFERENCES: PerpsMarketListPreferences = {
  marketTypeFilter: 'all',
  showFavoritesOnly: false,
  selectedProviderIds: undefined,
};

const selectSettings = (state: RootState) => state.settings;

const isMarketTypeFilter = (value: unknown): value is MarketTypeFilter =>
  typeof value === 'string' &&
  VALID_MARKET_TYPE_FILTERS.has(value as MarketTypeFilter);

const selectPerpsMarketListPreferencesRaw = createSelector(
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
      selectedProviderIds: Array.isArray(preferences?.selectedProviderIds)
        ? (preferences.selectedProviderIds as PerpsProviderType[])
        : undefined,
    };
  },
);

export const selectPerpsMarketListPreferences =
  selectPerpsMarketListPreferencesRaw;

/**
 * Venues that are actually usable right now. A venue the app no longer enables
 * (for example Lighter disabled by flag) must not let a stale saved choice
 * hide every market, so the effective filter below intersects with this list.
 */
export const selectAvailableProviderIds = createSelector(
  (state: RootState) =>
    state.engine?.backgroundState?.PerpsController as
      | {
          activeProvider?: string;
          availableProviders?: PerpsProviderType[];
        }
      | undefined,
  (perpsControllerState): PerpsProviderType[] => {
    if (!perpsControllerState) {
      return ['hyperliquid'];
    }
    if (
      perpsControllerState.activeProvider === 'aggregated' &&
      Array.isArray(perpsControllerState.availableProviders) &&
      perpsControllerState.availableProviders.length > 0
    ) {
      return perpsControllerState.availableProviders;
    }
    return [
      (perpsControllerState.activeProvider as PerpsProviderType) ??
        'hyperliquid',
    ];
  },
);

/**
 * Effective venue filter for the markets list (TAT-4407): the saved ids
 * intersected with the currently available venues; if that leaves nothing,
 * all available venues. The result always has at least one venue. Applies to
 * the markets list only — positions and orders always show every provider.
 */
export const selectEffectivePerpsVenueFilter = createSelector(
  selectPerpsMarketListPreferencesRaw,
  selectAvailableProviderIds,
  (preferences, availableProviderIds): PerpsProviderType[] => {
    const saved = preferences.selectedProviderIds;
    if (!saved || saved.length === 0) {
      return availableProviderIds;
    }
    const effective = saved.filter((id) => availableProviderIds.includes(id));
    return effective.length > 0 ? effective : availableProviderIds;
  },
);
