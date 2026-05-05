import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsTradingCampaignDetailsView, {
  PERPS_CAMPAIGN_DETAILS_TEST_IDS,
} from './PerpsTradingCampaignDetailsView';
import {
  type CampaignDto,
  CampaignType,
  type PerpsTradingCampaignLeaderboardEntry,
  type PerpsTradingCampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetPerpsTradingCampaignLeaderboard } from '../hooks/useGetPerpsTradingCampaignLeaderboard';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetPerpsTradingCampaignVolume } from '../hooks/useGetPerpsTradingCampaignVolume';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

const mockRouteState: { params: { campaignId?: string } } = {
  params: { campaignId: 'perps-campaign-1' },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    addListener: jest.fn(() => jest.fn()),
    isFocused: () => true,
  }),
  useRoute: () => mockRouteState,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Skeleton = (props: Record<string, unknown>) =>
    ReactActual.createElement(View, { testID: 'skeleton', ...props });
  return { ...actual, Skeleton };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        endButtonIconProps,
      }: {
        title: string;
        onBack: () => void;
        endButtonIconProps?: { testID?: string; onPress?: () => void }[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'perps-details-back-button',
          }),
          ...(endButtonIconProps ?? []).map((btn, i) =>
            ReactActual.createElement(Pressable, {
              key: i,
              onPress: btn.onPress,
              testID: btn.testID ?? `end-button-${i}`,
            }),
          ),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      edges?: unknown;
      style?: unknown;
    }) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('../components/Campaigns/CampaignStatus', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ campaign }: { campaign: { name: string } }) =>
      ReactActual.createElement(
        View,
        { testID: 'campaign-status' },
        ReactActual.createElement(Text, null, campaign.name),
      ),
  };
});

jest.mock('../components/Campaigns/CampaignHowItWorks', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-how-it-works' }),
  };
});

jest.mock('../components/Campaigns/PerpsCampaignStatsSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'perps-campaign-stats-summary-container',
      }),
  };
});

jest.mock('../components/Campaigns/PerpsTradingCampaignPrizePool', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'perps-prize-pool' }),
  };
});

jest.mock('../components/Campaigns/PerpsTradingCampaignLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS: {
      TOTAL_PARTICIPANTS: 'perps-campaign-leaderboard-total-participants',
    },
    default: () =>
      ReactActual.createElement(View, { testID: 'perps-leaderboard' }),
  };
});

jest.mock('../components/Campaigns/PerpsTradingCampaignCTA', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { getCampaignStatus } = jest.requireActual(
    '../components/Campaigns/CampaignTile.utils',
  ) as typeof import('../components/Campaigns/CampaignTile.utils');
  return {
    __esModule: true,
    default: ({ campaign }: { campaign: CampaignDto }) =>
      getCampaignStatus(campaign) === 'complete'
        ? null
        : ReactActual.createElement(View, { testID: 'perps-trading-cta' }),
  };
});

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'campaigns-load-error-banner' },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm, testID: 'campaigns-error-retry' },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../hooks/useRewardCampaigns');
const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;

jest.mock('../hooks/useGetCampaignParticipantStatus');
const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;

jest.mock('../hooks/useGetPerpsTradingCampaignLeaderboard');
const mockUseGetPerpsTradingCampaignLeaderboard =
  useGetPerpsTradingCampaignLeaderboard as jest.MockedFunction<
    typeof useGetPerpsTradingCampaignLeaderboard
  >;

jest.mock('../hooks/useGetPerpsTradingCampaignLeaderboardPosition');
const mockUseGetPerpsTradingCampaignLeaderboardPosition =
  useGetPerpsTradingCampaignLeaderboardPosition as jest.MockedFunction<
    typeof useGetPerpsTradingCampaignLeaderboardPosition
  >;

jest.mock('../hooks/useGetPerpsTradingCampaignVolume');
const mockUseGetPerpsTradingCampaignVolume =
  useGetPerpsTradingCampaignVolume as jest.MockedFunction<
    typeof useGetPerpsTradingCampaignVolume
  >;

import { useSelector } from 'react-redux';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockFetchCampaigns = jest.fn();

function buildPerpsCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'perps-campaign-1',
    type: CampaignType.PERPS_TRADING,
    name: 'Perps Trading',
    startDate: '2025-06-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.999Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    showUpcomingDate: false,
    ...overrides,
  };
}

function toMockLeaderboardPosition(
  position: { rank: number; neighbors: unknown[] } | null,
): PerpsTradingCampaignLeaderboardPositionDto | null {
  if (!position) {
    return null;
  }
  return {
    rank: position.rank,
    pnl: 0,
    notionalVolume: 0,
    marginDeployed: 0,
    qualified: true,
    neighbors: position.neighbors as PerpsTradingCampaignLeaderboardEntry[],
    computedAt: '2025-08-15T12:00:00.000Z',
  };
}

