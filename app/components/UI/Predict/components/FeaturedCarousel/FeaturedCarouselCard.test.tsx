import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket, PredictOutcome, Recurrence } from '../../types';
import FeaturedCarouselCard from './FeaturedCarouselCard';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';
import Routes from '../../../../../constants/navigation/Routes';

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

jest.mock('./FeaturedCarouselSportCard', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return ({ market }: { market: { id: string } }) => (
    <MockView testID={`sport-card-${market.id}`} />
  );
});

const createMockOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome => ({
  id: 'outcome-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  title: 'Will BTC hit $200k?',
  description: 'BTC prediction',
  image: 'https://example.com/btc.png',
  status: 'open',
  tokens: [
    { id: 'token-yes', title: 'Yes', price: 0.65 },
    { id: 'token-no', title: 'No', price: 0.35 },
  ],
  volume: 1500000,
  groupItemTitle: 'Bitcoin',
  negRisk: false,
  tickSize: '0.01',
  ...overrides,
});

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-200k',
  title: 'Will BTC hit $200k?',
  description: 'BTC prediction',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [
    createMockOutcome(),
    createMockOutcome({
      id: 'outcome-2',
      groupItemTitle: 'Ethereum',
      image: 'https://example.com/eth.png',
      tokens: [
        { id: 'token-eth-yes', title: 'Yes', price: 0.4 },
        { id: 'token-eth-no', title: 'No', price: 0.6 },
      ],
    }),
  ],
  liquidity: 1500000,
  volume: 1500000,
  ...overrides,
});

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('FeaturedCarouselCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders market title', () => {
    const market = createMockMarket({ title: 'Democratic Nominee 2028' });

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_TITLE(0)),
    ).toBeOnTheScreen();
  });

  it('renders outcome names for top 2 outcomes', () => {
    const market = createMockMarket();

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 0)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 1)),
    ).toBeOnTheScreen();
  });

  it('renders buy buttons for each outcome', () => {
    const market = createMockMarket();

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 0)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 1)),
    ).toBeOnTheScreen();
  });

  it('renders footer with volume display', () => {
    const market = createMockMarket();

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_FOOTER(0)),
    ).toBeOnTheScreen();
  });

  it('navigates to market details on card press', () => {
    const market = createMockMarket();

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD(0)));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: expect.objectContaining({
        marketId: 'market-1',
        title: 'Will BTC hit $200k?',
      }),
    });
  });

  it('renders sport card when market has game data', () => {
    const market = createMockMarket({
      game: {
        id: 'game-1',
        startTime: '2026-03-30T20:00:00Z',
        status: 'ongoing',
        league: 'nba',
        elapsed: '45:00',
        period: 'Q2',
        score: { away: 55, home: 48, raw: '55-48' },
        homeTeam: {
          id: 'team-1',
          name: 'Lakers',
          logo: '',
          abbreviation: 'LAL',
          color: 'purple',
          alias: 'Lakers',
        },
        awayTeam: {
          id: 'team-2',
          name: 'Celtics',
          logo: '',
          abbreviation: 'BOS',
          color: 'green',
          alias: 'Celtics',
        },
      },
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(getByTestId('sport-card-market-1')).toBeOnTheScreen();
    expect(
      queryByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_TITLE(0)),
    ).not.toBeOnTheScreen();
  });

  it('displays percentage on CTA buttons', () => {
    const market = createMockMarket({
      outcomes: [
        createMockOutcome({
          id: 'o1',
          groupItemTitle: 'Yes',
          tokens: [{ id: 't1', title: 'Yes', price: 0.65 }],
        }),
        createMockOutcome({
          id: 'o2',
          groupItemTitle: 'No',
          tokens: [{ id: 't2', title: 'No', price: 0.35 }],
        }),
      ],
    });

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    const buyButton0 = getByTestId(
      FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 0),
    );
    const buyButton1 = getByTestId(
      FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 1),
    );

    expect(buyButton0).toBeOnTheScreen();
    expect(buyButton1).toBeOnTheScreen();
  });

  it('limits display to 2 outcomes maximum', () => {
    const market = createMockMarket({
      outcomes: [
        createMockOutcome({ id: 'o1', groupItemTitle: 'A' }),
        createMockOutcome({ id: 'o2', groupItemTitle: 'B' }),
        createMockOutcome({ id: 'o3', groupItemTitle: 'C' }),
      ],
    });

    const { queryByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      queryByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 2)),
    ).not.toBeOnTheScreen();
  });

  it('calls buy handler on buy button press', () => {
    const market = createMockMarket();

    const { getByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    fireEvent.press(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 0)),
    );

    expect(mockNavigateToBuyPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        market,
        outcome: market.outcomes[0],
        outcomeToken: market.outcomes[0].tokens[0],
      }),
      { throughRoot: true },
    );
  });

  it('renders without image when market has no image', () => {
    const market = createMockMarket({ image: undefined });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_TITLE(0)),
    ).toBeOnTheScreen();
    expect(queryByTestId('market-image')).not.toBeOnTheScreen();
  });

  describe('binary market (single outcome with multiple tokens)', () => {
    const createBinaryMarket = (
      overrides: Partial<PredictMarket> = {},
    ): PredictMarket =>
      createMockMarket({
        outcomes: [
          createMockOutcome({
            id: 'outcome-binary',
            title: 'Binary Outcome',
            groupItemTitle: 'Binary Outcome',
            tokens: [
              { id: 'token-yes', title: 'Yes', price: 0.65 },
              { id: 'token-no', title: 'No', price: 0.35 },
            ],
          }),
        ],
        ...overrides,
      });

    it('renders two token-based buttons for a binary market', () => {
      const market = createBinaryMarket();

      const { getByTestId } = renderWithProvider(
        <FeaturedCarouselCard market={market} index={0} />,
        { state: initialState },
      );

      expect(
        getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 0)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 1)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 0)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 1)),
      ).toBeOnTheScreen();
    });

    it('passes correct outcome and token when buying in a binary market', () => {
      const market = createBinaryMarket();

      const { getByTestId } = renderWithProvider(
        <FeaturedCarouselCard market={market} index={0} />,
        { state: initialState },
      );

      fireEvent.press(
        getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(0, 1)),
      );

      expect(mockNavigateToBuyPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          market,
          outcome: market.outcomes[0],
          outcomeToken: market.outcomes[0].tokens[1],
        }),
        { throughRoot: true },
      );
    });

    it('reports zero remaining options for a binary market', () => {
      const market = createBinaryMarket();

      const { queryByTestId } = renderWithProvider(
        <FeaturedCarouselCard market={market} index={0} />,
        { state: initialState },
      );

      expect(
        queryByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 2)),
      ).not.toBeOnTheScreen();
    });
  });

  it('skips outcomes with no tokens in multi-outcome markets', () => {
    const market = createMockMarket({
      outcomes: [
        createMockOutcome({
          id: 'o-with-token',
          groupItemTitle: 'Has Token',
          tokens: [{ id: 't1', title: 'Yes', price: 0.7 }],
        }),
        createMockOutcome({
          id: 'o-no-token',
          groupItemTitle: 'No Token',
          tokens: [],
        }),
      ],
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <FeaturedCarouselCard market={market} index={0} />,
      { state: initialState },
    );

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 0)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(0, 1)),
    ).not.toBeOnTheScreen();
  });
});
