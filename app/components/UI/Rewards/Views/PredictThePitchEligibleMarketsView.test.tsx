import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictThePitchEligibleMarketsView, {
  PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS,
} from './PredictThePitchEligibleMarketsView';
import { useGetPredictThePitchEligibleMarkets } from '../hooks/useGetPredictThePitchEligibleMarkets';
import type { PredictThePitchEligibleMarketsDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../Predict/constants/eventNames';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { campaignId: 'predict-campaign-1' },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Skeleton = (props: Record<string, unknown>) =>
    ReactActual.createElement(View, { testID: 'skeleton', ...props });
  return {
    ...actual,
    Skeleton,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (..._args: unknown[]) => ({}) }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
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

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
      testID,
    }: {
      title: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel
          ? ReactActual.createElement(
              Pressable,
              { onPress: onConfirm, testID: `${testID}-retry` },
              ReactActual.createElement(Text, null, confirmButtonLabel),
            )
          : null,
      ),
  };
});

jest.mock('../components/RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
      testID,
    }: {
      title: string;
      description: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Text, null, description),
      ),
  };
});

jest.mock('../hooks/useGetPredictThePitchEligibleMarkets');
jest.mock('../hooks/useTrackRewardsPageView', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.predict_the_pitch_campaign.eligible_games': 'Games',
      'rewards.predict_the_pitch_campaign.eligible_props': 'Props',
      'rewards.predict_the_pitch_campaign.eligible_markets_title':
        'Eligible markets',
      'rewards.predict_the_pitch_campaign.eligible_markets_error':
        'Could not load markets',
      'rewards.predict_the_pitch_campaign.eligible_markets_error_description':
        'Try again later',
      'rewards.predict_the_pitch_campaign.positions_retry': 'Retry',
      'rewards.predict_the_pitch_campaign.eligible_markets_empty':
        'No markets yet',
      'rewards.predict_the_pitch_campaign.eligible_markets_empty_description':
        'Check back soon',
    };
    return map[key] ?? key;
  },
}));

const mockUseGetPredictThePitchEligibleMarkets =
  useGetPredictThePitchEligibleMarkets as jest.MockedFunction<
    typeof useGetPredictThePitchEligibleMarkets
  >;

const eligibleMarkets: PredictThePitchEligibleMarketsDto = {
  games: [
    {
      displayName: 'Lions vs Bears',
      navId: 'market-123',
      conditionId: 'condition-game',
      marketSlug: 'lions-bears',
      eventSlug: 'football-week-1',
      iconUrl: null,
      flags: [],
      bucket: 'games',
    },
  ],
  props: [
    {
      displayName: 'Player points',
      navId: null,
      conditionId: 'condition-prop',
      marketSlug: 'player-points',
      eventSlug: 'football-week-1',
      iconUrl: null,
      flags: [],
      bucket: 'props',
    },
  ],
};

describe('PredictThePitchEligibleMarketsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetPredictThePitchEligibleMarkets.mockReturnValue({
      eligibleMarkets,
      isLoading: false,
      hasError: false,
      refetch: mockRefetch,
    });
  });

  it('renders eligible market sections and opens Predict market details for rows with navId', () => {
    const { getByText, getByTestId } = render(
      <PredictThePitchEligibleMarketsView />,
    );

    expect(getByText('Games')).toBeOnTheScreen();
    expect(getByText('Props')).toBeOnTheScreen();
    expect(getByText('Lions vs Bears')).toBeOnTheScreen();
    expect(getByText('Player points')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(
        `${PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.ROW}-condition-game`,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: 'market-123',
        entryPoint: PredictEventValues.ENTRY_POINT.REWARDS,
      },
    });
  });

  it('does not navigate when a market row has no navId', () => {
    const { getByTestId } = render(<PredictThePitchEligibleMarketsView />);

    fireEvent.press(
      getByTestId(
        `${PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.ROW}-condition-prop`,
      ),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows skeleton rows while loading without cached markets', () => {
    mockUseGetPredictThePitchEligibleMarkets.mockReturnValue({
      eligibleMarkets: null,
      isLoading: true,
      hasError: false,
      refetch: mockRefetch,
    });

    const { getByTestId, getAllByTestId } = render(
      <PredictThePitchEligibleMarketsView />,
    );

    expect(
      getByTestId(PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.LOADING),
    ).toBeOnTheScreen();
    expect(getAllByTestId('skeleton')).toHaveLength(6);
  });

  it('shows an error banner and retries loading markets', () => {
    mockUseGetPredictThePitchEligibleMarkets.mockReturnValue({
      eligibleMarkets: null,
      isLoading: false,
      hasError: true,
      refetch: mockRefetch,
    });

    const { getByText, getByTestId } = render(
      <PredictThePitchEligibleMarketsView />,
    );

    expect(getByText('Could not load markets')).toBeOnTheScreen();
    fireEvent.press(
      getByTestId(
        `${PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.ERROR}-retry`,
      ),
    );

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows an empty state when there are no eligible markets', () => {
    mockUseGetPredictThePitchEligibleMarkets.mockReturnValue({
      eligibleMarkets: { games: [], props: [] },
      isLoading: false,
      hasError: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<PredictThePitchEligibleMarketsView />);

    expect(getByText('No markets yet')).toBeOnTheScreen();
    expect(getByText('Check back soon')).toBeOnTheScreen();
  });
});
