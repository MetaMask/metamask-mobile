import { transformMarketToCard, transformMarketsToCards } from './transformMarketToCard';
import type { PredictMarket, PredictOutcome } from '../PredictSwipeGame.types';
import { Recurrence } from '../../../types';

// Mock market data for testing
const createMockOutcome = (
  id: string,
  title: string,
  volume: number,
  yesPrice: number,
): PredictOutcome => ({
  id,
  providerId: 'polymarket',
  marketId: 'market-1',
  title,
  description: `Description for ${title}`,
  image: 'https://example.com/image.png',
  status: 'open',
  volume,
  groupItemTitle: title,
  tokens: [
    { id: `${id}-yes`, title: 'Yes', price: yesPrice },
    { id: `${id}-no`, title: 'No', price: 1 - yesPrice },
  ],
  negRisk: false,
  tickSize: '0.01',
});

const createMockMarket = (
  id: string,
  title: string,
  outcomes: PredictOutcome[],
): PredictMarket => ({
  id,
  providerId: 'polymarket',
  slug: id,
  title,
  description: `Description for ${title}`,
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'trending',
  tags: ['crypto'],
  outcomes,
  liquidity: 100000,
  volume: 500000,
  endDate: '2025-12-31',
});

describe('transformMarketToCard', () => {
  it('should transform a simple Yes/No market correctly', () => {
    const outcome = createMockOutcome('outcome-1', 'Will BTC hit $100k?', 50000, 0.65);
    const market = createMockMarket('market-1', 'Bitcoin Price Prediction', [outcome]);

    const card = transformMarketToCard(market);

    expect(card).not.toBeNull();
    expect(card!.marketId).toBe('market-1');
    expect(card!.title).toBe('Bitcoin Price Prediction');
    expect(card!.isMultiOutcome).toBe(false);
    expect(card!.primaryOutcome.outcomeId).toBe('outcome-1');
    expect(card!.primaryOutcome.yesToken.price).toBe(0.65);
    expect(card!.primaryOutcome.noToken.price).toBe(0.35);
    expect(card!.alternativeOutcomes).toHaveLength(0);
  });

  it('should select highest volume outcome as primary for multi-outcome markets', () => {
    const outcome1 = createMockOutcome('outcome-1', 'Team A wins', 10000, 0.3);
    const outcome2 = createMockOutcome('outcome-2', 'Team B wins', 50000, 0.5); // Highest volume
    const outcome3 = createMockOutcome('outcome-3', 'Draw', 20000, 0.2);
    const market = createMockMarket('market-1', 'Sports Match', [outcome1, outcome2, outcome3]);

    const card = transformMarketToCard(market);

    expect(card).not.toBeNull();
    expect(card!.isMultiOutcome).toBe(true);
    expect(card!.primaryOutcome.outcomeId).toBe('outcome-2'); // Highest volume
    expect(card!.primaryOutcome.title).toBe('Team B wins');
    expect(card!.alternativeOutcomes).toHaveLength(2);
    // Alternatives should be sorted by volume (descending)
    expect(card!.alternativeOutcomes[0].outcomeId).toBe('outcome-3'); // 20000
    expect(card!.alternativeOutcomes[1].outcomeId).toBe('outcome-1'); // 10000
  });

  it('should return null for market with no outcomes', () => {
    const market = createMockMarket('market-1', 'Empty Market', []);

    const card = transformMarketToCard(market);

    expect(card).toBeNull();
  });

  it('should filter out outcomes with less than 2 tokens', () => {
    const validOutcome = createMockOutcome('outcome-1', 'Valid', 50000, 0.5);
    const invalidOutcome: PredictOutcome = {
      ...createMockOutcome('outcome-2', 'Invalid', 10000, 0.3),
      tokens: [{ id: 'single-token', title: 'Yes', price: 0.5 }], // Only 1 token
    };
    const market = createMockMarket('market-1', 'Mixed Market', [validOutcome, invalidOutcome]);

    const card = transformMarketToCard(market);

    expect(card).not.toBeNull();
    expect(card!.isMultiOutcome).toBe(false); // Only 1 valid outcome
    expect(card!.primaryOutcome.outcomeId).toBe('outcome-1');
  });

  it('should handle tokens with non-standard titles', () => {
    const outcome: PredictOutcome = {
      ...createMockOutcome('outcome-1', 'Custom Outcome', 50000, 0.6),
      tokens: [
        { id: 'token-true', title: 'True', price: 0.6 },
        { id: 'token-false', title: 'False', price: 0.4 },
      ],
    };
    const market = createMockMarket('market-1', 'Boolean Market', [outcome]);

    const card = transformMarketToCard(market);

    expect(card).not.toBeNull();
    // Should still find Yes (True) and No (False) tokens
    expect(card!.primaryOutcome.yesToken.title).toBe('True');
    expect(card!.primaryOutcome.noToken.title).toBe('False');
  });
});

describe('transformMarketsToCards', () => {
  it('should transform multiple markets and filter out invalid ones', () => {
    const validMarket1 = createMockMarket('market-1', 'Valid Market 1', [
      createMockOutcome('o1', 'Outcome 1', 10000, 0.5),
    ]);
    const invalidMarket = createMockMarket('market-2', 'Invalid Market', []);
    const validMarket2 = createMockMarket('market-3', 'Valid Market 2', [
      createMockOutcome('o2', 'Outcome 2', 20000, 0.7),
    ]);

    const cards = transformMarketsToCards([validMarket1, invalidMarket, validMarket2]);

    expect(cards).toHaveLength(2);
    expect(cards[0].marketId).toBe('market-1');
    expect(cards[1].marketId).toBe('market-3');
  });

  it('should return empty array for empty input', () => {
    const cards = transformMarketsToCards([]);

    expect(cards).toHaveLength(0);
  });
});

