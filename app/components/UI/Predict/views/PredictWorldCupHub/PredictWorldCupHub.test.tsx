import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictWorldCupHub, {
  PREDICT_WORLD_CUP_HUB_TEST_IDS,
} from './PredictWorldCupHub';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../constants/flags';
import { PREDICT_WORLD_CUP_HUB_TAB_KEYS } from '../../constants/worldCupHubTabs';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockTrackFeedViewed = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;
let mockIsScreenEnabled = true;
let mockConfig = {
  ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
  enabled: true,
  showWorldCupScreen: true,
};

const mockUsePredictWorldCupMarkets = jest.fn();
const mockUsePredictWorldCupGamesSections = jest.fn();
const mockUsePredictWorldCupWinnerMarket = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackFeedViewed: (...args: Parameters<typeof mockTrackFeedViewed>) =>
          mockTrackFeedViewed(...args),
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    if (selector === 'selectPredictWorldCupConfig') return mockConfig;
    if (selector === 'selectPredictWorldCupScreenEnabledFlag')
      return mockIsScreenEnabled;
    return undefined;
  }),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectPredictWorldCupConfig: 'selectPredictWorldCupConfig',
  selectPredictWorldCupScreenEnabledFlag:
    'selectPredictWorldCupScreenEnabledFlag',
}));

jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');
  const FlashList = ({
    data = [],
    renderItem,
    keyExtractor,
    ListHeaderComponent,
    ListFooterComponent,
    testID,
  }: {
    data?: unknown[];
    renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
    keyExtractor?: (item: unknown, index: number) => string;
    ListHeaderComponent?: React.ComponentType | React.ReactNode;
    ListFooterComponent?: React.ComponentType | React.ReactNode;
    testID?: string;
  }) => (
    <View testID={testID}>
      {typeof ListHeaderComponent === 'function' ? (
        <ListHeaderComponent />
      ) : (
        ListHeaderComponent
      )}
      {(data as { id: string }[]).map((item, index) => (
        <View key={keyExtractor ? keyExtractor(item, index) : String(index)}>
          {renderItem({ item, index })}
        </View>
      ))}
      {typeof ListFooterComponent === 'function' ? (
        <ListFooterComponent />
      ) : (
        ListFooterComponent
      )}
    </View>
  );
  return { FlashList };
});

jest.mock('../../components/PredictMarket', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      market,
      testID,
    }: {
      market: { title: string };
      testID: string;
    }) => <Text testID={testID}>{market.title}</Text>,
  };
});

jest.mock('../../components/PredictWorldCupWinnerModule', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ market }: { market: { title: string } }) => (
      <Text testID="winner-module">{market.title}</Text>
    ),
  };
});

jest.mock('../../components/PredictOffline', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text testID="predict-offline">offline</Text>,
  };
});

jest.mock('../../hooks/usePredictWorldCupHub', () => ({
  usePredictWorldCupGamesSections: (...args: unknown[]) =>
    mockUsePredictWorldCupGamesSections(...args),
  usePredictWorldCupWinnerMarket: (...args: unknown[]) =>
    mockUsePredictWorldCupWinnerMarket(...args),
}));

