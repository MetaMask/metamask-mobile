import { renderHook } from '@testing-library/react-native';
import {
  useSocialLeaderboard,
  type RankedTrader,
  type SocialLeaderboardState,
} from '../../SocialLeaderboard';
import { usePerpsTopTraders } from './usePerpsTopTraders';

jest.mock('../../SocialLeaderboard', () => ({
  ...jest.requireActual('../../SocialLeaderboard'),
  useSocialLeaderboard: jest.fn(),
}));

const mockUseSocialLeaderboard = jest.mocked(useSocialLeaderboard);

const traders = [1, 2, 3, 4, 5, 6].map(
  (rank) => ({ id: `t${rank}`, rank }) as unknown as RankedTrader,
);

const mockLeaderboardResult = (
  overrides: Partial<SocialLeaderboardState> = {},
) => {
  mockUseSocialLeaderboard.mockReturnValue({
    traders: [],
    isLoading: false,
    isFetching: false,
    hasFetched: true,
    error: null,
    refresh: jest.fn(),
    toggleFollow: jest.fn(),
    resolution: { status: 'ready', chains: ['hyperliquid'] },
    ...overrides,
  });
};

describe('usePerpsTopTraders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboardResult();
  });

  it('requests the perps leaderboard with default or custom ranking', () => {
    renderHook(() => usePerpsTopTraders());
    renderHook(() => usePerpsTopTraders({ timeframe: '30d', sort: 'roi' }));

    expect(mockUseSocialLeaderboard).toHaveBeenNthCalledWith(
      1,
      { kind: 'all', assetClass: 'perps' },
      { timeframe: '7d', sort: 'pnl' },
    );
    expect(mockUseSocialLeaderboard).toHaveBeenNthCalledWith(
      2,
      { kind: 'all', assetClass: 'perps' },
      { timeframe: '30d', sort: 'roi' },
    );
  });

  it('trims traders to the limit when one is given', () => {
    mockLeaderboardResult({ traders });

    const all = renderHook(() => usePerpsTopTraders());
    const limited = renderHook(() => usePerpsTopTraders({ limit: 5 }));

    expect(all.result.current.traders).toHaveLength(6);
    expect(limited.result.current.traders).toHaveLength(5);
  });

  it.each([
    ['first fetch in flight', { isFetching: true }, true, false],
    ['fetch failed', { error: 'Leaderboard unavailable' }, false, true],
    [
      'retry in flight after a failure',
      { error: 'Leaderboard unavailable', isFetching: true },
      true,
      false,
    ],
  ])(
    'derives loading and error states: %s',
    (_, overrides, showSkeleton, showError) => {
      mockLeaderboardResult(overrides);

      const { result } = renderHook(() => usePerpsTopTraders());

      expect(result.current.showSkeleton).toBe(showSkeleton);
      expect(result.current.showError).toBe(showError);
    },
  );
});
