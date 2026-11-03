import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { TopTrader } from '../../../Views/Homepage/Sections/TopTraders/types';
import { SocialV1TraderRowSelectorsIDs } from '../../../Views/SocialLeaderboard/TopTradersView/components/SocialV1TraderRow.testIds';
import {
  ALL_CHAINS,
  SPOT_CHAINS,
} from '../../../Views/shared/top-traders-constants';
import SocialLeaderboard, {
  type SocialLeaderboardHandle,
  type SocialLeaderboardProps,
} from './SocialLeaderboard';
import { SocialLeaderboardSelectorsIDs } from './SocialLeaderboard.testIds';

const mockUseTopTraders = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();
const mockTrack = jest.fn();
let mockIsEnabled = true;
let mockIsPerpsEnabled = true;
let mockNetworkTier: string | null = 'WIFI';
let mockIsUnlocked = true;
let mockProfile: Record<string, unknown> | null = null;

jest.mock('../../../Views/SocialLeaderboard/terms/socialTermsAcceptance');

jest.mock('../../../Views/Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: (options: unknown) => mockUseTopTraders(options),
}));

jest.mock('../../../Views/SocialLeaderboard/MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: mockProfile }),
}));

jest.mock(
  '../../../Views/SocialLeaderboard/hooks/useFollowWithNotificationSetup',
  () => ({
    useFollowWithNotificationSetup: () => ({
      followWithSetup: (_isFollowing: boolean, toggle: () => Promise<void>) =>
        toggle(),
    }),
  }),
);

jest.mock('../../../Views/SocialLeaderboard/analytics', () => ({
  ...jest.requireActual('../../../Views/SocialLeaderboard/analytics'),
  useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
}));

jest.mock(
  '../../../Views/SocialLeaderboard/TopTradersView/leaderboardSnapshot',
  () => ({
    ...jest.requireActual(
      '../../../Views/SocialLeaderboard/TopTradersView/leaderboardSnapshot',
    ),
    readSnapshot: jest.fn(() => null),
    writeSnapshot: jest.fn(),
  }),
);

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/featureFlagController/socialLeaderboard',
    ),
    selectSocialLeaderboardEnabled: () => mockIsEnabled,
    selectSocialLeaderboardPerpsEnabled: () => mockIsPerpsEnabled,
  }),
);

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

jest.mock('../../../../selectors/keyringController', () => ({
  ...jest.requireActual('../../../../selectors/keyringController'),
  selectIsUnlocked: () => mockIsUnlocked,
}));

const mockUseQuery = jest.fn();
const mockRefetchViewerProfile = jest.fn();
jest.mock('@metamask/react-data-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const buildTrader = (overrides: Partial<TopTrader>): TopTrader => ({
  id: 'trader',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'trader',
  percentageChange: 0,
  pnlValue: 0,
  pnl30d: 0,
  winRatePercent: null,
  pnlPerChain: {},
  followerCount: 0,
  isFollowing: false,
  ...overrides,
});

const TRADERS = [
  buildTrader({ id: 'low', username: 'low', pnlValue: 100 }),
  buildTrader({
    id: 'high',
    username: 'high',
    pnlValue: 900,
    isFollowing: true,
    address: '0x00000000000000000000000000000000000000aa',
  }),
  buildTrader({ id: 'mid', username: 'mid', pnlValue: 500 }),
];

const mockQueryResult = (overrides: Record<string, unknown> = {}) => {
  mockUseTopTraders.mockReturnValue({
    traders: TRADERS,
    isLoading: false,
    isFetching: false,
    hasFetched: true,
    error: null,
    refresh: mockRefresh,
    toggleFollow: mockToggleFollow,
    ...overrides,
  });
};

const renderLeaderboard = (props: Partial<SocialLeaderboardProps> = {}) =>
  renderWithProvider(
    <SocialLeaderboard
      source={{ kind: 'all' }}
      location="token_details"
      {...props}
    />,
  );

const rowIds = () =>
  screen
    .getByTestId(SocialLeaderboardSelectorsIDs.ROWS)
    .findAll((node) =>
      String(node.props.testID ?? '').startsWith('trader-row-'),
    )
    .map((node) => node.props.testID)
    .filter((id, index, ids) => ids.indexOf(id) === index);

