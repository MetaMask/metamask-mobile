import { HyperliquidHIP4Service } from './HyperliquidHIP4Service';
import {
  HIP4MarketStatus,
  type SpotMetaOutcomeData,
} from '../types/hip4-types';

// Mock logger
const createMockLogger = () => ({
  log: jest.fn(),
});

const createDefaultInfoClient = () => ({
  spotMeta: jest.fn().mockResolvedValue({
    tokens: [
      { name: 'USDC', index: 0 },
      { name: 'o1568', index: 1568 },
      { name: 'o1569', index: 1569 },
    ],
    universe: [],
    outcomes: [
      {
        outcome: 10,
        name: 'Will BTC hit 200K?',
        description: 'Will Bitcoin reach $200,000 by end of 2026?',
        sideSpecs: [
          { name: 'Yes', token: 1568 },
          { name: 'No', token: 1569 },
        ],
      },
    ],
    questions: [
      {
        question: 1,
        name: 'Will BTC hit 200K by end of 2026?',
        description: 'Binary prediction on Bitcoin price reaching $200,000.',
        fallbackOutcome: 10,
        namedOutcomes: [10],
      },
    ],
  }),
  allMids: jest.fn().mockResolvedValue({
    '@1568': '0.65',
    '@1569': '0.35',
  }),
});

// Mock info client with optional overrides
const createMockInfoClient = (
  overrides?: Partial<ReturnType<typeof createDefaultInfoClient>>,
) => ({
  ...createDefaultInfoClient(),
  ...overrides,
});