const defaultLeaderboardHook = {
  leaderboard: {
    campaignId: 'perps-campaign-1',
    entries: [],
    totalParticipants: 0,
    computedAt: '2025-08-15T12:00:00.000Z',
  },
  isLoading: false,
  hasError: false,
  isLeaderboardNotYetComputed: false,
  refetch: jest.fn(),
};

const defaultVolumeHook = {
  volume: {
    totalUsdVolume: '1000000',
  },
  isLoading: false,
  hasError: false,
  refetch: jest.fn(),
};

function setupHooks(
  overrides: {
    campaigns?: CampaignDto[];
    isCampaignsLoading?: boolean;
    hasCampaignsError?: boolean;
    participant?: { optedIn: boolean };
    position?: { rank: number; neighbors: unknown[] } | null;
    totalParticipants?: number;
  } = {},
) {
  const {
    campaigns = [buildPerpsCampaign()],
    isCampaignsLoading = false,
    hasCampaignsError = false,
    participant = { optedIn: false },
    position = null,
    totalParticipants: totalParticipantsOverride,
  } = overrides;

  mockUseRewardCampaigns.mockReturnValue({
    campaigns,
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    fetchCampaigns: mockFetchCampaigns,
    categorizedCampaigns: { active: [], upcoming: [], previous: [] },
    hasLoaded: true,
  } as ReturnType<typeof useRewardCampaigns>);

  mockUseGetCampaignParticipantStatus.mockReturnValue({
    status: {
      optedIn: participant.optedIn,
      participantCount: 0,
    },
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useGetCampaignParticipantStatus>);

  const leaderboard = {
    ...defaultLeaderboardHook.leaderboard,
    ...(totalParticipantsOverride !== undefined
      ? { totalParticipants: totalParticipantsOverride }
      : {}),
  };

  mockUseGetPerpsTradingCampaignLeaderboard.mockReturnValue({
    ...defaultLeaderboardHook,
    leaderboard,
  } as ReturnType<typeof useGetPerpsTradingCampaignLeaderboard>);

  mockUseGetPerpsTradingCampaignLeaderboardPosition.mockReturnValue({
    position: toMockLeaderboardPosition(position),
    isLoading: false,
    hasError: false,
    hasFetched: true,
    refetch: jest.fn(),
  } as ReturnType<typeof useGetPerpsTradingCampaignLeaderboardPosition>);

  mockUseGetPerpsTradingCampaignVolume.mockReturnValue({
    ...defaultVolumeHook,
  } as ReturnType<typeof useGetPerpsTradingCampaignVolume>);
}

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { count?: string }) => {
    if (
      key === 'rewards.perps_trading_campaign.leaderboard_total_participants' &&
      params?.count !== undefined
    ) {
      return `${params.count} participants`;
    }
    const map: Record<string, string> = {
      'rewards.perps_trading_campaign.title': 'Perps Trading',
      'rewards.perps_trading_campaign.stats_title': 'Stats',
      'rewards.perps_trading_campaign.prize_pool_title': 'Prize pool',
      'rewards.perps_trading_campaign.leaderboard_title': 'Leaderboard',
      'rewards.campaigns_view.error_title': 'Error',
      'rewards.campaigns_view.error_description': 'Try again',
      'rewards.campaigns_view.retry_button': 'Retry',
    };
    return map[key] ?? key;
  },
}));

