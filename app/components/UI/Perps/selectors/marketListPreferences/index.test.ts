import type { RootState } from '../../../../../reducers';
import { selectPerpsMarketListPreferences } from './index';

const createMockState = (preferences?: Record<string, unknown>): RootState =>
  ({
    settings: {
      perpsMarketListPreferences: preferences,
    },
  }) as unknown as RootState;

describe('selectPerpsMarketListPreferences', () => {
  it('returns persisted market list preferences', () => {
    const result = selectPerpsMarketListPreferences(
      createMockState({
        marketTypeFilter: 'crypto',
        showFavoritesOnly: true,
      }),
    );

    expect(result).toEqual({
      marketTypeFilter: 'crypto',
      showFavoritesOnly: true,
    });
  });

  it('falls back to all markets when preferences are missing', () => {
    const result = selectPerpsMarketListPreferences({
      settings: {},
    } as unknown as RootState);

    expect(result).toEqual({
      marketTypeFilter: 'all',
      showFavoritesOnly: false,
    });
  });

  it('falls back to all when the stored filter is unknown', () => {
    const result = selectPerpsMarketListPreferences(
      createMockState({
        marketTypeFilter: 'not-a-filter',
        showFavoritesOnly: false,
      }),
    );

    expect(result.marketTypeFilter).toBe('all');
  });
});