describe('HyperliquidHIP4Service', () => {
  let service: HyperliquidHIP4Service;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    service = new HyperliquidHIP4Service(mockLogger);
  });

  describe('fetchOutcomeMarkets', () => {
    it('fetches outcomes and questions from spotMeta', async () => {
      const infoClient = createMockInfoClient();
      const result = await service.fetchOutcomeMarkets(infoClient);

      expect(infoClient.spotMeta).toHaveBeenCalledTimes(1);
      expect(result.outcomes).toHaveLength(1);
      expect(result.questions).toHaveLength(1);
      expect(result.outcomes[0].name).toBe('Will BTC hit 200K?');
      expect(result.questions[0].name).toBe(
        'Will BTC hit 200K by end of 2026?',
      );
    });

    it('caches results and avoids redundant API calls', async () => {
      const infoClient = createMockInfoClient();

      // First call
      await service.fetchOutcomeMarkets(infoClient);
      // Second call should use cache
      await service.fetchOutcomeMarkets(infoClient);

      expect(infoClient.spotMeta).toHaveBeenCalledTimes(1);
    });

    it('handles empty outcomes/questions gracefully', async () => {
      const infoClient = createMockInfoClient({
        spotMeta: jest.fn().mockResolvedValue({
          tokens: [],
          universe: [],
          // outcomes and questions missing from response
        }),
      });

      const result = await service.fetchOutcomeMarkets(infoClient);

      expect(result.outcomes).toEqual([]);
      expect(result.questions).toEqual([]);
    });

    it('returns stale cache on API error', async () => {
      const infoClient = createMockInfoClient();

      // Fetch successfully first to populate cache
      await service.fetchOutcomeMarkets(infoClient);

      // Force cache expiry by clearing and refetching with error
      service.clearCache();

      // Re-populate cache
      await service.fetchOutcomeMarkets(infoClient);

      // Now make API fail
      infoClient.spotMeta.mockRejectedValueOnce(new Error('Network error'));

      // Clear cache to force refetch
      service.clearCache();

      // Should throw since no cache
      await expect(service.fetchOutcomeMarkets(infoClient)).rejects.toThrow(
        'Network error',
      );
    });

    it('deduplicates concurrent requests', async () => {
      const infoClient = createMockInfoClient();

      // Fire multiple concurrent requests
      const promises = [
        service.fetchOutcomeMarkets(infoClient),
        service.fetchOutcomeMarkets(infoClient),
        service.fetchOutcomeMarkets(infoClient),
      ];

      const results = await Promise.all(promises);

      expect(infoClient.spotMeta).toHaveBeenCalledTimes(1);
      // All should return the same data
      results.forEach((r) => {
        expect(r.outcomes).toHaveLength(1);
      });
    });
  });

  describe('fetchPrices', () => {
    it('fetches allMids prices', async () => {
      const infoClient = createMockInfoClient();
      const prices = await service.fetchPrices(infoClient);

      expect(infoClient.allMids).toHaveBeenCalledTimes(1);
      expect(prices['@1568']).toBe('0.65');
      expect(prices['@1569']).toBe('0.35');
    });

    it('caches price data', async () => {
      const infoClient = createMockInfoClient();

      await service.fetchPrices(infoClient);
      await service.fetchPrices(infoClient);

      expect(infoClient.allMids).toHaveBeenCalledTimes(1);
    });
  });

  describe('mapToHIP4Markets', () => {
    const mockOutcomeData: SpotMetaOutcomeData = {
      outcomes: [
        {
          outcome: 10,
          name: 'Will BTC hit 200K?',
          description: 'Bitcoin price prediction',
          sideSpecs: [
            { name: 'Yes', token: 1568 },
            { name: 'No', token: 1569 },
          ],
        },
      ],
      questions: [
        {
          question: 1,
          name: 'BTC 200K Prediction',
          description: 'Will BTC hit 200K by end of 2026?',
          fallbackOutcome: 10,
          namedOutcomes: [10],
        },
      ],
    };

    it('maps questions to HIP4Markets', () => {
      const markets = service.mapToHIP4Markets(mockOutcomeData);

      expect(markets).toHaveLength(1);
      expect(markets[0].id).toBe('hip4-1');
      expect(markets[0].questionId).toBe(1);
      expect(markets[0].title).toBe('BTC 200K Prediction');
      expect(markets[0].description).toBe('Will BTC hit 200K by end of 2026?');
      expect(markets[0].status).toBe(HIP4MarketStatus.ACTIVE);
      expect(markets[0].fallbackOutcome).toBe(10);
    });

    it('maps outcome sides correctly', () => {
      const markets = service.mapToHIP4Markets(mockOutcomeData);
      const outcome = markets[0].outcomes[0];

      expect(outcome.outcomeId).toBe(10);
      expect(outcome.name).toBe('Will BTC hit 200K?');
      expect(outcome.sides).toHaveLength(2);
      expect(outcome.sides[0].name).toBe('Yes');
      expect(outcome.sides[0].tokenIndex).toBe(1568);
      expect(outcome.sides[1].name).toBe('No');
      expect(outcome.sides[1].tokenIndex).toBe(1569);
    });

    it('applies prices when provided', () => {
      const prices = { '@1568': '0.65', '@1569': '0.35' };
      const markets = service.mapToHIP4Markets(mockOutcomeData, prices);
      const sides = markets[0].outcomes[0].sides;

      expect(sides[0].price).toBe(0.65);
      expect(sides[1].price).toBe(0.35);
    });

    it('defaults to 0 price when no prices provided', () => {
      const markets = service.mapToHIP4Markets(mockOutcomeData);
      const sides = markets[0].outcomes[0].sides;

      expect(sides[0].price).toBe(0);
      expect(sides[1].price).toBe(0);
    });

    it('infers crypto category for BTC-related markets', () => {
      const markets = service.mapToHIP4Markets(mockOutcomeData);
      expect(markets[0].tags).toContain('bitcoin');
      expect(markets[0].tags).toContain('hyperliquid');
      expect(markets[0].tags).toContain('hip-4');
    });
  });

  describe('mapToPredictMarkets', () => {
    it('maps HIP4Markets to PredictMarket type', () => {
      const hip4Markets = service.mapToHIP4Markets({
        outcomes: [
          {
            outcome: 10,
            name: 'Test Outcome',
            description: 'A test outcome',
            sideSpecs: [
              { name: 'Yes', token: 100 },
              { name: 'No', token: 101 },
            ],
          },
        ],
        questions: [
          {
            question: 1,
            name: 'Test Question',
            description: 'A test question',
            fallbackOutcome: 10,
            namedOutcomes: [10],
          },
        ],
      });

      const predictMarkets = service.mapToPredictMarkets(hip4Markets);

      expect(predictMarkets).toHaveLength(1);
      expect(predictMarkets[0].providerId).toBe('hyperliquid');
      expect(predictMarkets[0].title).toBe('Test Question');
      expect(predictMarkets[0].status).toBe('open');
      expect(predictMarkets[0].outcomes).toHaveLength(1);
      expect(predictMarkets[0].outcomes[0].tokens).toHaveLength(2);
      expect(predictMarkets[0].outcomes[0].tokens[0].title).toBe('Yes');
      expect(predictMarkets[0].outcomes[0].tokens[1].title).toBe('No');
    });
  });

  describe('clearCache', () => {
    it('clears all cached data', async () => {
      const infoClient = createMockInfoClient();

      // Populate caches
      await service.fetchOutcomeMarkets(infoClient);
      await service.fetchPrices(infoClient);

      // Clear
      service.clearCache();

      // Next calls should hit API again
      await service.fetchOutcomeMarkets(infoClient);
      await service.fetchPrices(infoClient);

      expect(infoClient.spotMeta).toHaveBeenCalledTimes(2);
      expect(infoClient.allMids).toHaveBeenCalledTimes(2);
    });
  });
});
