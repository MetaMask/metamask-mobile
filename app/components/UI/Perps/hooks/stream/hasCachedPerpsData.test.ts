import { hasPreloadedData, getPreloadedData } from './hasCachedPerpsData';

const mockEngineState: Record<string, unknown> = {};

const mockGetAccountsFromSelectedAccountGroup = jest.fn().mockReturnValue([
  {
    address: '0xABCdef1234567890',
    id: 'account-1',
    type: 'eip155:eoa',
    metadata: { name: 'Test', importTime: 0, keyring: { type: 'HD Key Tree' } },
    methods: [],
    options: {},
    scopes: [],
  },
]);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      get state() {
        return mockEngineState;
      },
    },
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: (...args: unknown[]) =>
        mockGetAccountsFromSelectedAccountGroup(...args),
    },
  },
}));

const mockFindEvmAccount = jest.fn().mockReturnValue({
  address: '0xABCdef1234567890',
});

jest.mock('@metamask/perps-controller', () => ({
  findEvmAccount: (...args: unknown[]) => mockFindEvmAccount(...args),
}));

describe('hasPreloadedData', () => {
  beforeEach(() => {
    // Reset to empty state
    Object.keys(mockEngineState).forEach((key) => delete mockEngineState[key]);
    mockFindEvmAccount.mockReturnValue({
      address: '0xABCdef1234567890',
    });
    mockGetAccountsFromSelectedAccountGroup.mockReturnValue([
      {
        address: '0xABCdef1234567890',
        id: 'account-1',
        type: 'eip155:eoa',
        metadata: {
          name: 'Test',
          importTime: 0,
          keyring: { type: 'HD Key Tree' },
        },
        methods: [],
        options: {},
        scopes: [],
      },
    ]);
  });

  describe('cachedPositions (array field)', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedData('cachedPositions')).toBe(false);
    });

    it('returns true when cachedPositions is empty array (valid cache)', () => {
      mockEngineState.cachedPositions = [];
      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });

    it('returns false when cachedPositions is null', () => {
      mockEngineState.cachedPositions = null;
      expect(hasPreloadedData('cachedPositions')).toBe(false);
    });

    it('returns true when cachedPositions has items', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });
  });

  describe('cachedOrders (array field)', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedData('cachedOrders')).toBe(false);
    });

    it('returns true when cachedOrders has items', () => {
      mockEngineState.cachedOrders = [{ orderId: 'order-1' }];
      expect(hasPreloadedData('cachedOrders')).toBe(true);
    });

    it('returns true when cachedOrders is empty array (valid cache)', () => {
      mockEngineState.cachedOrders = [];
      expect(hasPreloadedData('cachedOrders')).toBe(true);
    });
  });

  describe('cachedAccountState (object field)', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedData('cachedAccountState')).toBe(false);
    });

    it('returns true when cachedAccountState exists', () => {
      mockEngineState.cachedAccountState = { availableBalance: '1000' };
      expect(hasPreloadedData('cachedAccountState')).toBe(true);
    });

    it('returns false when cachedAccountState is null', () => {
      mockEngineState.cachedAccountState = null;
      expect(hasPreloadedData('cachedAccountState')).toBe(false);
    });
  });

  describe('cachedMarketData', () => {
    it('returns false when no cached data exists', () => {
      expect(hasPreloadedData('cachedMarketData')).toBe(false);
    });

    it('returns false when cachedMarketData is null', () => {
      mockEngineState.cachedMarketData = null;
      expect(hasPreloadedData('cachedMarketData')).toBe(false);
    });

    it('returns true when cachedMarketData is empty array (valid cache)', () => {
      mockEngineState.cachedMarketData = [];
      expect(hasPreloadedData('cachedMarketData')).toBe(true);
    });

    it('returns true when cachedMarketData has items', () => {
      mockEngineState.cachedMarketData = [{ symbol: 'BTC', price: '$50000' }];
      expect(hasPreloadedData('cachedMarketData')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false when field is undefined (not set)', () => {
      expect(hasPreloadedData('cachedPositions')).toBe(false);
    });

    it('returns true when data exists regardless of timestamp', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      // No timestamp set — should still return true
      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });
  });

  describe('account validation', () => {
    it('returns false for user data when cachedUserDataAddress does not match current account', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      mockEngineState.cachedUserDataAddress = '0xDIFFERENTADDRESS';

      expect(hasPreloadedData('cachedPositions')).toBe(false);
    });

    it('trusts cache when cachedUserDataAddress is not set', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      // cachedUserDataAddress not set (undefined) — should trust the cache

      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });

    it('trusts cache when cachedUserDataAddress is null', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      mockEngineState.cachedUserDataAddress = null;

      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });

    it('trusts cache when AccountTreeController throws', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      mockEngineState.cachedUserDataAddress = '0xABCdef1234567890';
      mockGetAccountsFromSelectedAccountGroup.mockImplementation(() => {
        throw new Error('Controller not initialized');
      });

      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });

    it('trusts cache when no EVM account found', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      mockEngineState.cachedUserDataAddress = '0xABCdef1234567890';
      mockFindEvmAccount.mockReturnValue(null);

      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });

    it('trusts cache when EVM account has no address', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      mockEngineState.cachedUserDataAddress = '0xABCdef1234567890';
      mockFindEvmAccount.mockReturnValue({ address: undefined });

      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });

    it('skips account check for cachedMarketData (not account-specific)', () => {
      mockEngineState.cachedMarketData = [{ symbol: 'BTC', price: '$50000' }];
      mockEngineState.cachedUserDataAddress = '0xDIFFERENTADDRESS';
      mockFindEvmAccount.mockReturnValue({ address: '0xABCdef1234567890' });

      // Market data is not in USER_DATA_FIELDS, so account check is skipped
      expect(hasPreloadedData('cachedMarketData')).toBe(true);
    });

    it('matches addresses case-insensitively', () => {
      mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
      mockEngineState.cachedUserDataAddress = '0xABCDEF1234567890';
      mockFindEvmAccount.mockReturnValue({ address: '0xabcdef1234567890' });

      expect(hasPreloadedData('cachedPositions')).toBe(true);
    });
  });
});

