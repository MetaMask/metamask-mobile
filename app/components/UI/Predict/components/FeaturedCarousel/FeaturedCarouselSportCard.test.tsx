import React from 'react';
import { View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PredictMarket,
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
  Recurrence,
} from '../../types';
import FeaturedCarouselSportCard from './FeaturedCarouselSportCard';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackGeoBlockTriggered: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    initializeActiveOrder: jest.fn(),
    activeOrder: null,
    updateActiveOrder: jest.fn(),
    clearActiveOrder: jest.fn(),
  }),
}));

const mockUsePredictEligibility = jest.fn().mockReturnValue({
  isEligible: true,
  isLoading: false,
});
jest.mock('../../hooks/usePredictEligibility', () => ({
  usePredictEligibility: () => mockUsePredictEligibility(),
}));

const mockUsePredictBalance = jest.fn().mockReturnValue({
  data: 100,
  isLoading: false,
});
jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => mockUsePredictBalance(),
}));

jest.mock('../../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      isFromTrending: false,
    }),
  },
}));

jest.mock('../../contexts', () => ({
  usePredictEntryPoint: () => undefined,
}));

jest.mock('../../hooks/useLiveGameUpdates', () => ({
  useLiveGameUpdates: () => ({ gameUpdate: null }),
}));

jest.mock('../../constants/sportLeagueConfigs', () => ({
  getLeagueConfig: () => ({}),
}));

jest.mock('../PredictSportTeamLogo/PredictSportTeamLogo', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => (
    <MockView testID={testID ?? 'predict-sport-team-logo'} />
  );
});

const mockNavigateToBuyPreview = jest.fn();
jest.mock('../../hooks/usePredictNavigation', () => ({
  usePredictNavigation: () => ({
    navigateToBuyPreview: mockNavigateToBuyPreview,
  }),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: (action: () => void) => action(),
    isEligible: true,
  }),
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

const createMockOutcome = (
  tokens: PredictOutcomeToken[],
  volume = 1500000,
): PredictOutcome => ({
  id: 'outcome-1',
  providerId: 'polymarket',
  marketId: 'market-sport-1',
  title: 'Game winner',
  description: 'Pick winner',
  image: 'https://example.com/market.png',
  status: 'open',
  tokens,
  volume,
  groupItemTitle: 'Game winner',
  negRisk: false,
  tickSize: '0.01',
});

const createMockGame = (
  overrides: Partial<PredictMarketGame> = {},
): PredictMarketGame => ({
  id: 'game-1',
  startTime: '2026-03-30T20:00:00Z',
  status: 'ongoing',
  league: 'ucl',
  elapsed: '20',
  period: '2H',
  score: { away: 1, home: 2, raw: '1-2' },
  homeTeam: {
    id: 'team-home',
    name: 'Lakers',
    logo: 'https://example.com/home.png',
    abbreviation: 'LAL',
    color: 'purple',
    alias: 'Lakers',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Celtics',
    logo: 'https://example.com/away.png',
    abbreviation: 'BOS',
    color: 'green',
    alias: 'Celtics',
  },
  ...overrides,
});

const createMockSportMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-sport-1',
  providerId: 'polymarket',
  slug: 'lakers-vs-celtics',
  title: 'Lakers vs Celtics',
  description: 'Who wins?',
  image: 'https://example.com/sport-market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['nba'],
  outcomes: [
    createMockOutcome([
      { id: 'home-token', title: 'Lakers', price: 0.6 },
      { id: 'away-token', title: 'Celtics', price: 0.4 },
      { id: 'draw-token', title: 'Draw', price: 0.2 },
      { id: 'extra-token', title: 'Bonus', price: 0.1 },
    ]),
  ],
  liquidity: 1500000,
  volume: 1500000,
  game: createMockGame(),
  ...overrides,
});

describe('FeaturedCarouselSportCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders league name and live indicator for ongoing games', () => {
    const market = createMockSportMarket();

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByText('UCL')).toBeOnTheScreen();
    expect(getByText('Live 20')).toBeOnTheScreen();
  });

  it('renders team logos and scores', () => {
    const market = createMockSportMarket();

    const { getAllByTestId, getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getAllByTestId('predict-sport-team-logo')).toHaveLength(2);
    expect(getByText('2')).toBeOnTheScreen();
    expect(getByText('1')).toBeOnTheScreen();
  });

  it('renders team names', () => {
    const market = createMockSportMarket();

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByText('Lakers')).toBeOnTheScreen();
    expect(getByText('Celtics')).toBeOnTheScreen();
  });

  it('renders payout prices for home and away teams', () => {
    const market = createMockSportMarket();

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByText('$166.67')).toBeOnTheScreen();
    expect(getByText('$250.00')).toBeOnTheScreen();
  });

  it('renders percentage buttons for home and away', () => {
    const market = createMockSportMarket();

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByText('60%')).toBeOnTheScreen();
    expect(getByText('40%')).toBeOnTheScreen();
  });

  it('renders draw button for UCL leagues', () => {
    const market = createMockSportMarket({
      game: createMockGame({ league: 'ucl' }),
    });

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByText(strings('predict.outcome_draw'))).toBeOnTheScreen();
  });

  it.each(['nba', 'nfl'] as const)(
    'does not render draw button for %s leagues',
    (league) => {
      const baseMarket = createMockSportMarket();
      const market = createMockSportMarket({
        game: createMockGame({ ...baseMarket.game, league }),
      });

      const { queryByText } = renderWithProvider(
        <FeaturedCarouselSportCard market={market} index={0} />,
        { state: initialState },
      );

      expect(
        queryByText(strings('predict.outcome_draw')),
      ).not.toBeOnTheScreen();
    },
  );

  it('renders footer with volume display', () => {
    const market = createMockSportMarket();

    const { getByTestId, getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_FOOTER(0)),
    ).toBeOnTheScreen();
    expect(
      getByText(new RegExp(strings('predict.volume_abbreviated'), 'i')),
    ).toBeOnTheScreen();
  });

  it('renders remaining outcomes count when market has multiple outcomes', () => {
    const market = createMockSportMarket({
      outcomes: [
        createMockOutcome([
          { id: 'home-token', title: 'Lakers', price: 0.6 },
          { id: 'away-token', title: 'Celtics', price: 0.4 },
        ]),
        createMockOutcome([
          { id: 'over-token', title: 'Over', price: 0.55 },
          { id: 'under-token', title: 'Under', price: 0.45 },
        ]),
      ],
    });

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByText(/\+ 1/)).toBeOnTheScreen();
  });

  it('renders time remaining in footer for live games', () => {
    const market = createMockSportMarket();

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByText(/70 mins/)).toBeOnTheScreen();
  });

  it('navigates to market details on card press', () => {
    const market = createMockSportMarket();

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD(0)));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: expect.objectContaining({
        marketId: 'market-sport-1',
        title: 'Lakers vs Celtics',
      }),
    });
  });

  it('calls buy handler on percentage button press', () => {
    const market = createMockSportMarket();

    const { getByText } = renderWithProvider(
      <FeaturedCarouselSportCard market={market} index={0} />,
      { state: initialState },
    );

    fireEvent.press(getByText('60%'));

    expect(mockNavigateToBuyPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        market,
        outcome: market.outcomes[0],
        outcomeToken: market.outcomes[0].tokens[0],
      }),
      { throughRoot: true },
    );
  });
});
