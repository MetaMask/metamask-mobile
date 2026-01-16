import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Recurrence, PredictMarket as PredictMarketType } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketSportCard from './';
import Routes from '../../../../../constants/navigation/Routes';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock TrendingFeedSessionManager
const mockIsFromTrending = jest.fn();
jest.mock('../../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      get isFromTrending() {
        return mockIsFromTrending();
      },
    }),
  },
}));

// Mock formatGameStartTime for consistent test results across locales
jest.mock('../../utils/format', () => ({
  ...jest.requireActual('../../utils/format'),
  formatGameStartTime: jest.fn((startTime: string | undefined) => {
    if (!startTime) {
      return { date: 'TBD', time: '' };
    }
    // Return predictable values for tests
    return { date: 'Sun, Feb 8', time: '3:30 PM' };
  }),
}));

// Mock usePredictActionGuard
const mockExecuteGuardedAction = jest.fn((action: () => void) => action());
jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
    isEligible: true,
    hasNoBalance: false,
  }),
}));

const mockMarket: PredictMarketType = {
  id: 'test-market-sport-1',
  providerId: 'test-provider',
  slug: 'super-bowl-lx-2026',
  title: 'Super Bowl LX (2026)',
  description: 'Super Bowl LX matchup between SEA and DEN',
  image: 'https://example.com/superbowl.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['NFL', 'Super Bowl'],
  outcomes: [
    {
      id: 'outcome-game-winner',
      providerId: 'test-provider',
      marketId: 'test-market-sport-1',
      title: 'Game Winner',
      description: 'Who will win the game',
      image: '',
      status: 'open',
      tokens: [
        { id: 'token-away', title: 'SEA', price: 0.77 },
        { id: 'token-home', title: 'DEN', price: 0.23 },
      ],
      volume: 1000000,
      groupItemTitle: '',
    },
  ],
  liquidity: 1000000,
  volume: 1000000,
  game: {
    id: 'game-1',
    startTime: '2026-02-08T20:30:00Z',
    status: 'scheduled',
    league: 'nfl',
    elapsed: null,
    period: null,
    score: null,
    awayTeam: {
      id: 'sea',
      name: 'Seattle Seahawks',
      logo: '',
      abbreviation: 'SEA',
      color: '#002244',
      alias: 'Seahawks',
    },
    homeTeam: {
      id: 'den',
      name: 'Denver Broncos',
      logo: '',
      abbreviation: 'DEN',
      color: '#FB4F14',
      alias: 'Broncos',
    },
  },
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketSportCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFromTrending.mockReturnValue(false);
    mockExecuteGuardedAction.mockImplementation((action: () => void) =>
      action(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders market information correctly', () => {
    const { getByText, getAllByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('Super Bowl LX (2026)')).toBeOnTheScreen();
    expect(getAllByText('SEA')[0]).toBeOnTheScreen();
    expect(getAllByText('DEN')[0]).toBeOnTheScreen();
    expect(getByText('Sun, Feb 8')).toBeOnTheScreen();
    expect(getByText('3:30 PM')).toBeOnTheScreen();
  });

  it('renders team buttons with prices', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('SEA · 77¢')).toBeOnTheScreen();
    expect(getByText('DEN · 23¢')).toBeOnTheScreen();
  });

  it('calls executeGuardedAction and navigates to buy preview when team button is pressed', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    fireEvent.press(getByText('SEA · 77¢'));

    expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
      expect.any(Function),
      {
        checkBalance: true,
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
      },
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.MODALS.BUY_PREVIEW,
      {
        market: mockMarket,
        outcome: mockMarket.outcomes[0],
        outcomeToken: expect.objectContaining({
          id: 'token-away',
          title: 'SEA',
        }),
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      },
    );
  });

  it('hides action buttons when game has ended', () => {
    const endedMarket: PredictMarketType = {
      ...mockMarket,
      game: mockMarket.game
        ? { ...mockMarket.game, status: 'ended' }
        : undefined,
    };

    const { queryByTestId } = renderWithProvider(
      <PredictMarketSportCard market={endedMarket} testID="sport-card" />,
      { state: initialState },
    );

    expect(queryByTestId('sport-card-action-buttons')).toBeNull();
  });

  it('navigates to market details when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: mockMarket.id,
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        title: mockMarket.title,
        image: mockMarket.image,
      },
    });
  });

  it('uses default entry point when not specified', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        }),
      }),
    );
  });

  it('uses trending entry point when from trending feed', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
      />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.TRENDING,
        }),
      }),
    );
  });

  it('uses custom entry point when specified and not from trending', () => {
    mockIsFromTrending.mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS}
      />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        }),
      }),
    );
  });

  it('overrides custom entry point when from trending feed', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS}
      />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.TRENDING,
        }),
      }),
    );
  });

  it('passes market data to navigation params', () => {
    const customMarket: PredictMarketType = {
      ...mockMarket,
      id: 'custom-market-id',
      title: 'Custom Super Bowl',
      image: 'https://example.com/custom.png',
    };

    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={customMarket}
        testID="sport-market-card"
      />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'custom-market-id',
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
          title: 'Custom Super Bowl',
          image: 'https://example.com/custom.png',
        },
      }),
    );
  });

  it('renders without testID prop', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    // Component should render successfully without testID
    expect(getByText('Super Bowl LX (2026)')).toBeOnTheScreen();
  });

  it('displays game time and date information', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    // Verify date and time are displayed
    expect(getByText('Sun, Feb 8')).toBeOnTheScreen();
    expect(getByText('3:30 PM')).toBeOnTheScreen();
  });

  it('renders gradient background', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    // Component should render with gradient (LinearGradient is used)
    const card = getByTestId('sport-market-card');
    expect(card).toBeOnTheScreen();
  });

  it('handles market with empty image gracefully', () => {
    const noImageMarket: PredictMarketType = {
      ...mockMarket,
      image: '',
    };

    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={noImageMarket}
        testID="sport-market-card"
      />,
      { state: initialState },
    );

    // Should render without crashing
    expect(getByTestId('sport-market-card')).toBeOnTheScreen();
  });
});