describe('PerpsTradingCampaignDetailsView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
    jest.clearAllMocks();
    mockRouteState.params = { campaignId: 'perps-campaign-1' };
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectReferralCode) {
        return 'ref-code';
      }
      return undefined;
    });
    setupHooks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders skeletons while campaigns load and no campaign resolved', () => {
    setupHooks({ campaigns: [], isCampaignsLoading: true });
    const { getAllByTestId, queryByTestId } = render(
      <PerpsTradingCampaignDetailsView />,
    );

    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(2);
    expect(queryByTestId('campaign-status')).toBeNull();
  });

  it('renders campaigns error banner and retries fetchCampaigns', () => {
    setupHooks({
      campaigns: [],
      isCampaignsLoading: false,
      hasCampaignsError: true,
    });
    const { getByTestId } = render(<PerpsTradingCampaignDetailsView />);

    fireEvent.press(getByTestId('campaigns-error-retry'));
    expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
  });

  it('renders header, campaign status, prize pool, leaderboard, and CTA for active campaign', () => {
    const { getByTestId, getByText } = render(
      <PerpsTradingCampaignDetailsView />,
    );

    expect(
      getByTestId(PERPS_CAMPAIGN_DETAILS_TEST_IDS.CONTAINER),
    ).toBeDefined();
    expect(getByTestId('header')).toBeDefined();
    expect(getByTestId('campaign-status')).toBeDefined();
    expect(getByTestId('perps-prize-pool')).toBeDefined();
    expect(getByTestId('perps-leaderboard')).toBeDefined();
    expect(getByTestId('perps-trading-cta')).toBeDefined();
  });

  it('hides How it works when the user has a leaderboard position', () => {
    setupHooks({
      campaigns: [
        buildPerpsCampaign({
          details: {
            howItWorks: {
              title: 'How it works',
              description: 'Test description',
              steps: [],
            },
          },
        }),
      ],
      participant: { optedIn: true },
      position: { rank: 5, neighbors: [] },
    });

    const { queryByTestId } = render(<PerpsTradingCampaignDetailsView />);
    expect(queryByTestId('campaign-how-it-works')).toBeNull();
  });

  it('shows How it works when active, user has no leaderboard position, and details include howItWorks', () => {
    setupHooks({
      campaigns: [
        buildPerpsCampaign({
          details: {
            howItWorks: {
              title: 'How it works',
              description: 'Test description',
              steps: [],
            },
          },
        }),
      ],
    });

    const { getByTestId } = render(<PerpsTradingCampaignDetailsView />);
    expect(getByTestId('campaign-how-it-works')).toBeDefined();
  });

  it('shows stats header when user has a leaderboard position', () => {
    setupHooks({
      participant: { optedIn: true },
      position: { rank: 3, neighbors: [] },
    });

    const { getByTestId } = render(<PerpsTradingCampaignDetailsView />);
    expect(getByTestId('perps-campaign-stats-summary-container')).toBeDefined();
  });

  it('navigates to stats when stats header row is pressed and user has a position', () => {
    setupHooks({
      participant: { optedIn: true },
      position: { rank: 2, neighbors: [] },
    });

    const { getByText } = render(<PerpsTradingCampaignDetailsView />);

    fireEvent.press(getByText('Stats'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_PERPS_TRADING_CAMPAIGN_STATS,
      { campaignId: 'perps-campaign-1' },
    );
  });

  it('navigates to full leaderboard and mechanics help', () => {
    const { getByText, getByTestId } = render(
      <PerpsTradingCampaignDetailsView />,
    );

    fireEvent.press(getByText('Leaderboard'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_PERPS_TRADING_CAMPAIGN_LEADERBOARD,
      { campaignId: 'perps-campaign-1' },
    );

    fireEvent.press(getByTestId('perps-details-mechanics-button'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_CAMPAIGN_MECHANICS,
      { campaignId: 'perps-campaign-1' },
    );
  });

  it('complete campaign shows leaderboard without stats row and hides CTA', () => {
    setupHooks({
      campaigns: [
        buildPerpsCampaign({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2025-01-01T00:00:00.000Z',
        }),
      ],
    });

    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignDetailsView />,
    );

    expect(getByTestId('perps-leaderboard')).toBeDefined();
    expect(queryByTestId('perps-campaign-stats-summary-container')).toBeNull();
    expect(queryByTestId('perps-prize-pool')).toBeNull();
    expect(queryByTestId('perps-trading-cta')).toBeNull();
  });

  it('displays total participant count when the leaderboard reports participants', () => {
    setupHooks({ totalParticipants: 1500 });

    const { getByText, getByTestId } = render(
      <PerpsTradingCampaignDetailsView />,
    );

    expect(
      getByTestId('perps-campaign-leaderboard-total-participants'),
    ).toBeDefined();
    expect(getByText('1,500 participants')).toBeDefined();
  });

  it('hides the prize pool section for upcoming campaigns', () => {
    setupHooks({
      campaigns: [
        buildPerpsCampaign({
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2027-12-31T23:59:59.999Z',
        }),
      ],
    });

    const { queryByTestId } = render(<PerpsTradingCampaignDetailsView />);
    expect(queryByTestId('perps-prize-pool')).toBeNull();
  });

  it('resolves campaign by PERPS_TRADING type when route has no campaignId', () => {
    mockRouteState.params = {};
    setupHooks({
      campaigns: [buildPerpsCampaign({ id: 'resolved-by-type' })],
    });

    const { getByTestId } = render(<PerpsTradingCampaignDetailsView />);
    expect(getByTestId('campaign-status')).toBeDefined();

    fireEvent.press(getByTestId('perps-details-mechanics-button'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_CAMPAIGN_MECHANICS,
      { campaignId: 'resolved-by-type' },
    );
  });
});
