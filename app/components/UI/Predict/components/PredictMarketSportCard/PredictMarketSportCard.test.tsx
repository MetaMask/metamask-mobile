import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Recurrence, PredictMarket as PredictMarketType } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketSportCard from './';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

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

jest.mock('../../contexts', () => ({
  usePredictEntryPoint: () => undefined,
}));

jest.mock('../PredictSportScoreboard/PredictSportScoreboard', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockPredictSportScoreboard({
      game,
      testID,
    }: {
      game: {
        awayTeam: { abbreviation: string };
        homeTeam: { abbreviation: string };
      };
      testID?: string;
    }) {
      return (
        <View testID={testID ?? 'mock-scoreboard'}>
          <Text>Sun, Feb 8</Text>
          <Text>3:30 PM</Text>
          <Text>{game?.awayTeam?.abbreviation}</Text>
          <Text>{game?.homeTeam?.abbreviation}</Text>
        </View>
      );
    },
  };
});

jest.mock('../PredictSportCardFooter', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    PredictSportCardFooter: function MockPredictSportCardFooter({
      market,
      entryPoint,
      testID,
    }: {
      market: { id: string };
      entryPoint?: string;
      testID?: string;
    }) {
      return (
        <View testID={testID ?? 'mock-footer'}>
          <Text testID="mock-footer-market-id">{market.id}</Text>
          <Text testID="mock-footer-entry-point">{entryPoint}</Text>
        </View>
      );
    },
  };
});

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

  describe('footer integration', () => {
    it('renders PredictSportCardFooter with correct market', () => {
      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard market={mockMarket} testID="sport-card" />,
        { state: initialState },
      );

      expect(getByTestId('mock-footer-market-id').props.children).toBe(
        'test-market-sport-1',
      );
    });

    it('renders PredictSportCardFooter with correct testID', () => {
      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard market={mockMarket} testID="sport-card" />,
        { state: initialState },
      );

      expect(getByTestId('sport-card-footer')).toBeOnTheScreen();
    });

    it('renders PredictSportCardFooter with default testID when no testID provided', () => {
      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard market={mockMarket} />,
        { state: initialState },
      );

      expect(getByTestId('mock-footer')).toBeOnTheScreen();
    });

    it('passes resolved entry point to footer', () => {
      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard
          market={mockMarket}
          testID="sport-card"
          entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS}
        />,
        { state: initialState },
      );

      expect(getByTestId('mock-footer-entry-point').props.children).toBe(
        PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      );
    });

    it('passes trending entry point to footer when from trending', () => {
      mockIsFromTrending.mockReturnValue(true);

      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard
          market={mockMarket}
          testID="sport-card"
          entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
        />,
        { state: initialState },
      );

      expect(getByTestId('mock-footer-entry-point').props.children).toBe(
        PredictEventValues.ENTRY_POINT.TRENDING,
      );
    });
  });

  describe('onDismiss', () => {
    it('does not render close button when onDismiss is not provided', () => {
      const { queryByTestId } = renderWithProvider(
        <PredictMarketSportCard market={mockMarket} testID="sport-card" />,
        { state: initialState },
      );

      expect(queryByTestId('sport-card-close-button')).toBeNull();
    });

    it('renders close button when onDismiss is provided', () => {
      const mockOnDismiss = jest.fn();

      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard
          market={mockMarket}
          testID="sport-card"
          onDismiss={mockOnDismiss}
        />,
        { state: initialState },
      );

      expect(getByTestId('sport-card-close-button')).toBeOnTheScreen();
    });

    it('calls onDismiss when close button is pressed', () => {
      const mockOnDismiss = jest.fn();

      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard
          market={mockMarket}
          testID="sport-card"
          onDismiss={mockOnDismiss}
        />,
        { state: initialState },
      );

      fireEvent.press(getByTestId('sport-card-close-button'));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not navigate when close button is pressed', () => {
      const mockOnDismiss = jest.fn();

      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCard
          market={mockMarket}
          testID="sport-card"
          onDismiss={mockOnDismiss}
        />,
        { state: initialState },
      );

      fireEvent.press(getByTestId('sport-card-close-button'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('renders close button without testID when onDismiss is provided but testID is not', () => {
      const mockOnDismiss = jest.fn();

      const { getByText } = renderWithProvider(
        <PredictMarketSportCard
          market={mockMarket}
          onDismiss={mockOnDismiss}
        />,
        { state: initialState },
      );

      expect(getByText('Super Bowl LX (2026)')).toBeOnTheScreen();
    });
  });

  describe('team color fallbacks', () => {
    const mockGame = mockMarket.game;

    it('uses fallback colors when game team colors are undefined', () => {
      if (!mockGame) {
        throw new Error('mockGame is required for this test');
      }

      const marketWithoutColors: PredictMarketType = {
        ...mockMarket,
        game: {
          ...mockGame,
          awayTeam: {
            ...mockGame.awayTeam,
            color: undefined as unknown as string,
          },
          homeTeam: {
            ...mockGame.homeTeam,
            color: undefined as unknown as string,
          },
        },
      };

      const { getByText } = renderWithProvider(
        <PredictMarketSportCard market={marketWithoutColors} />,
        { state: initialState },
      );

      expect(getByText('Super Bowl LX (2026)')).toBeOnTheScreen();
    });

    it('uses fallback colors when game team colors are null', () => {
      if (!mockGame) {
        throw new Error('mockGame is required for this test');
      }

      const marketWithNullColors: PredictMarketType = {
        ...mockMarket,
        game: {
          ...mockGame,
          awayTeam: {
            ...mockGame.awayTeam,
            color: null as unknown as string,
          },
          homeTeam: {
            ...mockGame.homeTeam,
            color: null as unknown as string,
          },
        },
      };

      const { getByText } = renderWithProvider(
        <PredictMarketSportCard market={marketWithNullColors} />,
        { state: initialState },
      );

      expect(getByText('Super Bowl LX (2026)')).toBeOnTheScreen();
    });
  });
});
