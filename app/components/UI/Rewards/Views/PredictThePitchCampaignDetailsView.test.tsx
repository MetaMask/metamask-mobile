import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictThePitchCampaignDetailsView, {
  resetPredictThePitchCampaignDetailsSessionAutoNavigationForTests,
} from './PredictThePitchCampaignDetailsView';
import {
  CampaignType,
  type CampaignDto,
  type PredictThePitchLeaderboardDto,
  type PredictThePitchLeaderboardPositionDto,
  type PredictThePitchPrizePoolDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetPredictThePitchPositions } from '../hooks/useGetPredictThePitchPositions';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { useGetPredictThePitchLeaderboard } from '../hooks/useGetPredictThePitchLeaderboard';
import { useGetPredictThePitchPrizePool } from '../hooks/useGetPredictThePitchPrizePool';
import { useGetPredictThePitchOutcome } from '../hooks/useGetPredictThePitchOutcome';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockRouteState = {
  params: { campaignId: 'predict-campaign-1' },
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
  useRoute: () => mockRouteState,
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'REF123'),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    HeaderStandard: ({
      title,
      endButtonIconProps,
    }: {
      title: string;
      endButtonIconProps?: { testID?: string; onPress?: () => void }[];
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'header' },
        ReactActual.createElement(Text, null, title),
        ...(endButtonIconProps ?? []).map((btn, index) =>
          ReactActual.createElement(Pressable, {
            key: index,
            onPress: btn.onPress,
            testID: btn.testID,
          }),
        ),
      ),
    Skeleton: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { testID: 'skeleton', ...props }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

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
    }) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../components/Campaigns/CampaignStatus', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-status' }),
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

jest.mock('../components/Campaigns/CampaignEndedStats', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-ended-stats' }),
  };
});

jest.mock('../components/Campaigns/PredictThePitchStatsSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'predict-the-pitch-stats-summary',
      }),
  };
});

jest.mock('../components/Campaigns/PredictThePitchPortfolio', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'predict-the-pitch-portfolio',
      }),
  };
});

jest.mock('../components/Campaigns/PredictThePitchPrizePool', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'predict-the-pitch-prize-pool',
      }),
  };
});

jest.mock('../components/Campaigns/PredictThePitchLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS: {
      TOTAL_PARTICIPANTS: 'predict-the-pitch-leaderboard-total-participants',
    },
    default: () =>
      ReactActual.createElement(View, {
        testID: 'predict-the-pitch-leaderboard',
      }),
  };
});

jest.mock('../components/Campaigns/PredictThePitchCampaignCTA', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'predict-the-pitch-cta' }),
  };
});

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: 'error-banner' }),
  };
});

jest.mock('../hooks/useRewardCampaigns');
jest.mock('../hooks/useGetCampaignParticipantStatus');
jest.mock('../hooks/useGetPredictThePitchPositions');
jest.mock('../hooks/useGetPredictThePitchLeaderboardPosition');
jest.mock('../hooks/useGetPredictThePitchLeaderboard');
jest.mock('../hooks/useGetPredictThePitchPrizePool');
jest.mock('../hooks/useGetPredictThePitchOutcome');
jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { count?: string }) => {
    if (
      key ===
        'rewards.predict_the_pitch_campaign.leaderboard_total_participants' &&
      params?.count !== undefined
    ) {
      return `${params.count} participants`;
    }
    const map: Record<string, string> = {
      'rewards.predict_the_pitch_campaign.title': 'Predict The Pitch',
      'rewards.predict_the_pitch_campaign.stats_title': 'Stats',
      'rewards.predict_the_pitch_campaign.positions_title': 'Your predictions',
      'rewards.predict_the_pitch_campaign.positions_open_badge':
        '{{count}} open',
      'rewards.predict_the_pitch_campaign.positions_closed_badge':
        '{{count}} closed',
      'rewards.predict_the_pitch_campaign.leaderboard_title': 'Leaderboard',
      'rewards.campaign_prize_pool.title': 'Prize pool',
    };
    if (
      key === 'rewards.predict_the_pitch_campaign.positions_open_badge' &&
      params?.count !== undefined
    ) {
      return `${params.count} open`;
    }
    if (
      key === 'rewards.predict_the_pitch_campaign.positions_closed_badge' &&
      params?.count !== undefined
    ) {
      return `${params.count} closed`;
    }
    return map[key] ?? key;
  },
}));

const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;
const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;
const mockUseGetPredictThePitchPositions =
  useGetPredictThePitchPositions as jest.MockedFunction<
    typeof useGetPredictThePitchPositions
  >;
const mockUseGetPredictThePitchLeaderboardPosition =
  useGetPredictThePitchLeaderboardPosition as jest.MockedFunction<
    typeof useGetPredictThePitchLeaderboardPosition
  >;
const mockUseGetPredictThePitchLeaderboard =
  useGetPredictThePitchLeaderboard as jest.MockedFunction<
    typeof useGetPredictThePitchLeaderboard
  >;
