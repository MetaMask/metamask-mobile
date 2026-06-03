import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PerpsTradingCampaignLeaderboardView, {
  PERPS_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS,
} from './PerpsTradingCampaignLeaderboardView';
import { useGetPerpsTradingCampaignLeaderboard } from '../hooks/useGetPerpsTradingCampaignLeaderboard';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import {
  CampaignType,
  type PerpsTradingCampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

const mockGoBack = jest.fn();
const mockPerpsLeaderboard = jest.fn();
const mockPerpsStatsHeader = jest.fn();

const CAMPAIGN_ID = 'perps-lb-campaign-1';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({
    params: { campaignId: CAMPAIGN_ID },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
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
        backButtonProps,
      }: {
        title: string;
        onBack: () => void;
        backButtonProps?: { testID?: string };
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'perps-lb-header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: backButtonProps?.testID ?? 'perps-lb-back',
          }),
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
    }) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../components/Campaigns/PerpsTradingCampaignLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockPerpsLeaderboard(props);
      return ReactActual.createElement(View, {
        testID: 'perps-leaderboard-mock',
      });
    },
  };
});

jest.mock('../components/Campaigns/PerpsTradingCampaignStatsHeader', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockPerpsStatsHeader(props);
      return ReactActual.createElement(View, {
        testID: 'perps-lb-stats-header-mock',
      });
    },
  };
});

jest.mock('../hooks/useGetPerpsTradingCampaignLeaderboard');
jest.mock('../hooks/useGetPerpsTradingCampaignLeaderboardPosition');
jest.mock('../hooks/useGetCampaignParticipantStatus');

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseGetLeaderboard =
  useGetPerpsTradingCampaignLeaderboard as jest.MockedFunction<
    typeof useGetPerpsTradingCampaignLeaderboard
  >;
const mockUseGetPosition =
  useGetPerpsTradingCampaignLeaderboardPosition as jest.MockedFunction<
    typeof useGetPerpsTradingCampaignLeaderboardPosition
  >;
const mockUseGetParticipant =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;

const basePosition: PerpsTradingCampaignLeaderboardPositionDto = {
  rank: 4,
  totalParticipants: 50,
  pnl: 1000,
  volume: 10_000,
  eligible: true,
  minVolumeForEligibility: 25_000,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
};

const leaderboardHookDefaults = {
  leaderboard: {
    campaignId: CAMPAIGN_ID,
    computedAt: '2025-01-01T00:00:00.000Z',
    entries: [{ rank: 1, referralCode: 'A', pnl: 1, volume: 30_000 }],
    totalParticipants: 50,
    minVolumeForEligibility: 25_000,
  },
  isLoading: false,
  hasError: false,
  isLeaderboardNotYetComputed: false,
  refetch: jest.fn(),
};

const mockCampaign = {
  id: CAMPAIGN_ID,
  type: CampaignType.PERPS_TRADING,
  name: 'Perps Test',
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

describe('PerpsTradingCampaignLeaderboardView', () => {
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
    const { getByTestId } = render(<PerpsTradingCampaignLeaderboardView />);
    expect(
      getByTestId(PERPS_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.CONTAINER),
    ).toBeDefined();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<PerpsTradingCampaignLeaderboardView />);
    fireEvent.press(getByTestId('perps-leaderboard-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('fetches leaderboard with route campaignId', () => {
    render(<PerpsTradingCampaignLeaderboardView />);
    expect(mockUseGetLeaderboard).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  it('does not render the stats header when the user is not opted in', () => {
    const { queryByTestId } = render(<PerpsTradingCampaignLeaderboardView />);
    expect(queryByTestId('perps-lb-stats-header-mock')).toBeNull();
  });

  it('passes undefined to position hook when not opted in', () => {
    render(<PerpsTradingCampaignLeaderboardView />);
    expect(mockUseGetPosition).toHaveBeenCalledWith(undefined);
  });

  it('renders the stats header and passes campaignId to position hook when opted in', () => {
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

    const { getByTestId } = render(<PerpsTradingCampaignLeaderboardView />);
    expect(getByTestId('perps-lb-stats-header-mock')).toBeDefined();
    expect(mockUseGetPosition).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(mockPerpsStatsHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        position: basePosition,
        isLoading: false,
      }),
    );
  });

  it('does not render the stats header when opted in without a position', () => {
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 10 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(<PerpsTradingCampaignLeaderboardView />);

    expect(queryByTestId('perps-lb-stats-header-mock')).toBeNull();
    expect(mockUseGetPosition).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  it('does not render the stats header or user leaderboard position when rank is invalid', () => {
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
        volume: 0,
      } as unknown as PerpsTradingCampaignLeaderboardPositionDto,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(<PerpsTradingCampaignLeaderboardView />);

    expect(queryByTestId('perps-lb-stats-header-mock')).toBeNull();
    expect(mockPerpsLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        userPosition: null,
      }),
    );
  });

  it('does not render the stats header when opted in with rank but zero notional volume', () => {
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 10 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        volume: 0,
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(<PerpsTradingCampaignLeaderboardView />);

    expect(queryByTestId('perps-lb-stats-header-mock')).toBeNull();
    expect(mockPerpsLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        userPosition: { rank: basePosition.rank, neighbors: [] },
      }),
    );
  });

  it('passes isCampaignComplete to the stats header and leaderboard when campaign ended', () => {
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

    render(<PerpsTradingCampaignLeaderboardView />);

    expect(mockPerpsStatsHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        isCampaignComplete: true,
      }),
    );
    expect(mockPerpsLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        isCampaignComplete: true,
      }),
    );

    jest.useRealTimers();
  });

  it('passes leaderboard data and user position to PerpsTradingCampaignLeaderboard', () => {
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

    render(<PerpsTradingCampaignLeaderboardView />);
    expect(mockPerpsLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: leaderboardHookDefaults.leaderboard?.entries,
        isLoading: leaderboardHookDefaults.isLoading,
        hasError: leaderboardHookDefaults.hasError,
        isLeaderboardNotYetComputed:
          leaderboardHookDefaults.isLeaderboardNotYetComputed,
        currentUserReferralCode: 'REFCODE99',
        userPosition: {
          rank: basePosition.rank,
          neighbors: basePosition.neighbors,
        },
        campaignId: CAMPAIGN_ID,
        onRetry: leaderboardHookDefaults.refetch,
        isCampaignComplete: false,
      }),
    );
  });

  it('renders the leaderboard section', () => {
    const { getByTestId } = render(<PerpsTradingCampaignLeaderboardView />);
    expect(getByTestId('perps-leaderboard-mock')).toBeDefined();
  });
});
