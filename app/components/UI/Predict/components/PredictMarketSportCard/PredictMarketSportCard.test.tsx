import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictMarket as PredictMarketType,
  PredictMarketGame,
  Recurrence,
} from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketSportCard from './';
import Routes from '../../../../../constants/navigation/Routes';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { usePredictGame } from '../../hooks/usePredictGame';

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

jest.mock('../../hooks/usePredictGame');
const mockUsePredictGame = usePredictGame as jest.MockedFunction<
  typeof usePredictGame
>;

const mockGetLivePrice = jest.fn();
jest.mock('../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(() => ({
    getPrice: mockGetLivePrice,
  })),
}));
const mockUseLiveMarketPrices = jest.mocked(useLiveMarketPrices);

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

const mockWnbaMarket: PredictMarketType = {
  ...mockMarket,
  id: 'test-market-wnba-1',
  slug: 'wnba-por-con-2026-07-14',
  title: 'Portland Fire vs Connecticut Sun',
  description: 'WNBA matchup between Portland Fire and Connecticut Sun',
  tags: ['WNBA'],
  outcomes: [
    {
      ...mockMarket.outcomes[0],
      id: 'outcome-wnba-moneyline',
      sportsMarketType: 'moneyline',
      tokens: [
        { id: 'token-portland', title: 'Portland Fire', price: 0.16 },
        { id: 'token-connecticut', title: 'Connecticut Sun', price: 0.85 },
      ],
    },
  ],
  game: {
    ...(mockMarket.game as PredictMarketGame),
    id: 'game-wnba-1',
    league: 'wnba',
    status: 'ongoing',
    elapsed: '06:06',
    period: 'Q3',
    score: { away: 49, home: 59, raw: '49-59' },
    awayTeam: {
      id: 'portland-fire',
      name: 'Portland Fire',
      logo: 'https://example.com/portland-fire.png',
      abbreviation: 'POR',
      color: TEST_HEX_COLORS.CUSTOM_ORANGE,
      alias: 'PortlandFire',
    },
    homeTeam: {
      id: 'connecticut-sun',
      name: 'Connecticut Sun',
      logo: 'https://example.com/connecticut-sun.png',
      abbreviation: 'CONN',
      color: TEST_HEX_COLORS.PURE_RED,
      alias: 'Sun',
    },
  },
};

const initialState = {
  engine: {
    backgroundState,
  },
};

const stateWithSportCardLivePricesEnabled = (enabled: boolean) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      RemoteFeatureFlagController: {
        ...backgroundState.RemoteFeatureFlagController,
        remoteFeatureFlags: {
          ...backgroundState.RemoteFeatureFlagController?.remoteFeatureFlags,
          predictSportCardLivePrices: {
            enabled,
            minimumVersion: '0.0.0',
          },
        },
      },
    },
  },
});

