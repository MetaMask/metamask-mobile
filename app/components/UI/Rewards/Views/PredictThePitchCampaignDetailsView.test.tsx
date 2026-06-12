import React from 'react';
import { render } from '@testing-library/react-native';
import PredictThePitchCampaignDetailsView from './PredictThePitchCampaignDetailsView';
import {
  CampaignType,
  type CampaignDto,
  type PredictThePitchLeaderboardDto,
  type PredictThePitchPrizePoolDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetPredictThePitchPositions } from '../hooks/useGetPredictThePitchPositions';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { useGetPredictThePitchLeaderboard } from '../hooks/useGetPredictThePitchLeaderboard';
import { useGetPredictThePitchPrizePool } from '../hooks/useGetPredictThePitchPrizePool';
import { useGetPredictThePitchOutcome } from '../hooks/useGetPredictThePitchOutcome';

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
  const { View, Text } = jest.requireActual('react-native');
  return {
    ...actual,
    HeaderStandard: ({ title }: { title: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'header' },
        ReactActual.createElement(Text, null, title),
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
  strings: (key: string) => key,
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

const campaign: CampaignDto = {
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

const renderDetails = ({
  optedIn,
  positionCount,
}: {
  optedIn: boolean;
  positionCount: number;
}) => {
  mockUseRewardCampaigns.mockReturnValue({
    campaigns: [campaign],
    categorizedCampaigns: {
      active: [],
      upcoming: [],
      previous: [campaign],
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
      positions: Array.from({ length: positionCount }, (_, index) => ({
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
      })),
    },
    isLoading: false,
    hasError: false,
    hasFetched: true,
    refetch: jest.fn(),
  });
  mockUseGetPredictThePitchLeaderboardPosition.mockReturnValue({
    position: null,
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

  return render(<PredictThePitchCampaignDetailsView />);
};

describe('PredictThePitchCampaignDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows ended stats when complete and not opted in', () => {
    const { getByTestId } = renderDetails({ optedIn: false, positionCount: 0 });
    expect(getByTestId('campaign-ended-stats')).toBeDefined();
  });

  it('shows ended stats when complete, opted in, and has no position', () => {
    const { getByTestId } = renderDetails({ optedIn: true, positionCount: 0 });
    expect(getByTestId('campaign-ended-stats')).toBeDefined();
  });

  it('hides ended stats when complete, opted in, and has a position', () => {
    const { queryByTestId, getByTestId } = renderDetails({
      optedIn: true,
      positionCount: 1,
    });
    expect(queryByTestId('campaign-ended-stats')).toBeNull();
    expect(getByTestId('predict-the-pitch-stats-summary')).toBeDefined();
  });
});
