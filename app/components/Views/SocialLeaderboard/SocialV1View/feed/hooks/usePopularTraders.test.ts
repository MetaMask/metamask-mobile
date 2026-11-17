import { renderHook } from '@testing-library/react-native';
import { DEFAULT_LEADERBOARD_SORT } from '../../../../shared/top-traders-constants';
import { rankTradersByMetric } from '../../../TopTradersView/traderMetric';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import type { TopTrader } from '../../../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import {
  POPULAR_TRADERS_DISPLAY_COUNT,
  POPULAR_TRADERS_FETCH_LIMIT,
  usePopularTraders,
} from './usePopularTraders';

const mockUseTopTraders = jest.fn();

jest.mock('../../../../Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: (options: unknown) => mockUseTopTraders(options),
}));

jest.mock('../../../TopTradersView/traderMetric', () => ({
  rankTradersByMetric: jest.fn((traders: TopTrader[]) => traders),
}));

const mockRankTradersByMetric = jest.mocked(rankTradersByMetric);

const makeTrader = (index: number): TopTrader => ({
  id: `trader-${index}`,
  address: `0x${index.toString().padStart(40, '0')}`,
  rank: index,
  overallRank: index,
  username: `trader-${index}`,
  percentageChange: 10,
  pnlValue: 1000 - index,
  winRatePercent: 50,
  pnlPerChain: { base: 1000 - index },
  followerCount: index * 10,
  isFollowing: false,
});

describe('usePopularTraders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRankTradersByMetric.mockImplementation(
      (traders: TopTrader[]) => traders,
    );
  });

  it('fetches 50 spot-chain PnL rows then returns the top 10', () => {
    const allTraders = Array.from({ length: 20 }, (_, i) => makeTrader(i + 1));
    mockUseTopTraders.mockReturnValue({
      traders: allTraders,
      isLoading: false,
      isFetching: false,
      hasFetched: true,
      error: null,
      refresh: jest.fn(),
      toggleFollow: jest.fn(),
    });

    const { result } = renderHook(() => usePopularTraders());

    expect(mockUseTopTraders).toHaveBeenCalledWith({
      limit: POPULAR_TRADERS_FETCH_LIMIT,
      chains: expect.any(Array),
      sort: DEFAULT_LEADERBOARD_SORT,
      timeframe: '7d',
      enabled: true,
    });
    expect(mockRankTradersByMetric).toHaveBeenCalledWith(
      allTraders,
      DEFAULT_LEADERBOARD_SORT,
    );
    expect(result.current.traders).toHaveLength(POPULAR_TRADERS_DISPLAY_COUNT);
    expect(result.current.traders[0].id).toBe('trader-1');
  });
});
