import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  GameUpdate,
  PredictMarket as PredictMarketType,
  Recurrence,
} from '../../types';
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

const mockOpenBuySheet = jest.fn();
jest.mock('../../contexts', () => ({
  usePredictEntryPoint: () => undefined,
  usePredictPreviewSheet: () => ({
    openBuySheet: mockOpenBuySheet,
  }),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: (action: () => void) => action(),
  }),
}));

let mockGameUpdate: GameUpdate | null = null;
jest.mock('../../hooks/useLiveGameUpdates', () => ({
  useLiveGameUpdates: () => ({ gameUpdate: mockGameUpdate }),
}));

jest.mock('../../constants/sportLeagueConfigs', () => ({
  getLeagueConfig: () => ({}),
}));

jest.mock('../PredictSportTeamLogo/PredictSportTeamLogo', () => {
  const { View } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => (
    <View testID={testID ?? 'predict-sport-team-logo'} />
  );
});

const mockMarket: PredictMarketType = {
  id: 'test-market-sport-1',
  providerId: 'test-provider',
  slug: 'spain-vs-england',
  title: 'Spain vs England',
  description: 'World Cup matchup between Spain and England',
  image: 'https://example.com/worldcup.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['World Cup'],
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
        { id: 'token-home', title: 'Spain', price: 0.6 },
        { id: 'token-draw', title: 'Draw', price: 0.15 },
        { id: 'token-away', title: 'England', price: 0.62 },
      ],
      volume: 1000000,
      groupItemTitle: '',
    },
  ],
  liquidity: 1000000,
  volume: 1000000,
  game: {
    id: 'game-1',
    startTime: '2026-06-08T21:30:00Z',
    status: 'scheduled',
    league: 'fifwc',
    elapsed: null,
    period: null,
    score: null,
    awayTeam: {
      id: 'england',
      name: 'England',
      logo: 'https://example.com/england.png',
      abbreviation: 'ENG',
      color: TEST_HEX_COLORS.PURE_RED,
      alias: 'England',
    },
    homeTeam: {
      id: 'spain',
      name: 'Spain',
      logo: 'https://example.com/spain.png',
      abbreviation: 'SPA',
      color: TEST_HEX_COLORS.CUSTOM_ORANGE,
      alias: 'Spain',
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
    mockGameUpdate = null;
  });

  it('renders scheduled World Cup match card information', () => {
    const { getByText, getAllByTestId } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    expect(getByText('Spain vs England')).toBeOnTheScreen();
    expect(getByText('Spain')).toBeOnTheScreen();
    expect(getByText('England')).toBeOnTheScreen();
    expect(getByText(/June 8/)).toBeOnTheScreen();
    expect(getByText(/PM/)).toBeOnTheScreen();
    expect(getAllByTestId(/sport-market-card-.*-team-logo/)).toHaveLength(2);
  });

  it('renders team, draw, and away outcome buttons with cents', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('SPA 60¢')).toBeOnTheScreen();
    expect(getByText('DRAW 15¢')).toBeOnTheScreen();
    expect(getByText('ENG 62¢')).toBeOnTheScreen();
  });

  it('uses the main moneyline outcome when extended sports markets are present', () => {
    const extendedMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [
        {
          id: 'outcome-spread',
          providerId: 'test-provider',
          marketId: 'test-market-sport-1',
          title: 'Spread',
          description: 'Spread line',
          image: '',
          status: 'open',
          sportsMarketType: 'spreads',
          tokens: [
            { id: 'token-spread-home', title: 'Spain -1.5', price: 0.16 },
            { id: 'token-spread-away', title: 'England +1.5', price: 0.84 },
          ],
          volume: 1000000,
          groupItemTitle: 'Spread',
        },
        {
          ...mockMarket.outcomes[0],
          sportsMarketType: 'moneyline',
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={extendedMarket} />,
      { state: initialState },
    );

    expect(getByText('SPA 60¢')).toBeOnTheScreen();
    expect(getByText('DRAW 15¢')).toBeOnTheScreen();
    expect(getByText('ENG 62¢')).toBeOnTheScreen();
  });

  it('renders compact carousel cards without scheduled score placeholders', () => {
    const { getByText, queryByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} isCarousel />,
      { state: initialState },
    );

    expect(getByText('Spain vs England')).toBeOnTheScreen();
    expect(queryByText('0')).not.toBeOnTheScreen();
    expect(getByText('SPA 60¢')).toBeOnTheScreen();
    expect(getByText('DRAW 15¢')).toBeOnTheScreen();
    expect(getByText('ENG 62¢')).toBeOnTheScreen();
  });

  it('renders live status and live scores from game updates', () => {
    mockGameUpdate = {
      gameId: 'game-1',
      score: '0-1',
      elapsed: "75'",
      period: '2H',
      status: 'ongoing',
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSportCard
        market={{
          ...mockMarket,
          game: mockMarket.game
            ? { ...mockMarket.game, status: 'ongoing' }
            : undefined,
        }}
      />,
      { state: initialState },
    );

    expect(getByText('Live')).toBeOnTheScreen();
    expect(getByText("75'")).toBeOnTheScreen();
    expect(getByText('0')).toBeOnTheScreen();
    expect(getByText('1')).toBeOnTheScreen();
  });

  it('navigates to market details when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card'));

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

  it('uses trending entry point when no explicit entry point and session is active', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.TRENDING,
        }),
      }),
    );
  });

  it('explicit entry point takes priority over trending session', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        entryPoint={PredictEventValues.ENTRY_POINT.EXPLORE}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        }),
      }),
    );
  });

  it('opens the buy sheet when an outcome button is pressed', () => {
    const onBuyButtonPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        onBuyButtonPress={onBuyButtonPress}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card-home-button'));

    expect(onBuyButtonPress).toHaveBeenCalledWith(mockMarket.id);
    expect(mockOpenBuySheet).toHaveBeenCalledWith(
      expect.objectContaining({
        market: mockMarket,
        outcomeToken: expect.objectContaining({ id: 'token-home' }),
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      }),
    );
  });

  it('renders close button and calls onDismiss without navigating', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        onDismiss={onDismiss}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card-close-button'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back gracefully when team colors are unavailable', () => {
    const marketWithoutColors: PredictMarketType = {
      ...mockMarket,
      game: mockMarket.game
        ? {
            ...mockMarket.game,
            homeTeam: {
              ...mockMarket.game.homeTeam,
              color: undefined as unknown as string,
            },
            awayTeam: {
              ...mockMarket.game.awayTeam,
              color: null as unknown as string,
            },
          }
        : undefined,
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={marketWithoutColors} />,
      { state: initialState },
    );

    expect(getByText('Spain vs England')).toBeOnTheScreen();
    expect(getByText('SPA 60¢')).toBeOnTheScreen();
    expect(getByText('ENG 62¢')).toBeOnTheScreen();
  });
});
