import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PredictThePitchCampaignStatsView, {
  PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS,
} from './PredictThePitchCampaignStatsView';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import {
  CampaignType,
  type PredictThePitchLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockPredictStatsHeader = jest.fn();

const CAMPAIGN_ID = 'predict-stats-campaign-1';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({
    params: { campaignId: CAMPAIGN_ID },
  }),
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
        backButtonProps,
        endButtonIconProps,
      }: {
        title: string;
        onBack: () => void;
        backButtonProps?: { testID?: string };
        endButtonIconProps?: { testID?: string; onPress?: () => void }[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'predict-the-pitch-stats-header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: backButtonProps?.testID ?? 'predict-the-pitch-stats-back',
          }),
          ...(endButtonIconProps ?? []).map((btn, i) =>
            ReactActual.createElement(Pressable, {
              key: i,
              onPress: btn.onPress,
              testID: btn.testID,
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
    }) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../components/Campaigns/PredictThePitchStatsHeader', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockPredictStatsHeader(props);
      return ReactActual.createElement(View, {
        testID: 'predict-the-pitch-stats-header-mock',
      });
    },
  };
});

jest.mock('../utils/formatUtils', () => ({
  formatPercentChange: (value: number) => `PCT_${String(value)}`,
  formatSignedUsd: (value: number) => `SIGNED_USD_${String(value)}`,
  formatUsd: (value: number) => `USD_${String(value)}`,
  formatRewardsTimeOnly: () => 'TIME_STUB',
}));

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, {
        testID: testID ?? 'rewards-error-banner',
      }),
  };
});

jest.mock('../hooks/useGetPredictThePitchLeaderboardPosition');
jest.mock('../hooks/useGetCampaignParticipantStatus');

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
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
  totalParticipants: 100,
  roi: 0.15,
  pnl: 1500.25,
  volume: 30_000,
  eligible: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
  marketsTraded: 3,
  minimumMarketsTraded: 3,
};

const mockCampaign = {
  id: CAMPAIGN_ID,
  type: CampaignType.PREDICT_THE_PITCH,
  name: 'Predict Stats Test',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2099-12-31T23:59:59Z',
  termsAndConditions: null,
  excludedRegions: [],
  featured: false,
  details: { howItWorks: { title: '', description: '', steps: [] } },
};

const mockState = {
  rewards: {
    campaigns: [mockCampaign],
  },
};

describe('PredictThePitchCampaignStatsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(mockState),
    );
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 5 },
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
  });

  it('renders with the correct container testID', () => {
    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);
    expect(
      getByTestId(PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.CONTAINER),
    ).toBeDefined();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);
    fireEvent.press(getByTestId('predict-the-pitch-stats-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to campaign mechanics when the header mechanics button is pressed', () => {
    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);
    fireEvent.press(getByTestId('predict-the-pitch-stats-mechanics-button'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_CAMPAIGN_MECHANICS,
      { campaignId: CAMPAIGN_ID },
    );
  });

  it('passes position to stats header with ROI and computed-at hidden', () => {
    render(<PredictThePitchCampaignStatsView />);
    expect(mockPredictStatsHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        position: basePosition,
        isLoading: false,
        showRoi: false,
        showComputedAt: false,
        isCampaignComplete: false,
      }),
    );
  });

  it('passes undefined to position hook when not opted in', () => {
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: false, participantCount: 0 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    render(<PredictThePitchCampaignStatsView />);
    expect(mockUseGetPosition).toHaveBeenCalledWith(undefined);
  });

  it('renders performance section labels and stat testIDs when opted in with position', () => {
    const { getByTestId, getByText } = render(
      <PredictThePitchCampaignStatsView />,
    );
    expect(
      getByText('rewards.predict_the_pitch_campaign.performance_title'),
    ).toBeDefined();
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_ROI,
      ),
    ).toBeDefined();
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_PNL,
      ),
    ).toBeDefined();
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_VOLUME,
      ),
    ).toBeDefined();
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARKETS_TRADED,
      ),
    ).toBeDefined();
  });

  it('shows x/y markets when below minimum', () => {
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        marketsTraded: 2,
        minimumMarketsTraded: 3,
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);

    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARKETS_TRADED,
      ).props.children,
    ).toBe('2/3');
  });

  it('shows count only when markets traded meets minimum', () => {
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        marketsTraded: 5,
        minimumMarketsTraded: 3,
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);

    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARKETS_TRADED,
      ).props.children,
    ).toBe('5');
  });

  it('hides the markets traded cell when marketsTraded is null', () => {
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        marketsTraded: null,
        minimumMarketsTraded: 3,
      } as unknown as PredictThePitchLeaderboardPositionDto,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(<PredictThePitchCampaignStatsView />);

    expect(
      queryByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARKETS_TRADED,
      ),
    ).toBeNull();
  });

  it('hides the markets traded cell when position is null', () => {
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(<PredictThePitchCampaignStatsView />);

    expect(
      queryByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARKETS_TRADED,
      ),
    ).toBeNull();
  });

  it('shows fallback performance values when position numeric fields are invalid', () => {
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        roi: null,
        pnl: null,
        volume: null,
        eligible: false,
      } as unknown as PredictThePitchLeaderboardPositionDto,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);

    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_ROI,
      ).props.children,
    ).toBe('-');
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_PNL,
      ).props.children,
    ).toBe('-');
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_VOLUME,
      ).props.children,
    ).toBe('-');
  });

  it('shows last-computed when position has a timestamp', () => {
    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);
    const el = getByTestId(
      PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED,
    );
    expect(el.props.children).toBe(
      'rewards.predict_the_pitch_campaign.last_updated',
    );
  });

  it('hides last-computed when there is no position', () => {
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { queryByTestId } = render(<PredictThePitchCampaignStatsView />);
    expect(
      queryByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED,
      ),
    ).toBeNull();
  });

  it("shows You're qualified card under performance when active and user is qualified", () => {
    const { getByTestId, queryByTestId } = render(
      <PredictThePitchCampaignStatsView />,
    );
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD,
      ),
    ).toBeDefined();
    expect(
      queryByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD,
      ),
    ).toBeNull();
  });

  it('hides qualification cards when campaign is complete', () => {
    const completeCampaign = {
      ...mockCampaign,
      endDate: '2020-01-01T00:00:00Z',
    };
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        rewards: { campaigns: [completeCampaign] },
      }),
    );
    const { getByTestId, queryByTestId } = render(
      <PredictThePitchCampaignStatsView />,
    );
    expect(
      queryByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD,
      ),
    ).toBeNull();
    expect(
      queryByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD,
      ),
    ).toBeNull();
    expect(
      getByTestId(PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED),
    ).toBeDefined();
  });

  it('shows Qualify for rank card when pending', () => {
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        eligible: false,
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { getByTestId, queryByTestId } = render(
      <PredictThePitchCampaignStatsView />,
    );
    expect(
      getByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD,
      ),
    ).toBeDefined();
    expect(
      queryByTestId(
        PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD,
      ),
    ).toBeNull();
  });

  it('shows error banner when hasError is true and no position data', () => {
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: true,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { getByTestId } = render(<PredictThePitchCampaignStatsView />);
    expect(getByTestId('rewards-error-banner')).toBeDefined();
  });

  it('hides error banner when hasError is false', () => {
    const { queryByTestId } = render(<PredictThePitchCampaignStatsView />);
    expect(queryByTestId('rewards-error-banner')).toBeNull();
  });
});
