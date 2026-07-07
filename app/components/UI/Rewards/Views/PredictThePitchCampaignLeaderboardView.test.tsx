import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PredictThePitchCampaignLeaderboardView, {
  PREDICT_THE_PITCH_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS,
} from './PredictThePitchCampaignLeaderboardView';
import { useGetPredictThePitchLeaderboard } from '../hooks/useGetPredictThePitchLeaderboard';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import {
  CampaignType,
  type PredictThePitchLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

const mockGoBack = jest.fn();
const mockPredictLeaderboard = jest.fn();
const mockPredictStatsHeader = jest.fn();

const CAMPAIGN_ID = 'predict-lb-campaign-1';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({
    params: { campaignId: CAMPAIGN_ID },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    HeaderStandard: ({
      title,
      onBack,
      backButtonProps,
    }: {
      title: string;
      onBack: () => void;
      backButtonProps?: { testID?: string };
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'predict-lb-header' },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Pressable, {
          onPress: onBack,
          testID: backButtonProps?.testID ?? 'predict-lb-back',
        }),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

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
    }) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../components/Campaigns/PredictThePitchLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS: {},
    default: (props: Record<string, unknown>) => {
      mockPredictLeaderboard(props);
      return ReactActual.createElement(View, {
        testID: 'predict-leaderboard-mock',
      });
    },
  };
});

jest.mock('../components/Campaigns/PredictThePitchStatsHeader', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockPredictStatsHeader(props);
      return ReactActual.createElement(View, {
        testID: 'predict-lb-stats-header-mock',
      });
    },
  };
});

jest.mock('../hooks/useGetPredictThePitchLeaderboard');
jest.mock('../hooks/useGetPredictThePitchLeaderboardPosition');
jest.mock('../hooks/useGetCampaignParticipantStatus');
jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseGetLeaderboard =
  useGetPredictThePitchLeaderboard as jest.MockedFunction<
    typeof useGetPredictThePitchLeaderboard
  >;
const mockUseGetPosition =
  useGetPredictThePitchLeaderboardPosition as jest.MockedFunction<
    typeof useGetPredictThePitchLeaderboardPosition
  >;
const mockUseGetParticipant =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;

const basePosition: PredictThePitchLeaderboardPositionDto = {
  rank: 4,
  totalParticipants: 50,
  roi: 0.25,
  pnl: 50,
  volume: 200,
  eligible: true,
  neighbors: [{ rank: 3, referralCode: 'A', roi: 0.3 }],
  computedAt: '2025-01-01T00:00:00.000Z',
  marketsTraded: 3,
  minimumMarketsTraded: 3,
};

const leaderboardHookDefaults = {
  leaderboard: {
    campaignId: CAMPAIGN_ID,
    computedAt: '2025-01-01T00:00:00.000Z',
    entries: [{ rank: 1, referralCode: 'A', roi: 0.5 }],
    totalParticipants: 50,
  },
  isLoading: false,
  hasError: false,
  isLeaderboardNotYetComputed: false,
  refetch: jest.fn(),
};

const mockCampaign = {
  id: CAMPAIGN_ID,
  type: CampaignType.PREDICT_THE_PITCH,
  name: 'Predict Test',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2099-12-31T23:59:59Z',
  termsAndConditions: null,
  excludedRegions: [],
  featured: false,
  details: { howItWorks: { title: '', description: '', steps: [] } },
};

const mockState = {
  rewards: {
    referralCode: 'REFCODE99',
    campaigns: [mockCampaign],
  },
};

describe('PredictThePitchCampaignLeaderboardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(mockState),
    );
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: false, participantCount: 0 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetLeaderboard.mockReturnValue(leaderboardHookDefaults);
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
  });

  it('renders with the correct container testID', () => {
    const { getByTestId } = render(<PredictThePitchCampaignLeaderboardView />);
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.CONTAINER,
      ),
    ).toBeDefined();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<PredictThePitchCampaignLeaderboardView />);
    fireEvent.press(getByTestId('predict-the-pitch-leaderboard-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('fetches leaderboard with route campaignId', () => {
    render(<PredictThePitchCampaignLeaderboardView />);
    expect(mockUseGetLeaderboard).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  it('does not render the stats header when the user is not opted in', () => {
    const { queryByTestId } = render(
      <PredictThePitchCampaignLeaderboardView />,
    );
    expect(queryByTestId('predict-lb-stats-header-mock')).toBeNull();
  });

  it('passes undefined to position hook when not opted in', () => {
    render(<PredictThePitchCampaignLeaderboardView />);
    expect(mockUseGetPosition).toHaveBeenCalledWith(undefined);
  });

  it('renders the stats header when opted in with deployed capital', () => {
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 10 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetPosition.mockReturnValue({
      position: basePosition,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<PredictThePitchCampaignLeaderboardView />);
    expect(getByTestId('predict-lb-stats-header-mock')).toBeDefined();
    expect(mockUseGetPosition).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(mockPredictStatsHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        position: basePosition,
        isLoading: false,
      }),
    );
  });

  it('does not render the stats header when opted in with zero capital deployed', () => {
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 10 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetPosition.mockReturnValue({
      position: { ...basePosition, volume: 0 },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(
      <PredictThePitchCampaignLeaderboardView />,
    );

    expect(queryByTestId('predict-lb-stats-header-mock')).toBeNull();
    expect(mockPredictLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        userPosition: {
          rank: basePosition.rank,
          neighbors: basePosition.neighbors,
        },
      }),
    );
  });

  it('passes null userPosition to leaderboard when rank is missing', () => {
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 10 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        rank: null,
        neighbors: null,
      } as unknown as PredictThePitchLeaderboardPositionDto,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    render(<PredictThePitchCampaignLeaderboardView />);

    expect(mockPredictLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        userPosition: null,
      }),
    );
  });

  it('passes isCampaignComplete to stats header and leaderboard when campaign ended', () => {
    const completedCampaign = {
      ...mockCampaign,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2025-01-01T00:00:00Z',
    };
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        rewards: {
          referralCode: 'REFCODE99',
          campaigns: [completedCampaign],
        },
      }),
    );
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 10 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetPosition.mockReturnValue({
      position: basePosition,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));

    render(<PredictThePitchCampaignLeaderboardView />);

    expect(mockPredictStatsHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        isCampaignComplete: true,
      }),
    );
    expect(mockPredictLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        isCampaignComplete: true,
      }),
    );

    jest.useRealTimers();
  });

  it('passes leaderboard data and referral code to PredictThePitchLeaderboard', () => {
    render(<PredictThePitchCampaignLeaderboardView />);
    expect(mockPredictLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: leaderboardHookDefaults.leaderboard?.entries,
        isLoading: leaderboardHookDefaults.isLoading,
        hasError: leaderboardHookDefaults.hasError,
        isLeaderboardNotYetComputed:
          leaderboardHookDefaults.isLeaderboardNotYetComputed,
        currentUserReferralCode: 'REFCODE99',
        onRetry: leaderboardHookDefaults.refetch,
        isCampaignComplete: false,
      }),
    );
  });
});