describe('SocialLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled = true;
    mockIsPerpsEnabled = true;
    mockNetworkTier = 'WIFI';
    mockIsUnlocked = true;
    mockProfile = null;
    mockQueryResult();
    mockRefetchViewerProfile.mockReset();
    mockRefetchViewerProfile.mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      refetch: mockRefetchViewerProfile,
    });
  });

  it('fetches the combined ranking and renders rows ordered by PnL', () => {
    renderLeaderboard();

    expect(mockUseTopTraders).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        chains: ALL_CHAINS,
        sort: 'pnl',
        timeframe: '7d',
        enabled: true,
      }),
    );
    expect(rowIds()).toEqual([
      'trader-row-high',
      'trader-row-mid',
      'trader-row-low',
    ]);
  });

  it('shows the window percent and follower count on each row', () => {
    mockQueryResult({
      traders: [
        buildTrader({
          id: 'rich',
          username: 'rich',
          pnlValue: 100,
          percentageChange: 7.76,
          followerCount: 4700,
        }),
      ],
    });

    renderLeaderboard();

    expect(
      screen.getByTestId(SocialV1TraderRowSelectorsIDs.PERCENTAGE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialV1TraderRowSelectorsIDs.FOLLOWERS),
    ).toBeOnTheScreen();
  });

  it('fetches spot chains for the tokens asset class', () => {
    renderLeaderboard({ source: { kind: 'all', assetClass: 'tokens' } });

    expect(mockUseTopTraders).toHaveBeenCalledWith(
      expect.objectContaining({ chains: SPOT_CHAINS }),
    );
  });

  it('shows only the first `limit` rows', () => {
    renderLeaderboard({ limit: 2 });

    expect(rowIds()).toEqual(['trader-row-high', 'trader-row-mid']);
  });

  it('applies the cohort filter to the loaded page', () => {
    renderLeaderboard({
      filters: { timeframe: '30d', ranking: 'pnl', cohort: 'following' },
    });

    expect(mockUseTopTraders).toHaveBeenCalledWith(
      expect.objectContaining({ timeframe: '30d' }),
    );
    expect(rowIds()).toEqual(['trader-row-high']);
  });

  it('shows the unavailable state for a single-asset source without fetching', () => {
    renderLeaderboard({
      source: { kind: 'token', assetId: 'eip155:1/erc20:0xabc' },
    });

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.UNAVAILABLE),
    ).toBeOnTheScreen();
    expect(mockUseTopTraders).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.queryByTestId(SocialLeaderboardSelectorsIDs.ROWS)).toBeNull();
  });

  it('renders nothing for a perps source when perps are off', () => {
    mockIsPerpsEnabled = false;

    renderLeaderboard({ source: { kind: 'perp', symbol: 'BTC' } });

    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('renders nothing when the social leaderboard is off', () => {
    mockIsEnabled = false;

    renderLeaderboard();

    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('shows the skeleton while the first page loads', () => {
    mockQueryResult({ traders: [], isLoading: true, hasFetched: false });

    renderLeaderboard();

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.SKELETON),
    ).toBeOnTheScreen();
  });

  it('shows the clear-filters empty state when applied filters match no traders', () => {
    const onClearFilters = jest.fn();
    renderLeaderboard({
      filters: { timeframe: '7d', ranking: 'pnl', cohort: 'whale' },
      filteredEmpty: true,
      onClearFilters,
    });

    fireEvent.press(screen.getByTestId('social-filter-empty-clear'));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId(SocialLeaderboardSelectorsIDs.ROWS)).toBeNull();
    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.EMPTY),
    ).toBeNull();
  });

  it('shows the empty state when the cohort filter matches no traders', () => {
    renderLeaderboard({
      filters: { timeframe: '7d', ranking: 'pnl', cohort: 'whale' },
    });

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.EMPTY),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(SocialLeaderboardSelectorsIDs.ROWS)).toBeNull();
  });

  it('shows the empty state when the ranking has no traders', () => {
    mockQueryResult({ traders: [] });

    renderLeaderboard();

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.EMPTY),
    ).toBeOnTheScreen();
  });

  it('shows the error state with a retry that refetches', () => {
    mockQueryResult({ traders: [], error: 'boom' });

    renderLeaderboard();
    fireEvent.press(screen.getByTestId(SocialLeaderboardSelectorsIDs.RETRY));

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('holds the fetch and shows the error state without retry when offline', () => {
    mockNetworkTier = 'NONE';
    mockQueryResult({ traders: [], hasFetched: false });

    renderLeaderboard();

    expect(mockUseTopTraders).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.RETRY),
    ).toBeNull();
  });

  it('pins the viewer above the rows and removes them from the list', () => {
    mockProfile = {
      profileId: 'someone-else',
      linkedAccountAddress: '0x00000000000000000000000000000000000000AA',
      handle: 'me',
      displayName: 'Me',
    };

    renderLeaderboard({ showViewerRow: true });

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.VIEWER_CARD),
    ).toBeOnTheScreen();
    expect(rowIds()).toEqual(['trader-row-mid', 'trader-row-low']);
  });

  it('builds the off-page viewer card from the trader profile', () => {
    mockProfile = {
      profileId: 'viewer',
      handle: 'me',
      displayName: 'Me',
    };
    mockUseQuery.mockReturnValue({
      data: {
        profile: {
          profileId: 'viewer',
          address: '0xabc',
          allAddresses: ['0xabc'],
          name: 'live-name',
          imageUrl: 'foxicon://agent/background1',
        },
        stats: { pnl7d: 12, roiPercent7d: 2.4 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
        },
        socialHandles: {},
        followerCount: 7,
        followingCount: 0,
        copytradedAllTime: { count: 0, volumeUSD: 0, distinctActors: 0 },
      },
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    renderLeaderboard({ showViewerRow: true });

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.VIEWER_CARD),
    ).toBeOnTheScreen();
    expect(screen.getByText('Me')).toBeOnTheScreen();
    expect(screen.getByText('+$12.00')).toBeOnTheScreen();
    expect(screen.queryByText('-')).toBeNull();
    expect(rowIds()).toHaveLength(3);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }),
    );
  });

  it('omits the off-page viewer card while the trader profile is loading', () => {
    mockProfile = {
      profileId: 'viewer',
      handle: 'me',
      displayName: 'Me',
    };
    mockUseQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      refetch: jest.fn(),
    });

    renderLeaderboard({ showViewerRow: true });

    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.VIEWER_CARD),
    ).toBeNull();
    expect(rowIds()).toHaveLength(3);
  });

  it('waits for the leaderboard before fetching the off-page viewer profile', () => {
    mockProfile = {
      profileId: 'viewer',
      handle: 'me',
      displayName: 'Me',
    };
    mockQueryResult({ hasFetched: false });

    renderLeaderboard({ showViewerRow: true });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.VIEWER_CARD),
    ).toBeNull();
  });

  it('shows zero metrics when the off-page profile has no pnl', () => {
    mockProfile = {
      profileId: 'viewer',
      handle: 'me',
      displayName: 'Me',
    };
    mockUseQuery.mockReturnValue({
      data: {
        profile: {
          profileId: 'viewer',
          address: '0xabc',
          allAddresses: ['0xabc'],
          name: 'live-name',
          imageUrl: null,
        },
        stats: {},
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
        },
        socialHandles: {},
        followerCount: 0,
        followingCount: 0,
        copytradedAllTime: { count: 0, volumeUSD: 0, distinctActors: 0 },
      },
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    renderLeaderboard({ showViewerRow: true });

    expect(screen.getByText('$0.00')).toBeOnTheScreen();
    expect(screen.getByText('+0.0%')).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialV1TraderRowSelectorsIDs.FOLLOWERS),
    ).toBeOnTheScreen();
  });

  it('falls back to the handle on the viewer card without a display name', () => {
    mockProfile = {
      profileId: 'viewer',
      handle: 'me',
      displayName: '',
    };
    mockUseQuery.mockReturnValue({
      data: {
        profile: {
          profileId: 'viewer',
          address: '0xabc',
          allAddresses: ['0xabc'],
          name: 'live-name',
        },
        stats: { pnl7d: 12 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
        },
        socialHandles: {},
        followerCount: 0,
        followingCount: 0,
        copytradedAllTime: { count: 0, volumeUSD: 0, distinctActors: 0 },
      },
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    renderLeaderboard({ showViewerRow: true });

    expect(screen.getByText('me')).toBeOnTheScreen();
  });

  it('omits the viewer card unless asked for', () => {
    mockProfile = { profileId: 'viewer', handle: 'me', displayName: 'Me' };

    renderLeaderboard();

    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.VIEWER_CARD),
    ).toBeNull();
  });

  it('tracks and opens the trader profile on row press', () => {
    renderLeaderboard({ source: { kind: 'all', assetClass: 'tokens' } });

    fireEvent.press(screen.getByTestId('trader-row-mid'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED,
      expect.objectContaining({
        trader_username: 'mid',
        trader_rank: 2,
        chain_filter: 'tokens',
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      expect.objectContaining({ traderId: 'mid', source: 'leaderboard' }),
      {},
    );
  });

  it('lets the host refresh through the ref', async () => {
    const ref = React.createRef<SocialLeaderboardHandle>();

    renderLeaderboard({ ref });
    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchViewerProfile).not.toHaveBeenCalled();
  });

  it('refreshes the off-page viewer profile with the leaderboard', async () => {
    mockProfile = {
      profileId: 'viewer',
      handle: 'me',
      displayName: 'Me',
    };
    const ref = React.createRef<SocialLeaderboardHandle>();

    renderLeaderboard({ ref, showViewerRow: true });
    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchViewerProfile).toHaveBeenCalledTimes(1);
  });

  it('does not fetch the viewer profile while the wallet is locked', async () => {
    mockIsUnlocked = false;
    mockProfile = {
      profileId: 'viewer',
      handle: 'me',
      displayName: 'Me',
    };
    const ref = React.createRef<SocialLeaderboardHandle>();

    renderLeaderboard({ ref, showViewerRow: true });
    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockRefetchViewerProfile).not.toHaveBeenCalled();
  });

  it('renders the title when given', () => {
    renderLeaderboard({ title: 'Top traders' });

    expect(screen.getByText('Top traders')).toBeOnTheScreen();
  });
});