const mockUseGetPredictThePitchPrizePool =
  useGetPredictThePitchPrizePool as jest.MockedFunction<
    typeof useGetPredictThePitchPrizePool
  >;
const mockUseGetPredictThePitchOutcome =
  useGetPredictThePitchOutcome as jest.MockedFunction<
    typeof useGetPredictThePitchOutcome
  >;

const completeCampaign: CampaignDto = {
  id: 'predict-campaign-1',
  type: CampaignType.PREDICT_THE_PITCH,
  name: 'Predict The Pitch',
  startDate: '2020-01-01T00:00:00.000Z',
  endDate: '2021-01-01T00:00:00.000Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: {
    howItWorks: {
      title: 'How it works',
      description: 'Predict markets.',
      steps: [],
    },
  },
  featured: false,
  showUpcomingDate: false,
};

const activeCampaign: CampaignDto = {
  ...completeCampaign,
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2099-12-31T23:59:59Z',
};

const leaderboard: PredictThePitchLeaderboardDto = {
  campaignId: 'predict-campaign-1',
  computedAt: '2025-01-01T00:00:00.000Z',
  totalParticipants: 10,
  entries: [],
};

const prizePool: PredictThePitchPrizePoolDto = {
  totalVolumeUsd: 100,
  unlockedPoolUsd: 10,
  thresholdsUsd: [0, 100],
  poolScheduleUsd: [10, 20],
  breakdown: [],
  computedAt: '2025-01-01T00:00:00.000Z',
};

const baseLeaderboardPosition: PredictThePitchLeaderboardPositionDto = {
  rank: 2,
  totalParticipants: 10,
  roi: 0.1,
  pnl: 50,
  volume: 100,
  eligible: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
  marketsTraded: 3,
  minimumMarketsTraded: 3,
};

interface SetupHooksOptions {
  campaigns?: CampaignDto[];
  optedIn?: boolean;
  portfolioPositionCount?: number;
  resolvedPositionCount?: number;
  leaderboardPosition?: PredictThePitchLeaderboardPositionDto | null;
}

function setupHooks({
  campaigns = [completeCampaign],
  optedIn = false,
  portfolioPositionCount = 0,
  resolvedPositionCount = 0,
  leaderboardPosition = null,
}: SetupHooksOptions = {}) {
  mockUseRewardCampaigns.mockReturnValue({
    campaigns,
    categorizedCampaigns: {
      active: campaigns.filter((c) => c.endDate > '2025-08-15T12:00:00.000Z'),
      upcoming: [],
      previous: campaigns.filter(
        (c) => c.endDate <= '2025-08-15T12:00:00.000Z',
      ),
    },
    isLoading: false,
    hasError: false,
    hasLoaded: true,
    fetchCampaigns: jest.fn(),
  });
  mockUseGetCampaignParticipantStatus.mockReturnValue({
    status: { optedIn, participantCount: 0 },
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
  });
  mockUseGetPredictThePitchPositions.mockReturnValue({
    positions: {
      computedAt: null,
      openPositions: Array.from(
        { length: portfolioPositionCount },
        (_, index) => ({
          outcomeAssetId: `token-${index}`,
          outcomeAsset: 'Yes',
          conditionId: `condition-${index}`,
          conditionName: `Position ${index}`,
          conditionSlug: null,
          eventId: null,
          eventSlug: null,
          iconUrl: null,
          capitalDeployed: 10,
          pnl: 1,
          roi: 0.1,
          status: 'open' as const,
          fillShares: 5,
          fillSharesBought: 5,
          fillSharesSold: 0,
          fillPrice: 2,
          fillDate: '2025-01-01T00:00:00.000Z',
        }),
      ),
      resolvedPositions: Array.from(
        { length: resolvedPositionCount },
        (_, index) => ({
          outcomeAssetId: `resolved-token-${index}`,
          outcomeAsset: 'Yes',
          conditionId: `resolved-condition-${index}`,
          conditionName: `Resolved ${index}`,
          conditionSlug: null,
          eventId: null,
          eventSlug: null,
          iconUrl: null,
          capitalDeployed: 10,
          pnl: 1,
          roi: 0.1,
          status: 'resolved' as const,
          fillShares: 0,
          fillSharesBought: 5,
          fillSharesSold: 5,
          fillPrice: 2,
          fillDate: '2025-01-01T00:00:00.000Z',
        }),
      ),
    },
    isLoading: false,
    hasError: false,
    hasFetched: true,
    refetch: jest.fn(),
  });
  mockUseGetPredictThePitchLeaderboardPosition.mockReturnValue({
    position: leaderboardPosition,
    isLoading: false,
    hasError: false,
    hasFetched: true,
    refetch: jest.fn(),
  });
  mockUseGetPredictThePitchLeaderboard.mockReturnValue({
    leaderboard,
    isLoading: false,
    hasError: false,
    isLeaderboardNotYetComputed: false,
    refetch: jest.fn(),
  });
  mockUseGetPredictThePitchPrizePool.mockReturnValue({
    prizePool,
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
  });
  mockUseGetPredictThePitchOutcome.mockReturnValue({
    outcome: null,
    isLoading: false,
    hasError: false,
  });
}

