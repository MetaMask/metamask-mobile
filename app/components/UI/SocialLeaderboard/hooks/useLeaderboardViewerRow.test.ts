import { renderHook } from '@testing-library/react-native';
import type { TraderProfileResponse } from '@metamask/social-controllers';
import { ALL_CHAINS } from '../../../Views/shared/top-traders-constants';
import type { RankedTrader } from '../types';
import { useLeaderboardViewerRow } from './useLeaderboardViewerRow';

const mockUseQuery = jest.fn();
const mockRefetchViewerProfile = jest.fn();
let mockIsUnlocked = true;
let mockProfile: {
  profileId: string;
  displayName: string;
  handle: string;
  linkedAccountAddress?: string;
} | null = null;

jest.mock('../../../Views/SocialLeaderboard/MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: mockProfile }),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

jest.mock('react-redux', () => ({
  useSelector: () => mockIsUnlocked,
}));

const trader = (overrides: Partial<RankedTrader>): RankedTrader => ({
  id: 'trader',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'listed',
  percentageChange: 2.4,
  pnlValue: 10,
  pnl30d: 10,
  winRatePercent: null,
  pnlPerChain: {},
  followerCount: 3,
  isFollowing: false,
  displayMetric: { label: '+$10.00', isPositive: true },
  ...overrides,
});

const liveProfile = (): TraderProfileResponse => ({
  profile: {
    profileId: 'viewer',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'live-name',
    imageUrl: 'foxicon://agent/background1',
  },
  stats: { pnl7d: -0.59, roiPercent7d: -2.4 },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
  },
  socialHandles: {},
  followerCount: 7,
  followingCount: 0,
  copytradedAllTime: { count: 0, volumeUSD: 0, distinctActors: 0 },
});

const scope = { timeframe: '7d' as const, chains: ALL_CHAINS };

const queryResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  error: null,
  isLoading: false,
  refetch: mockRefetchViewerProfile,
  ...overrides,
});

const disabledProfileQuery = {
  enabled: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

const enabledProfileQuery = {
  enabled: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

describe('useLeaderboardViewerRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = null;
    mockIsUnlocked = true;
    mockRefetchViewerProfile.mockReset();
    mockRefetchViewerProfile.mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue(queryResult());
  });

  it('returns the matched row and does not fetch a profile', () => {
    mockProfile = {
      profileId: 'viewer',
      displayName: 'Wen',
      handle: 'wen',
      linkedAccountAddress: '0xabc',
    };
    const listed = trader({ id: 'viewer', username: 'Wen', rank: 43 });

    const { result } = renderHook(() =>
      useLeaderboardViewerRow([listed], 'pnl', true, scope),
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining(disabledProfileQuery),
    );
    expect(result.current.viewerRow).toEqual({
      trader: listed,
      hideRank: false,
      empty: false,
      omitPercentage: false,
    });
    expect(result.current.rowsWithoutViewer).toEqual([]);
  });

  it('returns null while the off-page profile is in flight', () => {
    mockProfile = { profileId: 'viewer', displayName: 'Wen', handle: 'wen' };
    mockUseQuery.mockReturnValue(queryResult({ isLoading: true }));

    const { result } = renderHook(() =>
      useLeaderboardViewerRow([trader({ id: 'other' })], 'pnl', true, scope),
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining(enabledProfileQuery),
    );
    expect(result.current.viewerRow).toBeNull();
    expect(result.current.rowsWithoutViewer).toHaveLength(1);
  });

  it('returns null when the off-page profile request fails', () => {
    mockProfile = { profileId: 'viewer', displayName: 'Wen', handle: 'wen' };
    mockUseQuery.mockReturnValue(
      queryResult({ error: new Error('profile failed'), data: liveProfile() }),
    );

    const { result } = renderHook(() =>
      useLeaderboardViewerRow([trader({ id: 'other' })], 'pnl', true, scope),
    );

    expect(result.current.viewerRow).toBeNull();
  });

  it('builds the off-page card from the trader profile', () => {
    mockProfile = { profileId: 'viewer', displayName: 'Wen', handle: 'wen' };
    mockUseQuery.mockReturnValue(queryResult({ data: liveProfile() }));

    const { result } = renderHook(() =>
      useLeaderboardViewerRow([trader({ id: 'other' })], 'pnl', true, scope),
    );

    expect(result.current.viewerRow?.hideRank).toBe(true);
    expect(result.current.viewerRow?.empty).toBe(false);
    expect(result.current.viewerRow?.trader.pnlValue).toBe(-0.59);
    expect(result.current.viewerRow?.trader.percentageChange).toBe(-2.4);
    expect(result.current.viewerRow?.trader.followerCount).toBe(7);
    expect(result.current.viewerRow?.trader.avatarUri).toBe(
      'foxicon://agent/background1',
    );
    expect(result.current.viewerRow?.trader.username).toBe('Wen');
  });

  it('does not fetch the profile while the wallet is locked', () => {
    mockIsUnlocked = false;
    mockProfile = { profileId: 'viewer', displayName: 'Wen', handle: 'wen' };

    const { result } = renderHook(() =>
      useLeaderboardViewerRow([trader({ id: 'other' })], 'pnl', true, scope),
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining(disabledProfileQuery),
    );
    expect(result.current.viewerRow).toBeNull();
  });

  it('refetches the off-page profile and skips the refetch when it is inactive', async () => {
    mockProfile = { profileId: 'viewer', displayName: 'Wen', handle: 'wen' };
    mockUseQuery.mockReturnValue(queryResult({ data: liveProfile() }));

    const { result, rerender } = renderHook(
      ({ unlocked }: { unlocked: boolean }) => {
        mockIsUnlocked = unlocked;
        return useLeaderboardViewerRow(
          [trader({ id: 'other' })],
          'pnl',
          true,
          scope,
        );
      },
      { initialProps: { unlocked: true } },
    );

    await result.current.refreshViewerProfile();

    expect(mockRefetchViewerProfile).toHaveBeenCalledTimes(1);

    mockIsUnlocked = false;
    rerender({ unlocked: false });
    await result.current.refreshViewerProfile();

    expect(mockRefetchViewerProfile).toHaveBeenCalledTimes(1);
  });

  it('returns null when the viewer row is disabled', () => {
    mockProfile = { profileId: 'viewer', displayName: 'Wen', handle: 'wen' };

    const { result } = renderHook(() =>
      useLeaderboardViewerRow([trader({ id: 'other' })], 'pnl', false, scope),
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining(disabledProfileQuery),
    );
    expect(result.current.viewerRow).toBeNull();
  });
});
