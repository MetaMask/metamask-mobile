import { HyperliquidPredictProvider } from './HyperliquidPredictProvider';
import type { Side } from '../../types';
import type { Signer } from '../types';

// Mock fetch globally
const mockFetchResponse = (data: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
};

const MOCK_SPOT_META = {
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
      name: 'Will BTC hit 200K by end of 2026?',
      description: 'Binary prediction on Bitcoin price.',
      fallbackOutcome: 10,
      namedOutcomes: [10],
    },
  ],
};

const MOCK_ALL_MIDS = {
  '@1568': '0.65',
  '@1569': '0.35',
};

describe('HyperliquidPredictProvider', () => {
  let provider: HyperliquidPredictProvider;

  beforeEach(() => {
    provider = new HyperliquidPredictProvider({ isTestnet: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('sets correct provider ID and name', () => {
      expect(provider.providerId).toBe('hyperliquid');
      expect(provider.name).toBe('Hyperliquid');
    });

    it('uses testnet chain ID when isTestnet is true', () => {
      const testnetProvider = new HyperliquidPredictProvider({
        isTestnet: true,
      });
      expect(testnetProvider.chainId).toBe(421614);
    });

    it('uses mainnet chain ID when isTestnet is false', () => {
      const mainnetProvider = new HyperliquidPredictProvider({
        isTestnet: false,
      });
      expect(mainnetProvider.chainId).toBe(42161);
    });
  });

  describe('getMarkets', () => {
    it('fetches and returns prediction markets', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        // First call is spotMeta, second is allMids
        const data = callCount === 1 ? MOCK_SPOT_META : MOCK_ALL_MIDS;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        });
      });

      const markets = await provider.getMarkets({});

      expect(markets).toHaveLength(1);
      expect(markets[0].providerId).toBe('hyperliquid');
      expect(markets[0].title).toBe('Will BTC hit 200K by end of 2026?');
      expect(markets[0].status).toBe('open');
    });

    it('returns empty array on API failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const markets = await provider.getMarkets({});

      expect(markets).toEqual([]);
    });

    it('filters by category', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        const data = callCount === 1 ? MOCK_SPOT_META : MOCK_ALL_MIDS;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        });
      });

      const cryptoMarkets = await provider.getMarkets({
        category: 'crypto',
      });
      expect(cryptoMarkets).toHaveLength(1); // BTC market is crypto

      // Reset for next call
      callCount = 0;
      provider = new HyperliquidPredictProvider({ isTestnet: true });

      const sportsMarkets = await provider.getMarkets({
        category: 'sports',
      });
      expect(sportsMarkets).toHaveLength(0);
    });

    it('filters by search query', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        const data = callCount === 1 ? MOCK_SPOT_META : MOCK_ALL_MIDS;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        });
      });

      const results = await provider.getMarkets({ q: 'btc' });
      expect(results).toHaveLength(1);

      callCount = 0;
      provider = new HyperliquidPredictProvider({ isTestnet: true });

      const noResults = await provider.getMarkets({ q: 'nonexistent' });
      expect(noResults).toHaveLength(0);
    });
  });

  describe('getMarketDetails', () => {
    it('returns details for a specific market', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        const data = callCount === 1 ? MOCK_SPOT_META : MOCK_ALL_MIDS;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        });
      });

      const details = await provider.getMarketDetails({
        marketId: 'hip4-1',
      });

      expect(details.id).toBe('hip4-1');
      expect(details.title).toBe('Will BTC hit 200K by end of 2026?');
    });

    it('throws when market not found', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        const data = callCount === 1 ? MOCK_SPOT_META : MOCK_ALL_MIDS;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        });
      });

      await expect(
        provider.getMarketDetails({ marketId: 'nonexistent' }),
      ).rejects.toThrow('Market not found');
    });
  });

  describe('previewOrder', () => {
    it('returns order preview with slippage', async () => {
      mockFetchResponse(MOCK_ALL_MIDS);

      const preview = await provider.previewOrder({
        marketId: 'hip4-1',
        outcomeId: '10',
        outcomeTokenId: '1568',
        side: 'BUY' as Side,
        size: 100,
        signer: {} as unknown as Signer,
      });

      expect(preview.sharePrice).toBeGreaterThan(0);
      expect(preview.slippage).toBe(0.02); // 2% buy slippage
      expect(preview.tickSize).toBe(0.001);
      expect(preview.minOrderSize).toBe(1);
      expect(preview.negRisk).toBe(false);
    });
  });

  describe('isEligible', () => {
    it('returns eligible by default', async () => {
      const result = await provider.isEligible();
      expect(result.isEligible).toBe(true);
    });
  });

  describe('getAccountState', () => {
    it('returns deployed state for any address', async () => {
      const state = await provider.getAccountState({
        providerId: 'hyperliquid',
        ownerAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });

      expect(state.isDeployed).toBe(true);
      expect(state.hasAllowances).toBe(true);
    });
  });

  describe('getPositions', () => {
    it('returns empty positions (not yet implemented)', async () => {
      const positions = await provider.getPositions({
        address: '0x1234567890abcdef1234567890abcdef12345678',
      });

      expect(positions).toEqual([]);
    });
  });
});
