import type { RootState } from '../../../../../reducers';
import settingsReducer from '../../../../../reducers/settings';
import { setPerpsMarketListPreferences } from '../../../../../actions/settings';
import {
  selectEffectivePerpsVenueFilter,
  selectPerpsMarketListPreferences,
} from './index';

const createMockState = (
  preferences?: Record<string, unknown>,
  perpsControllerState?: Record<string, unknown>,
): RootState =>
  ({
    settings: {
      perpsMarketListPreferences: preferences,
    },
    engine: {
      backgroundState: {
        PerpsController: perpsControllerState,
      },
    },
  }) as unknown as RootState;

describe('selectEffectivePerpsVenueFilter (TAT-4407)', () => {
  it('returns all available venues when nothing is saved', () => {
    const state = createMockState(undefined, {
      activeProvider: 'aggregated',
      availableProviders: ['hyperliquid', 'lighter'],
    });

    expect(selectEffectivePerpsVenueFilter(state)).toEqual([
      'hyperliquid',
      'lighter',
    ]);
  });

  it('intersects the saved ids with the available venues', () => {
    const state = createMockState(
      { selectedProviderIds: ['hyperliquid', 'lighter'] },
      {
        activeProvider: 'aggregated',
        availableProviders: ['hyperliquid'],
      },
    );

    // Lighter is no longer available; the effective filter is what remains.
    expect(selectEffectivePerpsVenueFilter(state)).toEqual(['hyperliquid']);
  });

  it('falls back to all available venues when the intersection is empty', () => {
    const state = createMockState(
      { selectedProviderIds: ['lighter'] },
      {
        activeProvider: 'aggregated',
        availableProviders: ['hyperliquid'],
      },
    );

    expect(selectEffectivePerpsVenueFilter(state)).toEqual(['hyperliquid']);
  });

  it('follows the active provider in direct mode', () => {
    const state = createMockState(
      { selectedProviderIds: ['lighter'] },
      { activeProvider: 'hyperliquid' },
    );

    expect(selectEffectivePerpsVenueFilter(state)).toEqual(['hyperliquid']);
  });

  it('defaults to hyperliquid when the controller state is missing', () => {
    const state = createMockState();

    expect(selectEffectivePerpsVenueFilter(state)).toEqual(['hyperliquid']);
  });
});

describe('SET_PERPS_MARKET_LIST_PREFERENCES reducer (TAT-4407)', () => {
  it('persists the selected venue ids', () => {
    const next = settingsReducer(
      undefined,
      setPerpsMarketListPreferences({
        selectedProviderIds: ['lighter'],
      }),
    );

    expect(next.perpsMarketListPreferences.selectedProviderIds).toEqual([
      'lighter',
    ]);
  });

  it('refuses an update that would leave the selection empty', () => {
    const initial = settingsReducer(
      undefined,
      setPerpsMarketListPreferences({
        selectedProviderIds: ['hyperliquid'],
      }),
    );

    const next = settingsReducer(
      initial,
      setPerpsMarketListPreferences({
        selectedProviderIds: [],
      }),
    );

    expect(next.perpsMarketListPreferences.selectedProviderIds).toEqual([
      'hyperliquid',
    ]);
  });

  it('keeps other preferences intact when saving the venue filter', () => {
    const initial = settingsReducer(
      undefined,
      setPerpsMarketListPreferences({
        marketTypeFilter: 'crypto',
        showFavoritesOnly: true,
      }),
    );

    const next = settingsReducer(
      initial,
      setPerpsMarketListPreferences({
        selectedProviderIds: ['lighter'],
      }),
    );

    expect(next.perpsMarketListPreferences).toMatchObject({
      marketTypeFilter: 'crypto',
      showFavoritesOnly: true,
      selectedProviderIds: ['lighter'],
    });
  });

  it('round-trips through the preferences selector', () => {
    const next = settingsReducer(
      undefined,
      setPerpsMarketListPreferences({
        selectedProviderIds: ['lighter', 'hyperliquid'],
      }),
    );

    expect(
      selectPerpsMarketListPreferences({
        settings: next,
      } as unknown as RootState).selectedProviderIds,
    ).toEqual(['lighter', 'hyperliquid']);
  });
});
