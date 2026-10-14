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
const mockRefresh = jest.fn();

const buildTrader = (id: string, rank: number): RankedTrader => ({
  id,
  address: `0x${id}`,
  rank,
  overallRank: rank,
  username: id,
  percentageChange: 0,
  pnlValue: 1000 - rank,
  winRatePercent: null,
  pnlPerChain: {},
  followerCount: 0,
  isFollowing: false,
  displayMetric: { label: `+$${1000 - rank}`, isPositive: true },
});

const mockLeaderboardResult = (
  overrides: Partial<SocialLeaderboardState> = {},
) => {
  mockUseSocialLeaderboard.mockReturnValue({
    traders: [],
    isLoading: false,
    isFetching: false,
    hasFetched: true,
    error: null,
    refresh: mockRefresh,
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

  it('defaults to the leaderboard ranking: 7d PnL, perps only', () => {
    renderHook(() => usePerpsTopTraders());

    expect(mockUseSocialLeaderboard).toHaveBeenCalledWith(
      { kind: 'all', assetClass: 'perps' },
      { timeframe: '7d', sort: 'pnl' },
    );
  });

  it('passes a custom timeframe and sort to the leaderboard', () => {
    renderHook(() => usePerpsTopTraders({ timeframe: '30d', sort: 'roi' }));

    expect(mockUseSocialLeaderboard).toHaveBeenCalledWith(
      { kind: 'all', assetClass: 'perps' },
      { timeframe: '30d', sort: 'roi' },
    );
  });

  it('returns every ranked trader when no limit is given', () => {
    mockLeaderboardResult({
      traders: [1, 2, 3, 4, 5, 6].map((rank) => buildTrader(`t${rank}`, rank)),
    });

    const { result } = renderHook(() => usePerpsTopTraders());

    expect(result.current.traders).toHaveLength(6);
    expect(result.current.showSkeleton).toBe(false);
    expect(result.current.showError).toBe(false);
  });

  it('keeps the top traders up to the given limit', () => {
    mockLeaderboardResult({
      traders: [1, 2, 3, 4, 5, 6].map((rank) => buildTrader(`t${rank}`, rank)),
    });

    const { result } = renderHook(() => usePerpsTopTraders({ limit: 5 }));

    expect(result.current.traders.map(({ id }) => id)).toEqual([
      't1',
      't2',
      't3',
      't4',
      't5',
    ]);
  });

  it('shows the skeleton while the first fetch is in flight', () => {
    mockLeaderboardResult({ isFetching: true, hasFetched: false });

    const { result } = renderHook(() => usePerpsTopTraders());

    expect(result.current.showSkeleton).toBe(true);
  });

  it('shows the error state when the fetch fails with no traders', () => {
    mockLeaderboardResult({ error: 'Leaderboard unavailable' });

    const { result } = renderHook(() => usePerpsTopTraders());

    expect(result.current.showError).toBe(true);
    expect(result.current.showSkeleton).toBe(false);
    expect(result.current.refresh).toBe(mockRefresh);
  });

  it('shows the skeleton instead of the error while a retry is in flight', () => {
    mockLeaderboardResult({
      error: 'Leaderboard unavailable',
      isFetching: true,
    });

    const { result } = renderHook(() => usePerpsTopTraders());

    expect(result.current.showError).toBe(false);
    expect(result.current.showSkeleton).toBe(true);
  });

  it('shows neither skeleton nor error when the leaderboard is not fetching', () => {
    mockLeaderboardResult({
      hasFetched: false,
      resolution: { status: 'hidden' },
    });

    const { result } = renderHook(() => usePerpsTopTraders());

    expect(result.current.traders).toEqual([]);
    expect(result.current.showSkeleton).toBe(false);
    expect(result.current.showError).toBe(false);
  });
});
