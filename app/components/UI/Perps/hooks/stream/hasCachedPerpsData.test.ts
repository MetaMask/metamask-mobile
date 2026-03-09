import { hasPreloadedData, getPreloadedData } from './hasCachedPerpsData';

let mockCachedMarketDataForActiveProvider: unknown[] | null = null;
let mockCachedUserDataForActiveProvider: {
  positions: unknown[];
  orders: unknown[];
  accountState: unknown;
} | null = null;

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getCachedMarketDataForActiveProvider: () =>
        mockCachedMarketDataForActiveProvider,
      getCachedUserDataForActiveProvider: () =>
        mockCachedUserDataForActiveProvider,
    },
  },
}));

describe('hasPreloadedData', () => {
  beforeEach(() => {
    mockCachedMarketDataForActiveProvider = null;
    mockCachedUserDataForActiveProvider = null;
  });

  describe('cachedPositions', () => {
    it('returns false when no cached data exists (helper returns null)', () => {
      expect(hasPreloadedData('cachedPositions')).toBe(false);
    });

    it('returns true when helper returns data with empty positions (valid cache)', () => {
      mockCachedUserDataForActiveProvider = {
        positions: [],
        orders: [],
        accountState: null,
      };
      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });

    it('returns true when helper returns data with positions', () => {
      mockCachedUserDataForActiveProvider = {
        positions: [{ symbol: 'BTC-PERP' }],
        orders: [],
        accountState: null,
      };
      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });
  });

  describe('cachedOrders', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedData('cachedOrders')).toBe(false);
    });

    it('returns true when helper returns data with orders', () => {
      mockCachedUserDataForActiveProvider = {
        positions: [],
        orders: [{ orderId: 'order-1' }],
        accountState: null,
      };
      expect(hasPreloadedData('cachedOrders')).toBe(true);
    });

    it('returns true when helper returns data with empty orders (valid cache)', () => {
      mockCachedUserDataForActiveProvider = {
        positions: [],
        orders: [],
        accountState: null,
      };
      expect(hasPreloadedData('cachedOrders')).toBe(true);
    });
  });

  describe('cachedAccountState', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedData('cachedAccountState')).toBe(false);
    });

    it('returns true when helper returns data with accountState', () => {
      mockCachedUserDataForActiveProvider = {
        positions: [],
        orders: [],
        accountState: { availableBalance: '1000' },
      };
      expect(hasPreloadedData('cachedAccountState')).toBe(true);
    });

    it('returns false when helper returns data with null accountState', () => {
      mockCachedUserDataForActiveProvider = {
        positions: [],
        orders: [],
        accountState: null,
      };
      expect(hasPreloadedData('cachedAccountState')).toBe(false);
    });
  });

  describe('cachedMarketData', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedData('cachedMarketData')).toBe(false);
    });

    it('returns false when getCachedMarketDataForActiveProvider returns null', () => {
      mockCachedMarketDataForActiveProvider = null;
      expect(hasPreloadedData('cachedMarketData')).toBe(false);
    });

    it('returns true when getCachedMarketDataForActiveProvider returns empty array (valid cache)', () => {
      mockCachedMarketDataForActiveProvider = [];
      expect(hasPreloadedData('cachedMarketData')).toBe(true);
    });

    it('returns true when getCachedMarketDataForActiveProvider returns items', () => {
      mockCachedMarketDataForActiveProvider = [
        { symbol: 'BTC', price: '$50000' },
      ];
      expect(hasPreloadedData('cachedMarketData')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false when helper returns null (no cache / stale / wrong account)', () => {
      expect(hasPreloadedData('cachedPositions')).toBe(false);
    });
  });
});

describe('getPreloadedData', () => {
  beforeEach(() => {
    mockCachedMarketDataForActiveProvider = null;
    mockCachedUserDataForActiveProvider = null;
  });

  it('returns cached positions when available', () => {
    const positions = [{ symbol: 'BTC-PERP' }];
    mockCachedUserDataForActiveProvider = {
      positions,
      orders: [],
      accountState: null,
    };
    expect(getPreloadedData('cachedPositions')).toEqual(positions);
  });

  it('returns cached orders when available', () => {
    const orders = [{ orderId: 'order-1' }];
    mockCachedUserDataForActiveProvider = {
      positions: [],
      orders,
      accountState: null,
    };
    expect(getPreloadedData('cachedOrders')).toEqual(orders);
  });

  it('returns empty array for empty positions (valid cache)', () => {
    mockCachedUserDataForActiveProvider = {
      positions: [],
      orders: [],
      accountState: null,
    };
    expect(getPreloadedData('cachedPositions')).toEqual([]);
  });

  it('returns cached accountState when available', () => {
    const accountState = { availableBalance: '1000' };
    mockCachedUserDataForActiveProvider = {
      positions: [],
      orders: [],
      accountState,
    };
    expect(getPreloadedData('cachedAccountState')).toEqual(accountState);
  });

  it('returns null for accountState when accountState is null', () => {
    mockCachedUserDataForActiveProvider = {
      positions: [],
      orders: [],
      accountState: null,
    };
    expect(getPreloadedData('cachedAccountState')).toBeNull();
  });

  it('returns null when no cached data exists (helper returns null)', () => {
    expect(getPreloadedData('cachedPositions')).toBeNull();
  });

  it('returns cached market data when available', () => {
    const marketData = [{ symbol: 'BTC', price: '$50000' }];
    mockCachedMarketDataForActiveProvider = marketData;
    expect(getPreloadedData('cachedMarketData')).toEqual(marketData);
  });

  it('returns null when cachedMarketData is not set', () => {
    mockCachedMarketDataForActiveProvider = null;
    expect(getPreloadedData('cachedMarketData')).toBeNull();
  });

  it('returns market data regardless of user data helper state', () => {
    const marketData = [{ symbol: 'BTC', price: '$50000' }];
    mockCachedMarketDataForActiveProvider = marketData;
    mockCachedUserDataForActiveProvider = null; // user data is stale/missing
    expect(getPreloadedData('cachedMarketData')).toEqual(marketData);
  });
});