describe('PredictThePitchCampaignDetailsView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
    jest.clearAllMocks();
    resetPredictThePitchCampaignDetailsSessionAutoNavigationForTests();
    mockRouteState.params = { campaignId: 'predict-campaign-1' };
    setupHooks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows ended stats when complete and not opted in', () => {
    const { getByTestId } = render(<PredictThePitchCampaignDetailsView />);
    expect(getByTestId('campaign-ended-stats')).toBeDefined();
  });

  it('shows ended stats when complete, opted in, and has no leaderboard position', () => {
    setupHooks({ optedIn: true, portfolioPositionCount: 1 });

    const { getByTestId } = render(<PredictThePitchCampaignDetailsView />);
    expect(getByTestId('campaign-ended-stats')).toBeDefined();
  });

  it('hides ended stats when complete, opted in, and has positive leaderboard volume', () => {
    setupHooks({
      optedIn: true,
      portfolioPositionCount: 1,
      leaderboardPosition: baseLeaderboardPosition,
    });

    const { queryByTestId, getByTestId } = render(
      <PredictThePitchCampaignDetailsView />,
    );
    expect(queryByTestId('campaign-ended-stats')).toBeNull();
    expect(getByTestId('predict-the-pitch-stats-summary')).toBeDefined();
  });

  it('shows stats summary when user has positive leaderboard volume', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      leaderboardPosition: baseLeaderboardPosition,
    });

    const { getByTestId } = render(<PredictThePitchCampaignDetailsView />);
    expect(getByTestId('predict-the-pitch-stats-summary')).toBeDefined();
  });

  it('hides stats summary when leaderboard volume is zero', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      leaderboardPosition: { ...baseLeaderboardPosition, volume: 0 },
    });

    const { queryByTestId } = render(<PredictThePitchCampaignDetailsView />);
    expect(queryByTestId('predict-the-pitch-stats-summary')).toBeNull();
  });

  it('hides stats summary when leaderboard volume is not finite', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      leaderboardPosition: {
        ...baseLeaderboardPosition,
        volume: Number.NaN,
      },
    });

    const { queryByTestId } = render(<PredictThePitchCampaignDetailsView />);
    expect(queryByTestId('predict-the-pitch-stats-summary')).toBeNull();
  });

  it('navigates to stats when stats header row is pressed and user has leaderboard volume', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      leaderboardPosition: baseLeaderboardPosition,
    });

    const { getByText } = render(<PredictThePitchCampaignDetailsView />);

    fireEvent.press(getByText('Stats'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_STATS,
      { campaignId: 'predict-campaign-1' },
    );
  });

  it('shows portfolio section for active opted-in users with portfolio positions', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      portfolioPositionCount: 2,
      leaderboardPosition: baseLeaderboardPosition,
    });

    const { getByTestId } = render(<PredictThePitchCampaignDetailsView />);
    expect(getByTestId('predict-the-pitch-portfolio')).toBeDefined();
  });

  it('shows open positions count badge when user has open positions', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      portfolioPositionCount: 2,
      resolvedPositionCount: 1,
      leaderboardPosition: baseLeaderboardPosition,
    });

    const { getByTestId } = render(<PredictThePitchCampaignDetailsView />);

    expect(
      getByTestId('predict-the-pitch-campaign-details-positions-count-badge')
        .props.children,
    ).toBe('2 open');
  });

  it('shows closed positions count badge when user has no open positions', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      portfolioPositionCount: 0,
      resolvedPositionCount: 3,
      leaderboardPosition: baseLeaderboardPosition,
    });

    const { getByTestId } = render(<PredictThePitchCampaignDetailsView />);

    expect(
      getByTestId('predict-the-pitch-campaign-details-positions-count-badge')
        .props.children,
    ).toBe('3 closed');
  });

  it('navigates to portfolio, leaderboard, and mechanics', () => {
    setupHooks({
      campaigns: [activeCampaign],
      optedIn: true,
      portfolioPositionCount: 1,
      leaderboardPosition: baseLeaderboardPosition,
    });

    const { getByText, getByTestId } = render(
      <PredictThePitchCampaignDetailsView />,
    );

    fireEvent.press(getByText('Your predictions'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW,
      { campaignId: 'predict-campaign-1' },
    );

    fireEvent.press(getByText('Leaderboard'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_LEADERBOARD,
      { campaignId: 'predict-campaign-1' },
    );

    fireEvent.press(
      getByTestId('predict-the-pitch-campaign-details-mechanics-button'),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_CAMPAIGN_MECHANICS,
      { campaignId: 'predict-campaign-1' },
    );
  });
});
