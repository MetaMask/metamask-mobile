import {
  hasPreloadedUserData,
  getPreloadedUserData,
} from './hasCachedPerpsData';

const mockEngineState: Record<string, unknown> = {};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      get state() {
        return mockEngineState;
      },
    },
  },
}));

describe('hasPreloadedUserData', () => {
  beforeEach(() => {
    // Reset to empty state
    Object.keys(mockEngineState).forEach((key) => delete mockEngineState[key]);
  });

  describe('cachedPositions (array field)', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedUserData('cachedPositions')).toBe(false);
    });

    it('returns true when cachedPositions is empty array (valid cache)', () => {
      mockEngineState.cachedPositions = [];
      expect(hasPreloadedUserData('cachedPositions')).toBe(true);
    });

    it('returns false when cachedPositions is null', () => {
      mockEngineState.cachedPositions = null;
      expect(hasPreloadedUserData('cachedPositions')).toBe(false);
    });

    it('returns true when cachedPositions has items', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      expect(hasPreloadedUserData('cachedPositions')).toBe(true);
    });
  });

  describe('cachedOrders (array field)', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedUserData('cachedOrders')).toBe(false);
    });

    it('returns true when cachedOrders has items', () => {
      mockEngineState.cachedOrders = [{ orderId: 'order-1' }];
      expect(hasPreloadedUserData('cachedOrders')).toBe(true);
    });

    it('returns true when cachedOrders is empty array (valid cache)', () => {
      mockEngineState.cachedOrders = [];
      expect(hasPreloadedUserData('cachedOrders')).toBe(true);
    });
  });

  describe('cachedAccountState (object field)', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedUserData('cachedAccountState')).toBe(false);
    });

    it('returns true when cachedAccountState exists', () => {
      mockEngineState.cachedAccountState = { availableBalance: '1000' };
      expect(hasPreloadedUserData('cachedAccountState')).toBe(true);
    });

    it('returns false when cachedAccountState is null', () => {
      mockEngineState.cachedAccountState = null;
      expect(hasPreloadedUserData('cachedAccountState')).toBe(false);
    });
  });

  describe('cachedMarketData', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedUserData('cachedMarketData')).toBe(false);
    });

    it('returns false when cachedMarketData is null', () => {
      mockEngineState.cachedMarketData = null;
      expect(hasPreloadedUserData('cachedMarketData')).toBe(false);
    });

    it('returns true when cachedMarketData is empty array (valid cache)', () => {
      mockEngineState.cachedMarketData = [];
      expect(hasPreloadedUserData('cachedMarketData')).toBe(true);
    });

    it('returns true when cachedMarketData has items', () => {
      mockEngineState.cachedMarketData = [{ symbol: 'BTC', price: '$50000' }];
      expect(hasPreloadedUserData('cachedMarketData')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false when field is undefined (not set)', () => {
      expect(hasPreloadedUserData('cachedPositions')).toBe(false);
    });

    it('returns true when data exists regardless of timestamp', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      // No timestamp set — should still return true
      expect(hasPreloadedUserData('cachedPositions')).toBe(true);
    });
  });
});

describe('getPreloadedUserData', () => {
  beforeEach(() => {
    Object.keys(mockEngineState).forEach((key) => delete mockEngineState[key]);
  });

  it('returns cached data when available', () => {
    const accountState = { availableBalance: '1000' };
    mockEngineState.cachedAccountState = accountState;
    expect(getPreloadedUserData('cachedAccountState')).toEqual(accountState);
  });

  it('returns cached array when available', () => {
    const positions = [{ symbol: 'BTC-PERP' }];
    mockEngineState.cachedPositions = positions;
    expect(getPreloadedUserData('cachedPositions')).toEqual(positions);
  });

  it('returns empty array when field is empty array', () => {
    mockEngineState.cachedOrders = [];
    expect(getPreloadedUserData('cachedOrders')).toEqual([]);
  });

  it('returns null when no cached data exists', () => {
    expect(getPreloadedUserData('cachedPositions')).toBeNull();
  });

  it('returns null when field is null', () => {
    mockEngineState.cachedAccountState = null;
    expect(getPreloadedUserData('cachedAccountState')).toBeNull();
  });

  it('returns cached market data when available', () => {
    const marketData = [{ symbol: 'BTC', price: '$50000' }];
    mockEngineState.cachedMarketData = marketData;
    expect(getPreloadedUserData('cachedMarketData')).toEqual(marketData);
  });

  it('returns null when cachedMarketData is not set', () => {
    expect(getPreloadedUserData('cachedMarketData')).toBeNull();
  });

  it('returns data regardless of timestamp', () => {
    mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
    // No timestamp — should still return data
    expect(getPreloadedUserData('cachedPositions')).toEqual([
      { symbol: 'BTC-PERP' },
    ]);
  });
});