jest.mock('../../hooks', () => ({
  usePredictWorldCupMarkets: (...args: unknown[]) =>
    mockUsePredictWorldCupMarkets(...args),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('uuid', () => ({ v4: () => 'test-session-id' }));

describe('PredictWorldCupHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockRouteParams = undefined;
    mockIsScreenEnabled = true;
    mockConfig = {
      ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
      enabled: true,
      showWorldCupScreen: true,
    };
    mockUsePredictWorldCupGamesSections.mockReturnValue({
      sections: [],
      isLive: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePredictWorldCupMarkets.mockReturnValue({
      marketData: [],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
    mockUsePredictWorldCupWinnerMarket.mockReturnValue({
      market: null,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders the hub container', () => {
    render(<PredictWorldCupHub />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders Games and Props tab buttons', () => {
    render(<PredictWorldCupHub />);

    expect(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.TAB}-${PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES}`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.TAB}-${PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS}`,
      ),
    ).toBeOnTheScreen();
  });

  it('shows Games list by default with section data', () => {
    mockUsePredictWorldCupGamesSections.mockReturnValue({
      sections: [
        {
          key: 'final',
          label: 'Final',
          markets: [
            {
              id: 'm-1',
              title: 'Final Match',
              outcomes: [],
              parentMarketId: null,
            },
          ],
          isFetching: false,
        },
      ],
      isLive: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<PredictWorldCupHub />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.GAMES_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.PROPS_LIST),
    ).not.toBeOnTheScreen();
  });

  it('switches to Props list when Props tab is pressed', () => {
    render(<PredictWorldCupHub />);

    fireEvent.press(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.TAB}-${PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS}`,
      ),
    );

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.PROPS_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.GAMES_LIST),
    ).not.toBeOnTheScreen();
  });

  it('renders stage section headers for each section returned by the hook', () => {
    mockUsePredictWorldCupGamesSections.mockReturnValue({
      sections: [
        {
          key: 'round_of_32',
          label: 'Round of 32',
          markets: [
            {
              id: 'm-1',
              title: 'Canada vs. Mexico',
              outcomes: [],
              parentMarketId: null,
            },
          ],
          isFetching: false,
        },
      ],
      isLive: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<PredictWorldCupHub />);

    expect(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.SECTION_HEADER}-header-round_of_32`,
      ),
    ).toBeOnTheScreen();
  });

  it('shows the winner module in Props tab when winner market is available', () => {
    mockUsePredictWorldCupWinnerMarket.mockReturnValue({
      market: {
        id: 'winner',
        title: 'World Cup Winner',
        outcomes: [],
        parentMarketId: null,
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<PredictWorldCupHub />);

    fireEvent.press(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.TAB}-${PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS}`,
      ),
    );

    expect(screen.getByTestId('winner-module')).toBeOnTheScreen();
  });

  it('navigates to market list when screen is disabled', () => {
    mockIsScreenEnabled = false;

    render(<PredictWorldCupHub />);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({}),
    );
  });

  it('tracks feedViewed on initial render', () => {
    render(<PredictWorldCupHub />);

    expect(mockTrackFeedViewed).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'test-session-id',
        feedTab: PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES,
        predictScreen: 'world_cup',
      }),
    );
  });

  it('tracks feedViewed with new tab key when switching tabs', () => {
    render(<PredictWorldCupHub />);
    jest.clearAllMocks();

    fireEvent.press(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.TAB}-${PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS}`,
      ),
    );

    expect(mockTrackFeedViewed).toHaveBeenCalledWith(
      expect.objectContaining({
        feedTab: PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS,
      }),
    );
  });

  it('opens the Props tab when navigated with initialTab="props"', () => {
    mockRouteParams = { initialTab: 'props' };

    render(<PredictWorldCupHub />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.PROPS_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.GAMES_LIST),
    ).not.toBeOnTheScreen();
  });

  it('tracks the initial feedViewed with the resolved initialTab', () => {
    mockRouteParams = { initialTab: 'props' };

    render(<PredictWorldCupHub />);

    expect(mockTrackFeedViewed).toHaveBeenCalledWith(
      expect.objectContaining({
        feedTab: PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS,
      }),
    );
  });

  it('defaults to the Games tab for unknown initialTab values', () => {
    mockRouteParams = { initialTab: 'something-else' };
    mockUsePredictWorldCupGamesSections.mockReturnValue({
      sections: [
        {
          key: 'final',
          label: 'Final',
          markets: [
            {
              id: 'm-1',
              title: 'Final Match',
              outcomes: [],
              parentMarketId: null,
            },
          ],
          isFetching: false,
        },
      ],
      isLive: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<PredictWorldCupHub />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.GAMES_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.PROPS_LIST),
    ).not.toBeOnTheScreen();
  });

  it('does not render the winner market twice in the Props feed', () => {
    mockUsePredictWorldCupWinnerMarket.mockReturnValue({
      market: {
        id: 'winner',
        title: 'Winner Duplicate',
        outcomes: [],
        parentMarketId: null,
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePredictWorldCupMarkets.mockReturnValue({
      marketData: [
        {
          id: 'winner',
          title: 'Winner Duplicate',
          outcomes: [],
          parentMarketId: null,
        },
        {
          id: 'other',
          title: 'Other Market',
          outcomes: [],
          parentMarketId: null,
        },
      ],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });

    render(<PredictWorldCupHub />);

    fireEvent.press(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.TAB}-${PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS}`,
      ),
    );

    expect(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.MARKET_CARD}-props-0`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        `${PREDICT_WORLD_CUP_HUB_TEST_IDS.MARKET_CARD}-props-1`,
      ),
    ).not.toBeOnTheScreen();
    // The winner title appears only once (in the header winner module).
    expect(screen.getAllByText('Winner Duplicate')).toHaveLength(1);
  });

  it('renders the offline state in the Games tab when the games hook errors', () => {
    mockUsePredictWorldCupGamesSections.mockReturnValue({
      sections: [],
      isLive: false,
      isFetching: false,
      error: 'network down',
      refetch: jest.fn(),
    });

    render(<PredictWorldCupHub />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_HUB_TEST_IDS.ERROR_STATE),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('predict-offline')).toBeOnTheScreen();
  });
});
