import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictWorldCup, {
  PREDICT_WORLD_CUP_SCREEN_TEST_IDS,
} from './PredictWorldCup';
import Routes from '../../../../../constants/navigation/Routes';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../constants/flags';
import { PredictEventValues } from '../../constants/eventNames';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockTrackWorldCupScreenViewed = jest.fn();
const mockTrackWorldCupScreenTabChanged = jest.fn();
let mockRouteParams: { entryPoint?: string; initialTab?: string } | undefined;
let mockIsScreenEnabled = true;
let mockConfig = DEFAULT_PREDICT_WORLD_CUP_FLAG;
let mockAvailableTabs = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live', isLive: true },
  { key: 'props', label: 'Props' },
];
let mockAvailability = {
  live: true,
  props: true,
  stages: {},
};
const mockUsePredictWorldCupMarkets: jest.Mock = jest.fn((_args: unknown) => ({
  marketData: [],
  isFetching: false,
  isFetchingMore: false,
  error: null,
  hasMore: false,
  refetch: jest.fn(),
  fetchMore: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackWorldCupScreenViewed: (
          ...args: Parameters<typeof mockTrackWorldCupScreenViewed>
        ) => mockTrackWorldCupScreenViewed(...args),
        trackWorldCupScreenTabChanged: (
          ...args: Parameters<typeof mockTrackWorldCupScreenTabChanged>
        ) => mockTrackWorldCupScreenTabChanged(...args),
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
    if (selector === 'selectPredictWorldCupConfig') {
      return mockConfig;
    }

    if (selector === 'selectPredictWorldCupScreenEnabledFlag') {
      return mockIsScreenEnabled;
    }

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

  interface MockItem {
    id: string;
  }
  interface MockFlashListProps {
    data?: MockItem[];
    renderItem: (info: { item: MockItem; index: number }) => React.ReactNode;
    keyExtractor?: (item: MockItem, index: number) => string;
    ListFooterComponent?: React.ComponentType | React.ReactNode;
    testID?: string;
  }

  const FlashList = ({
    data = [],
    renderItem,
    keyExtractor,
    ListFooterComponent,
    testID,
  }: MockFlashListProps) => (
    <View testID={testID}>
      {data.map((item, index) => (
        <View key={keyExtractor ? keyExtractor(item, index) : item.id}>
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

jest.mock('../../hooks', () => ({
  usePredictWorldCupAvailableTabs: () => ({
    tabs: mockAvailableTabs,
    availability: mockAvailability,
    isFetching: false,
    isLoading: false,
    errors: [],
    refetch: jest.fn(),
  }),
  usePredictWorldCupMarkets: (args: unknown) =>
    mockUsePredictWorldCupMarkets(args),
}));

describe('PredictWorldCup', () => {
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
    mockAvailableTabs = [
      { key: 'all', label: 'All' },
      { key: 'live', label: 'Live', isLive: true },
      { key: 'props', label: 'Props' },
    ];
    mockAvailability = {
      live: true,
      props: true,
      stages: {},
    };
    mockUsePredictWorldCupMarkets.mockReturnValue({
      marketData: [],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
  });

  it('renders the screen scaffold with All selected by default', () => {
    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB),
    ).toHaveTextContent('all');
  });

  it('renders available tabs and an empty content area', () => {
    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-all`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-live`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-props`),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-group-a`),
    ).toBeNull();
    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.EMPTY_STATE),
    ).toBeOnTheScreen();
  });

  it('uses a valid requested initial tab', () => {
    mockRouteParams = { initialTab: 'props' };

    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB),
    ).toHaveTextContent('props');
  });

  it('tracks screen viewed with the resolved initial tab and entry point', () => {
    mockRouteParams = {
      entryPoint: 'deeplink_twitter',
      initialTab: 'live',
    };

    render(<PredictWorldCup />);

    expect(mockTrackWorldCupScreenViewed).toHaveBeenCalledTimes(1);
    expect(mockTrackWorldCupScreenViewed).toHaveBeenCalledWith({
      entryPoint: 'deeplink_twitter',
      feedTab: 'live',
    });
  });

  it('tracks screen viewed with predict_feed when no entry point is provided', () => {
    render(<PredictWorldCup />);

    expect(mockTrackWorldCupScreenViewed).toHaveBeenCalledWith({
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      feedTab: 'all',
    });
  });

  it('updates active tab and tab content when a tab is pressed', () => {
    render(<PredictWorldCup />);

    fireEvent.press(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-live`),
    );

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB),
    ).toHaveTextContent('live');
    expect(mockUsePredictWorldCupMarkets).toHaveBeenLastCalledWith({
      tabKey: 'live',
      config: mockConfig,
    });
    expect(mockTrackWorldCupScreenTabChanged).toHaveBeenCalledWith({
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      feedTab: 'live',
    });
  });

  it('does not track tab changed when the active tab is pressed', () => {
    render(<PredictWorldCup />);

    fireEvent.press(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-all`),
    );

    expect(mockTrackWorldCupScreenTabChanged).not.toHaveBeenCalled();
  });

  it('uses a configured available stage initial tab', () => {
    mockRouteParams = { initialTab: 'group-stage' };
    mockConfig = {
      ...mockConfig,
      stages: [{ key: 'group-stage', eventIds: ['1'] }],
    };
    mockAvailability = {
      ...mockAvailability,
      stages: { 'group-stage': true },
    };
    mockAvailableTabs = [
      ...mockAvailableTabs,
      { key: 'group-stage', label: 'Group Stage' },
    ];

    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB),
    ).toHaveTextContent('group-stage');
  });

  it('renders market content for the active tab', () => {
    mockUsePredictWorldCupMarkets.mockReturnValue({
      marketData: [
        {
          id: 'market-1',
          title: 'World Cup winner',
        },
      ],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });

    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.MARKET_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.MARKET_CARD}-1`),
    ).toHaveTextContent('World Cup winner');
  });

  it('does not render tabs hidden by availability', () => {
    mockAvailableTabs = [{ key: 'all', label: 'All' }];
    mockAvailability = {
      live: false,
      props: false,
      stages: {},
    };

    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-all`),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-live`),
    ).toBeNull();
    expect(
      screen.queryByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-props`),
    ).toBeNull();
  });

  it('falls back to All for an invalid requested initial tab', () => {
    mockRouteParams = { initialTab: 'invalid' };

    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB),
    ).toHaveTextContent('all');
  });

  it('redirects to Predict market list when the screen is disabled', () => {
    mockIsScreenEnabled = false;
    mockRouteParams = { entryPoint: 'deeplink', initialTab: 'live' };

    const { queryByTestId } = render(<PredictWorldCup />);

    expect(
      queryByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.CONTAINER),
    ).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MARKET_LIST, {
      entryPoint: 'deeplink',
    });
  });
});