describe('getPreloadedData', () => {
  beforeEach(() => {
    Object.keys(mockEngineState).forEach((key) => delete mockEngineState[key]);
    mockFindEvmAccount.mockReturnValue({
      address: '0xABCdef1234567890',
    });
    mockGetAccountsFromSelectedAccountGroup.mockReturnValue([
      {
        address: '0xABCdef1234567890',
        id: 'account-1',
        type: 'eip155:eoa',
        metadata: {
          name: 'Test',
          importTime: 0,
          keyring: { type: 'HD Key Tree' },
        },
        methods: [],
        options: {},
        scopes: [],
      },
    ]);
  });

  it('returns cached data when available', () => {
    const accountState = { availableBalance: '1000' };
    mockEngineState.cachedAccountState = accountState;
    expect(getPreloadedData('cachedAccountState')).toEqual(accountState);
  });

  it('returns cached array when available', () => {
    const positions = [{ symbol: 'BTC-PERP' }];
    mockEngineState.cachedPositions = positions;
    expect(getPreloadedData('cachedPositions')).toEqual(positions);
  });

  it('returns empty array when field is empty array', () => {
    mockEngineState.cachedOrders = [];
    expect(getPreloadedData('cachedOrders')).toEqual([]);
  });

  it('returns null when no cached data exists', () => {
    expect(getPreloadedData('cachedPositions')).toBeNull();
  });

  it('returns null when field is null', () => {
    mockEngineState.cachedAccountState = null;
    expect(getPreloadedData('cachedAccountState')).toBeNull();
  });

  it('returns cached market data when available', () => {
    const marketData = [{ symbol: 'BTC', price: '$50000' }];
    mockEngineState.cachedMarketData = marketData;
    expect(getPreloadedData('cachedMarketData')).toEqual(marketData);
  });

  it('returns null when cachedMarketData is not set', () => {
    expect(getPreloadedData('cachedMarketData')).toBeNull();
  });

  it('returns data regardless of timestamp', () => {
    mockEngineState.cachedPositions = [{ symbol: 'BTC-PERP' }];
    // No timestamp — should still return data
    expect(getPreloadedData('cachedPositions')).toEqual([
      { symbol: 'BTC-PERP' },
    ]);
  });

  describe('account validation', () => {
    it('returns null for user data when address mismatch', () => {
      mockEngineState.cachedAccountState = { availableBalance: '1000' };
      mockEngineState.cachedUserDataAddress = '0xDIFFERENTADDRESS';
      mockFindEvmAccount.mockReturnValue({ address: '0xABCdef1234567890' });

      expect(getPreloadedData('cachedAccountState')).toBeNull();
    });

    it('returns data when cachedUserDataAddress is not set', () => {
      mockEngineState.cachedAccountState = { availableBalance: '1000' };
      // No cachedUserDataAddress — should trust cache

      expect(getPreloadedData('cachedAccountState')).toEqual({
        availableBalance: '1000',
      });
    });

    it('returns market data regardless of address mismatch', () => {
      const marketData = [{ symbol: 'BTC', price: '$50000' }];
      mockEngineState.cachedMarketData = marketData;
      mockEngineState.cachedUserDataAddress = '0xDIFFERENTADDRESS';
      mockFindEvmAccount.mockReturnValue({ address: '0xABCdef1234567890' });

      expect(getPreloadedData('cachedMarketData')).toEqual(marketData);
    });
  });
});
