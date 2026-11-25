import type { RootState } from '../../../../../reducers';
import settingsReducer from '../../../../../reducers/settings';
import { setPerpsMarketListPreferences } from '../../../../../actions/settings';
import {
  selectEffectivePerpsVenueFilter,
  selectPerpsMarketListPreferences,
} from './index';
import { selectPerpsLighterProviderEnabledFlag } from '../featureFlags';

jest.mock('../featureFlags', () => ({
  ...jest.requireActual('../featureFlags'),
  selectPerpsLighterProviderEnabledFlag: jest.fn(),
}));

const mockLighterEnabled =
  selectPerpsLighterProviderEnabledFlag as unknown as jest.Mock;

// Lighter availability is driven through a mocked flag selector: the
// production flag compares the app version (device info), which unit tests
// cannot satisfy.
const createMockState = (preferences?: Record<string, unknown>): RootState =>
  ({
    settings: {
      basicFunctionalityEnabled: true,
      perpsMarketListPreferences: preferences,
    },
  }) as unknown as RootState;

describe('selectEffectivePerpsVenueFilter (TAT-4407)', () => {
  beforeEach(() => {
    mockLighterEnabled.mockReturnValue(true);
  });

  it('returns all available venues when nothing is saved', () => {
    const state = createMockState();

    expect(selectEffectivePerpsVenueFilter(state)).toEqual([
      'hyperliquid',
      'lighter',
    ]);
  });

  it('intersects the saved ids with the available venues', () => {
    // Lighter disabled by flag: only Hyperliquid is available.
    mockLighterEnabled.mockReturnValue(false);
    const state = createMockState({
      selectedProviderIds: ['hyperliquid', 'lighter'],
    });

    expect(selectEffectivePerpsVenueFilter(state)).toEqual(['hyperliquid']);
  });

  it('falls back to all available venues when the intersection is empty', () => {
    mockLighterEnabled.mockReturnValue(false);
    const state = createMockState({ selectedProviderIds: ['lighter'] });

    expect(selectEffectivePerpsVenueFilter(state)).toEqual(['hyperliquid']);
  });

  it('keeps both venues selected when both are available', () => {
    mockLighterEnabled.mockReturnValue(true);
    const state = createMockState({ selectedProviderIds: ['lighter'] });

    expect(selectEffectivePerpsVenueFilter(state)).toEqual(['lighter']);
  });

  it('defaults to hyperliquid when the flag state is missing', () => {
    mockLighterEnabled.mockReturnValue(false);
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

  it('preserves a filter on unrelated edits but clears it on an explicit reset', () => {
    const saved = settingsReducer(
      undefined,
      setPerpsMarketListPreferences({ selectedProviderIds: ['lighter'] }),
    );
    const edited = settingsReducer(
      saved,
      setPerpsMarketListPreferences({ showFavoritesOnly: true }),
    );
    expect(edited.perpsMarketListPreferences.selectedProviderIds).toEqual([
      'lighter',
    ]);
    expect(
      settingsReducer(
        edited,
        setPerpsMarketListPreferences({ selectedProviderIds: undefined }),
      ).perpsMarketListPreferences.selectedProviderIds,
    ).toBeUndefined();
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
