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

  it('renders fixed tabs and an empty content area', () => {
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

  it('uses a configured stage initial tab', () => {
    mockRouteParams = { initialTab: 'group-stage' };
    mockConfig = {
      ...mockConfig,
      stages: [{ key: 'group-stage', eventIds: ['1'] }],
    };

    render(<PredictWorldCup />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB),
    ).toHaveTextContent('group-stage');
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
