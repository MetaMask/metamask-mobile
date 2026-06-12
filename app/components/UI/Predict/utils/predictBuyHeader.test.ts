import { Recurrence, type PredictMarket, type PredictOutcome } from '../types';
import { TEST_HEX_COLORS } from '../testUtils/mockColors';
import { resolvePredictBuyHeaderDisplay } from './predictBuyHeader';

const createMarket = (overrides?: Partial<PredictMarket>): PredictMarket => ({
  id: 'market-1',
  providerId: 'provider-1',
  slug: 'market-1',
  title: 'Korea Republic vs. Czechia',
  description: 'Test market',
  image: 'https://example.com/event.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: [],
  outcomes: [],
  liquidity: 1000,
  volume: 1000,
  ...overrides,
});

const createOutcome = (
  overrides?: Partial<PredictOutcome>,
): PredictOutcome => ({
  id: 'outcome-1',
  providerId: 'provider-1',
  marketId: 'market-1',
  title: 'Korea Republic vs. Czechia',
  description: 'Test outcome',
  image: 'https://example.com/outcome.png',
  status: 'open',
  volume: 100,
  groupItemTitle: '',
  tokens: [{ id: 'token-1', title: 'Yes', price: 0.375 }],
  ...overrides,
});

describe('resolvePredictBuyHeaderDisplay', () => {
  it('normalizes neg-risk moneyline team picks back to Yes and uses the team logo', () => {
    const market = createMarket({
      game: {
        id: 'game-1',
        startTime: '2026-06-11T23:00:00Z',
        status: 'scheduled',
        league: 'fifwc',
        elapsed: null,
        period: null,
        score: null,
        homeTeam: {
          id: 'team-home',
          name: 'Korea Republic',
          logo: 'https://example.com/korea.png',
          abbreviation: 'KOR',
          color: TEST_HEX_COLORS.ERROR_BRIGHT,
        },
        awayTeam: {
          id: 'team-away',
          name: 'Czechia',
          logo: 'https://example.com/czechia.png',
          abbreviation: 'CZE',
          color: TEST_HEX_COLORS.PURE_BLUE,
        },
      },
    });
    const outcome = createOutcome({
      groupItemTitle: 'Korea Republic',
      sportsMarketType: 'moneyline',
      tokens: [
        {
          id: 'token-1',
          title: 'Korea Republic',
          shortTitle: 'KOR',
          price: 0.375,
        },
        {
          id: 'token-2',
          title: 'No',
          shortTitle: 'CZE',
          price: 0.625,
        },
      ],
    });

    const result = resolvePredictBuyHeaderDisplay({
      market,
      outcome,
      outcomeToken: outcome.tokens[0],
    });

    expect(result.outcomeTokenTitle).toBe('Yes');
    expect(result.outcomeGroupTitle).toBe('Korea Republic');
    expect(result.image).toBe('https://example.com/korea.png');
  });

  it('normalizes draw selections to Yes and keeps Draw as the descriptor', () => {
    const market = createMarket();
    const outcome = createOutcome({
      title: 'Draw (Korea Republic vs. Czechia)',
      groupItemTitle: 'Draw (Korea Republic vs. Czechia)',
      sportsMarketType: 'moneyline',
      tokens: [{ id: 'token-1', title: 'Draw', price: 0.32 }],
    });

    const result = resolvePredictBuyHeaderDisplay({
      market,
      outcome,
      outcomeToken: outcome.tokens[0],
    });

    expect(result.outcomeTokenTitle).toBe('Yes');
    expect(result.outcomeGroupTitle).toBe('Draw');
  });
});
