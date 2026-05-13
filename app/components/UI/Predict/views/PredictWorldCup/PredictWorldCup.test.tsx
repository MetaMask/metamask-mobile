import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictWorldCup, {
  PREDICT_WORLD_CUP_SCREEN_TEST_IDS,
} from './PredictWorldCup';
import Routes from '../../../../../constants/navigation/Routes';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../constants/flags';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
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

jest.mock('../../hooks', () => ({
  usePredictWorldCupAvailableTabs: () => ({
    tabs: mockAvailableTabs,
    availability: mockAvailability,
    isFetching: false,
    isLoading: false,
    errors: [],
    refetch: jest.fn(),
  }),
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

  it('updates active tab when a tab is pressed', () => {
    render(<PredictWorldCup />);

    fireEvent.press(
      screen.getByTestId(`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-live`),
    );

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB),
    ).toHaveTextContent('live');
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