describe('PredictMarketSportCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFromTrending.mockReturnValue(false);
    mockGetLivePrice.mockReturnValue(undefined);
    mockUsePredictGame.mockImplementation((market) => ({
      game: market?.game,
      isConnected: false,
      lastUpdateTime: null,
    }));
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

  it('renders World Cup outcome buttons in home-draw-away league order', () => {
    const { getAllByTestId } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    const buttonTestIds = getAllByTestId(
      /sport-market-card-(home|draw|away)-button/,
    ).map((button) => button.props.testID);

    expect(buttonTestIds).toEqual([
      'sport-market-card-home-button',
      'sport-market-card-draw-button',
      'sport-market-card-away-button',
    ]);
  });

  it('renders WNBA outcome buttons in away-home league order', () => {
    const { getAllByTestId, getByText } = renderWithProvider(
      <PredictMarketSportCard
        market={mockWnbaMarket}
        testID="sport-market-card"
      />,
      { state: initialState },
    );

    const buttonTestIds = getAllByTestId(
      /sport-market-card-(away|home)-button/,
    ).map((button) => button.props.testID);

    expect(buttonTestIds).toEqual([
      'sport-market-card-away-button',
      'sport-market-card-home-button',
    ]);
    expect(getByText('POR 16¢')).toBeOnTheScreen();
    expect(getByText('CONN 85¢')).toBeOnTheScreen();
  });

  it('opens the WNBA away outcome from the left button', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockWnbaMarket}
        testID="sport-market-card"
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card-away-button'));

    expect(mockOpenBuySheet).toHaveBeenCalledWith(
      expect.objectContaining({
        outcomeToken: expect.objectContaining({
          id: 'token-portland',
        }),
      }),
    );
  });

  it('keeps outcome button labels on one line and shrinks to fit to prevent truncation', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    const drawLabel = getByText('DRAW 15¢');
    expect(drawLabel.props.numberOfLines).toBe(1);
    expect(drawLabel.props.adjustsFontSizeToFit).toBe(true);
  });

  it('renders live Moneyline best ask prices when available', () => {
    mockGetLivePrice.mockImplementation((tokenId: string) => ({
      tokenId,
      price: 0,
      bestBid: 0,
      bestAsk:
        tokenId === 'token-home'
          ? 0.71
          : tokenId === 'token-draw'
            ? 0.12
            : 0.29,
    }));

    const { getByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('SPA 71¢')).toBeOnTheScreen();
    expect(getByText('DRAW 12¢')).toBeOnTheScreen();
    expect(getByText('ENG 29¢')).toBeOnTheScreen();
  });

  it('renders static prices and disables live subscriptions when the flag is off', () => {
    mockGetLivePrice.mockImplementation((tokenId: string) => ({
      tokenId,
      price: 0,
      bestBid: 0,
      bestAsk: 0.99,
    }));

    const { getByText, queryByText } = renderWithProvider(
      <PredictMarketSportCard market={mockMarket} />,
      { state: stateWithSportCardLivePricesEnabled(false) },
    );

    expect(getByText('SPA 60¢')).toBeOnTheScreen();
    expect(getByText('DRAW 15¢')).toBeOnTheScreen();
    expect(getByText('ENG 62¢')).toBeOnTheScreen();
    expect(queryByText('SPA 99¢')).not.toBeOnTheScreen();
    expect(mockUseLiveMarketPrices).toHaveBeenLastCalledWith(
      ['token-home', 'token-draw', 'token-away'],
      { enabled: false },
    );
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

  it('prefers team-to-advance outcomes for World Cup games', () => {
    const teamToAdvanceOutcome = {
      ...mockMarket.outcomes[0],
      id: 'outcome-team-to-advance',
      sportsMarketType: 'soccer_team_to_advance',
      groupItemTitle: 'Team to Advance',
      tokens: [
        { id: 'token-spain-advance', title: 'Spain', price: 0.72 },
        { id: 'token-england-advance', title: 'England', price: 0.41 },
      ],
    };
    const marketWithTeamToAdvance: PredictMarketType = {
      ...mockMarket,
      outcomes: [
        {
          ...mockMarket.outcomes[0],
          id: 'outcome-moneyline',
          sportsMarketType: 'moneyline',
        },
        teamToAdvanceOutcome,
      ],
    };

    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <PredictMarketSportCard
        market={marketWithTeamToAdvance}
        testID="sport-market-card"
      />,
      { state: initialState },
    );

    expect(getByText('SPA 72¢')).toBeOnTheScreen();
    expect(getByText('ENG 41¢')).toBeOnTheScreen();
    expect(queryByText('DRAW 15¢')).not.toBeOnTheScreen();

    fireEvent.press(getByTestId('sport-market-card-away-button'));

    expect(mockOpenBuySheet).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: teamToAdvanceOutcome,
        outcomeToken: expect.objectContaining({
          id: 'token-england-advance',
        }),
      }),
    );
  });

  it('keeps moneyline outcomes for non-World-Cup games with team-to-advance outcomes', () => {
    const teamToAdvanceOutcome = {
      ...mockMarket.outcomes[0],
      id: 'outcome-team-to-advance',
      sportsMarketType: 'soccer_team_to_advance',
      groupItemTitle: 'Team to Advance',
      tokens: [
        { id: 'token-spain-advance', title: 'Spain', price: 0.72 },
        { id: 'token-england-advance', title: 'England', price: 0.41 },
      ],
    };
    const marketWithTeamToAdvance: PredictMarketType = {
      ...mockMarket,
      game: {
        ...(mockMarket.game as PredictMarketGame),
        league: 'ucl',
      },
      outcomes: [
        {
          ...mockMarket.outcomes[0],
          id: 'outcome-moneyline',
          sportsMarketType: 'moneyline',
        },
        teamToAdvanceOutcome,
      ],
    };

    const { getByText, queryByText } = renderWithProvider(
      <PredictMarketSportCard market={marketWithTeamToAdvance} />,
      { state: initialState },
    );

    expect(getByText('SPA 60¢')).toBeOnTheScreen();
    expect(getByText('DRAW 15¢')).toBeOnTheScreen();
    expect(getByText('ENG 62¢')).toBeOnTheScreen();
    expect(queryByText('SPA 72¢')).not.toBeOnTheScreen();
    expect(queryByText('ENG 41¢')).not.toBeOnTheScreen();
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
    const cachedGame: PredictMarketGame = {
      ...(mockMarket.game as PredictMarketGame),
      status: 'ongoing',
      score: { away: 0, home: 1, raw: '0-1' },
      elapsed: '75',
      period: '2H',
    };
    mockUsePredictGame.mockReturnValue({
      game: cachedGame,
      isConnected: true,
      lastUpdateTime: 1,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketSportCard
        market={{
          ...mockMarket,
          game: mockMarket.game
            ? {
                ...mockMarket.game,
                status: 'ongoing',
                period: 'FT',
                elapsed: '90',
                score: { away: 1, home: 1, raw: '1-1' },
              }
            : undefined,
        }}
      />,
      { state: initialState },
    );

    expect(getByText('Live')).toBeOnTheScreen();
    expect(getByText('75’')).toBeOnTheScreen();
    expect(getByText('0')).toBeOnTheScreen();
    expect(getByText('1')).toBeOnTheScreen();
  });

  it('hides buy buttons at full time even before status flips to ended', () => {
    // Providers can report a terminal period ('FT') before flipping status to
    // 'ended'; the card must stop showing buy buttons in lockstep with the
    // scoreboard rendering "Final".
    const { getByText, queryByText } = renderWithProvider(
      <PredictMarketSportCard
        market={{
          ...mockMarket,
          game: mockMarket.game
            ? {
                ...mockMarket.game,
                status: 'ongoing',
                period: 'FT',
                elapsed: '90',
                score: { away: 1, home: 1, raw: '1-1' },
              }
            : undefined,
        }}
      />,
      { state: initialState },
    );

    expect(getByText('Final')).toBeOnTheScreen();
    expect(queryByText('SPA 60¢')).toBeNull();
    expect(queryByText('ENG 62¢')).toBeNull();
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

  it('does not navigate to market details when card press is disabled', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        cardPressDisabled
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card'));

    expect(mockNavigate).not.toHaveBeenCalled();
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

    expect(onBuyButtonPress).toHaveBeenCalledWith({
      market: mockMarket,
      outcome: mockMarket.outcomes[0],
      outcomeToken: mockMarket.outcomes[0].tokens[0],
    });
    expect(mockOpenBuySheet).toHaveBeenCalledWith(
      expect.objectContaining({
        market: mockMarket,
        outcomeToken: expect.objectContaining({ id: 'token-home' }),
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      }),
    );
  });

  it('calls buy handler instead of opening the buy sheet when it returns true', () => {
    const onBuyButtonPress = jest.fn(() => true);
    const { getByTestId } = renderWithProvider(
      <PredictMarketSportCard
        market={mockMarket}
        testID="sport-market-card"
        onBuyButtonPress={onBuyButtonPress}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('sport-market-card-home-button'));

    expect(onBuyButtonPress).toHaveBeenCalledWith({
      market: mockMarket,
      outcome: mockMarket.outcomes[0],
      outcomeToken: mockMarket.outcomes[0].tokens[0],
    });
    expect(mockOpenBuySheet).not.toHaveBeenCalled();
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
