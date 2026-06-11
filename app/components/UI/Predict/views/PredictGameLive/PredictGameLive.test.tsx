import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PredictGameLive from './PredictGameLive';
import { PREDICT_GAME_LIVE_TEST_IDS } from './PredictGameLive.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: Record<string, unknown> = {
  marketId: 'market-1',
  mock: true,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

let mockGameLiveEnabled = true;
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => mockGameLiveEnabled,
}));

let mockMarketResult: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
jest.mock('../../hooks/usePredictMarket', () => ({
  usePredictMarket: () => mockMarketResult,
}));

jest.mock('../../hooks/useLiveGameUpdates', () => ({
  useLiveGameUpdates: () => ({
    gameUpdate: null,
    isConnected: false,
    lastUpdateTime: null,
  }),
}));

jest.mock('../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: () => ({
    prices: new Map(),
    getPrice: () => undefined,
    isConnected: false,
    lastUpdateTime: null,
  }),
}));

const mockOpenBuySheet = jest.fn();
jest.mock('../../contexts', () => ({
  usePredictPreviewSheet: () => ({ openBuySheet: mockOpenBuySheet }),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: (action: () => void) => action(),
  }),
}));

jest.mock('../../constants/sportLeagueConfigs', () => ({
  getLeagueConfig: () => ({}),
}));

jest.mock('../../components/PredictSportTeamLogo/PredictSportTeamLogo', () => {
  const { View } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => (
    <View testID={testID ?? 'predict-sport-team-logo'} />
  );
});

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const initialState = {
  engine: { backgroundState },
};

const renderScreen = () =>
  renderWithProvider(<PredictGameLive />, { state: initialState });

describe('PredictGameLive', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGameLiveEnabled = true;
    mockRouteParams = { marketId: 'market-1', mock: true };
    mockMarketResult = { data: undefined, isLoading: false };
    mockOpenBuySheet.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when the feature flag is disabled', () => {
    mockGameLiveEnabled = false;

    const { queryByTestId } = renderScreen();

    expect(
      queryByTestId(PREDICT_GAME_LIVE_TEST_IDS.SCREEN),
    ).not.toBeOnTheScreen();
  });

  it('renders the mocked game without any network market', () => {
    const { getByTestId, getByText } = renderScreen();

    expect(getByTestId(PREDICT_GAME_LIVE_TEST_IDS.SCREEN)).toBeOnTheScreen();
    expect(getByTestId(PREDICT_GAME_LIVE_TEST_IDS.HEADER)).toBeOnTheScreen();
    expect(getByText('SAS @ NYK')).toBeOnTheScreen();
  });

  it('renders the quick-bet bar with moneyline percentages in mock mode', () => {
    const { getByTestId, getAllByText } = renderScreen();

    expect(
      getByTestId(PREDICT_GAME_LIVE_TEST_IDS.QUICK_BET_BAR),
    ).toBeOnTheScreen();
    // Percentages render in both the header win-probability row and the bar.
    expect(getAllByText('SAS 54%').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('NYK 46%').length).toBeGreaterThanOrEqual(2);
  });

  it('does not open the real buy sheet from mock-mode bets', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(PREDICT_GAME_LIVE_TEST_IDS.QUICK_BET_AWAY));

    expect(mockOpenBuySheet).not.toHaveBeenCalled();
  });

  it('shows the unavailable state when a real market has no game data', () => {
    mockRouteParams = { marketId: 'market-1' };
    mockMarketResult = { data: { id: 'market-1' }, isLoading: false };

    const { getByText } = renderScreen();

    expect(getByText('This game is unavailable right now.')).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(PREDICT_GAME_LIVE_TEST_IDS.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
