import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import { CardToken, CardTokenAllowance, AllowanceState } from '../types';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: jest.requireActual('../../../../util/trace').TraceName,
  TraceOperation: jest.requireActual('../../../../util/trace').TraceOperation,
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokensController: {
      state: {
        allTokens: {},
      },
      addToken: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

describe('useGetPriorityCardToken', () => {
  const mockGetPriorityToken = jest.fn();
  const mockFetchAllowances = jest.fn();
  const mockDispatch = jest.fn();
  const mockTrace = jest.fn();
  const mockEndTrace = jest.fn();

  let mockPriorityToken: CardTokenAllowance | null = null;
  let mockLastFetched: Date | string | null = null;
  // Mock Redux state that persists across test lifecycle
  const mockSDK = {
    getPriorityToken: mockGetPriorityToken,
    getSupportedTokensAllowances: mockFetchAllowances,
    supportedTokens: [
      {
        address: '0xToken1',
        decimals: 18,
        symbol: 'TKN1',
        name: 'Token 1',
      },
      {
        address: '0xToken2',
        decimals: 18,
        symbol: 'TKN2',
        name: 'Token 2',
      },
      {
        address: '0xToken3',
        decimals: 18,
        symbol: 'TKN3',
        name: 'Token 3',
      },
      {
        address: '0xSupportedToken',
        decimals: 18,
        symbol: 'SUPP',
        name: 'Supported Token',
      },
    ],
  };

  const mockAddress = '0x1234567890123456789012345678901234567890';

  // Create mock data that matches the SDK response format - simplified version
  const createMockSDKTokenData = (address: string, allowanceAmount: string) => {
    const numAmount = Number(allowanceAmount);
    return {
      address,
      usAllowance: {
        gt: (other: number) => numAmount > other,
        toString: () => allowanceAmount,
        isZero: () => allowanceAmount === '0',
        lt: (other: number) => numAmount < other,
      },
      globalAllowance: {
        gt: (other: number) => numAmount > other,
        toString: () => allowanceAmount,
        isZero: () => allowanceAmount === '0',
        lt: (other: number) => numAmount < other,
      },
    };
  };

  const mockSDKTokensData = [
    createMockSDKTokenData('0xToken1', '1000000000000'), // > ARBITRARY_ALLOWANCE for Enabled state
    createMockSDKTokenData('0xToken2', '500000000000'), // > ARBITRARY_ALLOWANCE for Enabled state
    createMockSDKTokenData('0xToken3', '0'),
  ];

  const mockCardToken: CardToken = {
    address: '0xToken1',
    decimals: 18,
    symbol: 'TKN1',
    name: 'Token 1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all individual mock functions
    mockGetPriorityToken.mockReset();
    mockFetchAllowances.mockReset();
    mockDispatch.mockReset();
    mockTrace.mockReset();
    mockEndTrace.mockReset();

    mockPriorityToken = null;
    mockLastFetched = null;

    // Create simplified stable references for Engine controllers
    const tokensController = {
      state: {
        allTokens: {
          [LINEA_CHAIN_ID]: {
            [mockAddress.toLowerCase()]: [], // Empty by default for most tests
          },
        },
      },
      addToken: jest.fn().mockResolvedValue(undefined),
    };

    const networkController = {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('linea-mainnet'),
    };

    // Update the mocked Engine context with stable references
    const mockEngine = jest.requireMock('../../../../core/Engine');
    mockEngine.context.TokensController = tokensController;
    mockEngine.context.NetworkController = networkController;

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    // Simplified dispatch mock
    mockDispatch.mockImplementation((action) => action);

    // Simplified selector mock with basic return values
    const { useSelector, useDispatch } = jest.requireMock('react-redux');

    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectAllTokenBalances')) {
        return {
          [mockAddress.toLowerCase()]: {
            [LINEA_CHAIN_ID]: {
              '0xToken1': '1000000000000000000',
              '0xToken2': '500000000000000000',
              '0xToken3': '0',
            },
          },
        };
      }
      if (selectorStr.includes('selectCardPriorityTokenLastFetched')) {
        return null;
      }
      if (selectorStr.includes('selectCardPriorityToken')) {
        return null;
      }
      return null;
    });

    useDispatch.mockReturnValue(mockDispatch);

    (strings as jest.Mock).mockReturnValue('Error occurred');

    // Mock trace utilities
    const { trace, endTrace } = jest.requireMock('../../../../util/trace');
    trace.mockImplementation(mockTrace);
    endTrace.mockImplementation(mockEndTrace);
  });

  it('should initialize with correct default state', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() =>
      useGetPriorityCardToken(mockAddress, false),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.priorityToken).toBe(null);
  });

  it('should fetch priority token successfully', async () => {
    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: '0x1234567890123456789012345678901234567890',
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityTokenLastFetched'),
        payload: expect.objectContaining({
          address: '0x1234567890123456789012345678901234567890',
          lastFetched: expect.any(Date),
        }),
      }),
    );

    // Verify SDK was used to suggest a priority token
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(mockAddress, [
      '0xToken1',
      '0xToken2',
    ]);
    expect(mockTrace).toHaveBeenCalledWith({
      name: expect.any(String),
      op: expect.any(String),
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: expect.any(String),
    });
  });

  it('should handle null response from API', async () => {
    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(null);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the hook to complete its async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Verify that dispatch was called with the correct token (fallback to first valid allowance)
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: '0x1234567890123456789012345678901234567890',
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch priority token');
    mockFetchAllowances.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the hook to complete its async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(true);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useGetPriorityCardToken::error fetching priority token',
    );
  });

  it('should not fetch when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should not fetch when address is not provided', async () => {
    const { result } = renderHook(() =>
      useGetPriorityCardToken(undefined, false),
    );

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should use cached token when cache is valid', async () => {
    const now = new Date();
    const recentTimestamp = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
    const cachedToken = {
      address: '0xCachedToken',
      symbol: 'CACHED',
      name: 'Cached Token',
      decimals: 18,
      allowanceState: AllowanceState.Enabled,
      isStaked: false,
      chainId: LINEA_CHAIN_ID,
    } as CardTokenAllowance;

    jest.resetAllMocks();

    const testMockFetchAllowances = jest.fn();
    const testMockGetPriorityToken = jest.fn();
    const testMockDispatch = jest.fn();

    const useReduxMocks = jest.requireMock('react-redux');
    useReduxMocks.useDispatch.mockReturnValue(testMockDispatch);

    // Mock useSelector to consistently return cached values
    // We need to track which selector is being called and return appropriate values
    let selectorCallCount = 0;
    const expectedSelectorCalls = [
      'selectAllTokenBalances', // First call for token balances
      'selectCardPriorityToken', // Second call for cached priority token
      'selectCardPriorityTokenLastFetched', // Third call for last fetched timestamp
    ];

    useReduxMocks.useSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const selectorString = selector.toString();

        if (selectorString.includes('selectAllTokenBalances')) {
          return {
            [mockAddress.toLowerCase()]: {
              '0x1': {
                '0xCachedToken': '1000000000000000000',
              },
            },
          };
        }

        // For the address-based selectors, they will contain references to the state structure
        // Let's be more explicit about what we return
        if (selectorString.includes('priorityTokensByAddress')) {
          return cachedToken;
        }

        if (selectorString.includes('lastFetchedByAddress')) {
          return recentTimestamp;
        }

        // Fallback: if we can't identify the selector, assume it's asking for cached data
        const currentCall =
          expectedSelectorCalls[
            selectorCallCount % expectedSelectorCalls.length
          ];
        selectorCallCount++;

        switch (currentCall) {
          case 'selectCardPriorityToken':
            return cachedToken;
          case 'selectCardPriorityTokenLastFetched':
            return recentTimestamp;
          default:
            return null;
        }
      },
    );

    // Mock Engine with token that already exists
    const mockEngine = jest.requireMock('../../../../core/Engine');
    mockEngine.context.TokensController.state.allTokens = {
      [LINEA_CHAIN_ID]: {
        [mockAddress.toLowerCase()]: [
          {
            address: '0xCachedToken',
            symbol: 'CACHED',
            name: 'Cached Token',
            decimals: 18,
          },
        ],
      },
    };

    const sdkMocks = jest.requireMock('../sdk');
    sdkMocks.useCardSDK.mockReturnValue({
      sdk: {
        getSupportedTokensAllowances: testMockFetchAllowances,
        getPriorityToken: testMockGetPriorityToken,
        supportedTokens: [
          {
            address: '0xCachedToken',
            symbol: 'CACHED',
            name: 'Cached Token',
            decimals: 18,
          },
        ],
      },
    });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Give the hook time to stabilize
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // The key assertion: no API calls should have been made
    expect(testMockFetchAllowances).not.toHaveBeenCalled();
    expect(testMockGetPriorityToken).not.toHaveBeenCalled();

    // No new dispatch calls should have been made since cache is valid
    expect(testMockDispatch).not.toHaveBeenCalled();

    // Hook should not be in loading or error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    // And the cached token should be surfaced by the hook
    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xCachedToken',
        symbol: 'CACHED',
      }),
    );
  });

  it('should fetch new data when cache is stale', async () => {
    // Set up a stale cached token (older than 5 minutes)
    const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    // Override the selector to return stale cache
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      const selectorString = selector.toString();
      if (selectorString.includes('selectAllTokenBalances')) {
        return {
          [mockAddress.toLowerCase()]: {
            [LINEA_CHAIN_ID]: {
              '0xToken1': '1000000000000000000',
            },
          },
        };
      }
      if (selectorString.includes('selectCardPriorityToken')) {
        return null; // No cached token
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return staleTimestamp; // Stale timestamp
      }
      return null;
    });

    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the fetch to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should have called the API since cache is stale
    expect(mockFetchAllowances).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);

    // Should have dispatched new actions
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should handle multiple consecutive fetch calls', async () => {
    // Test multiple fetch calls with valid address - each should make fresh API calls
    const expectedSDKToken1 = createMockSDKTokenData('0xToken1', '1000000');

    mockFetchAllowances.mockResolvedValueOnce([expectedSDKToken1]);
    mockGetPriorityToken.mockResolvedValueOnce({
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
    });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for automatic fetch from useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Verify that setCardPriorityToken was called with the expected token
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
          }),
        }),
      }),
    );

    // Set up second fetch with different data
    const expectedSDKToken2 = createMockSDKTokenData('0xToken2', '500000');

    mockFetchAllowances.mockResolvedValueOnce([expectedSDKToken2]);
    mockGetPriorityToken.mockResolvedValueOnce({
      address: '0xToken2',
      symbol: 'TKN2',
      name: 'Token 2',
      decimals: 18,
    });

    // Manual fetch should get fresh data
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken();
    });
    expect(priorityToken2).toEqual(
      expect.objectContaining({
        address: '0xToken2',
        symbol: 'TKN2',
        name: 'Token 2',
      }),
    );

    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2); // Called for both fetches
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should make fresh API calls on each fetchPriorityToken invocation', async () => {
    // The fetchPriorityToken function doesn't cache - it always makes fresh API calls
    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the automatic fetch from useEffect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Verify that setCardPriorityToken was called with the expected token
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );
    expect(mockFetchAllowances).toHaveBeenCalledTimes(1);

    // Reset the call count to track subsequent calls
    mockFetchAllowances.mockClear();
    mockGetPriorityToken.mockClear();

    // Manual fetch should make fresh API calls
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken();
    });

    expect(priorityToken2).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
      }),
    );
    expect(mockFetchAllowances).toHaveBeenCalledTimes(1); // Fresh API call made
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1); // Fresh API call made

    // Verify that dispatch was called again after manual fetch
    expect(mockDispatch).toHaveBeenCalledTimes(4); // 2 for auto-fetch (token + timestamp), 2 for manual fetch (token + timestamp)
  });

  it('should fallback to token with positive balance when suggested token has zero balance', async () => {
    // Create SDK format allowances where suggested token has zero balance
    const tokenWithZeroBalanceSDK = createMockSDKTokenData(
      '0xZeroBalance',
      '1000000000000',
    );
    const tokenWithPositiveBalanceSDK = createMockSDKTokenData(
      '0xToken2',
      '500000000000',
    );
    const allowancesWithZeroBalance = [
      tokenWithZeroBalanceSDK,
      tokenWithPositiveBalanceSDK,
    ];

    const suggestedTokenWithZeroBalance = {
      address: '0xZeroBalance',
      symbol: 'ZERO',
      name: 'Zero Balance Token',
      decimals: 18,
    };

    // Mock balances where suggested token has zero balance
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      // Mock different selectors based on what they're selecting
      if (selector.toString().includes('selectAllTokenBalances')) {
        return {
          [mockAddress.toLowerCase()]: {
            '0x1': {
              '0xZeroBalance': '0', // Zero balance (exact case match with suggested token)
              '0xToken2': '500000000000000000', // Positive balance (exact case match with allowance)
            },
          },
        };
      }
      if (selector.toString().includes('selectCardPriorityToken')) {
        return mockPriorityToken; // Use the shared mock state
      }
      if (selector.toString().includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched; // Use the shared mock state
      }
      return null;
    });

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken2',
            symbol: 'TKN2',
            name: 'Token 2',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should return suggested token even with zero balance if no other token has positive balance', async () => {
    // Create SDK format allowances where all tokens have zero balance
    const tokenWithZeroBalance1SDK = createMockSDKTokenData(
      '0xToken1',
      '1000000000000',
    );
    const tokenWithZeroBalance2SDK = createMockSDKTokenData(
      '0xToken2',
      '500000000000',
    );
    const allowancesWithZeroBalance = [
      tokenWithZeroBalance1SDK,
      tokenWithZeroBalance2SDK,
    ];

    const suggestedTokenWithZeroBalance = {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
    };

    // Mock balances where all tokens have zero balance
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      // Mock different selectors based on what they're selecting
      if (selector.toString().includes('selectAllTokenBalances')) {
        return {
          [mockAddress.toLowerCase()]: {
            '0x1': {
              '0xToken1': '0',
              '0xToken2': '0',
            },
          },
        };
      }
      if (selector.toString().includes('selectCardPriorityToken')) {
        return mockPriorityToken; // Use the shared mock state
      }
      if (selector.toString().includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched; // Use the shared mock state
      }
      return null;
    });

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should maintain loading state correctly during fetch', async () => {
    // Start with no address to avoid automatic fetching
    const { result, rerender } = renderHook(
      ({ address }: { address?: string }) => useGetPriorityCardToken(address),
      {
        initialProps: { address: undefined as string | undefined },
      },
    );

    // Initially, loading should be false with no address
    expect(result.current.isLoading).toBe(false);

    let resolvePromise: (value: CardToken) => void;
    const mockPromise = new Promise<CardToken>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockReturnValue(mockPromise);

    // Now provide an address which will trigger useEffect and start loading
    rerender({ address: mockAddress });

    // Wait a tick for the useEffect to trigger and set loading to true
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Loading should now be true as the fetch is in progress
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise which should set loading back to false
    await act(async () => {
      resolvePromise?.(mockCardToken);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Let the promise resolve
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should refetch when SDK becomes available', async () => {
    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for initial mount with no SDK
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toBeNull();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();

    // Enable SDK and create a new hook instance to trigger fetch
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    renderHook(() => useGetPriorityCardToken(mockAddress));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should automatically fetch priority token on mount when address is provided', async () => {
    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the useEffect to trigger the fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );
    expect(mockFetchAllowances).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should handle concurrent fetch calls correctly', async () => {
    let resolvePromise1: (value: CardToken) => void;
    let resolvePromise2: (value: CardToken) => void;

    const mockPromise1 = new Promise<CardToken>((resolve) => {
      resolvePromise1 = resolve;
    });
    const mockPromise2 = new Promise<CardToken>((resolve) => {
      resolvePromise2 = resolve;
    });

    const mockToken1 = {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
    };
    const mockToken2 = {
      address: '0xToken2',
      symbol: 'TKN2',
      name: 'Token 2',
      decimals: 18,
    };
    const mockSDKAllowance1 = createMockSDKTokenData(
      '0xToken1',
      '1000000000000',
    ); // Large allowance for enabled state
    const mockSDKAllowance2 = createMockSDKTokenData(
      '0xToken2',
      '500000000000',
    ); // Large allowance for enabled state

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the automatic fetch from useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    mockFetchAllowances.mockResolvedValueOnce([mockSDKAllowance1]);
    mockFetchAllowances.mockResolvedValueOnce([mockSDKAllowance2]);
    mockGetPriorityToken.mockReturnValueOnce(mockPromise1);
    mockGetPriorityToken.mockReturnValueOnce(mockPromise2);

    let priorityToken1: CardTokenAllowance | null | undefined;
    let priorityToken2: CardTokenAllowance | null | undefined;

    // Test concurrent calls by calling both functions within act
    let fetch1: Promise<CardTokenAllowance | null>;
    let fetch2: Promise<CardTokenAllowance | null>;

    await act(async () => {
      fetch1 = result.current.fetchPriorityToken();
      fetch2 = result.current.fetchPriorityToken();
    });

    // Resolve both promises in an act block
    await act(async () => {
      resolvePromise1?.(mockToken1);
      resolvePromise2?.(mockToken2);
    });

    // Wait for both fetches to complete
    await act(async () => {
      priorityToken1 = await fetch1;
      priorityToken2 = await fetch2;
    });

    expect(priorityToken1).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
      }),
    );
    expect(priorityToken2).toEqual(
      expect.objectContaining({
        address: '0xToken2',
        symbol: 'TKN2',
        name: 'Token 2',
        allowanceState: AllowanceState.Enabled,
      }),
    );
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return fallback token when no allowances are returned', async () => {
    // Mock empty allowances array
    mockFetchAllowances.mockResolvedValue([]);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the hook to complete its async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should dispatch the first supported token as fallback
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.NotEnabled,
            isStaked: false,
            chainId: LINEA_CHAIN_ID,
          }),
        }),
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityTokenLastFetched',
        payload: expect.objectContaining({
          address: '0x1234567890123456789012345678901234567890',
          lastFetched: expect.any(Date),
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should handle address change and refetch', async () => {
    const address1 = '0x1111111111111111111111111111111111111111';
    const address2 = '0x2222222222222222222222222222222222222222';
    const mockSDKAllowance1 = createMockSDKTokenData(
      '0xToken1',
      '1000000000000',
    ); // Large allowance for enabled state
    const mockSDKAllowance2 = createMockSDKTokenData(
      '0xToken2',
      '500000000000',
    ); // Large allowance for enabled state
    const mockToken1 = {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
    };
    const mockToken2 = {
      address: '0xToken2',
      symbol: 'TKN2',
      name: 'Token 2',
      decimals: 18,
    };

    // Set up proper token balances for both addresses
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      // Mock different selectors based on what they're selecting
      if (selector.toString().includes('selectAllTokenBalances')) {
        return {
          [address1.toLowerCase()]: {
            '0x1': {
              '0xToken1': '1000000000000000000',
            },
          },
          [address2.toLowerCase()]: {
            '0x1': {
              '0xToken2': '500000000000000000',
            },
          },
        };
      }
      if (selector.toString().includes('selectCardPriorityToken')) {
        return mockPriorityToken; // Use the shared mock state
      }
      if (selector.toString().includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched; // Use the shared mock state
      }
      return null;
    });

    // Use mockResolvedValue instead of mockResolvedValueOnce for multiple calls
    mockFetchAllowances.mockResolvedValue([mockSDKAllowance1]);
    mockGetPriorityToken.mockResolvedValue(mockToken1);

    const { rerender } = renderHook(
      ({ address }) => useGetPriorityCardToken(address),
      {
        initialProps: { address: address1 },
      },
    );

    // Wait for the useEffect to trigger the fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );
    expect(mockGetPriorityToken).toHaveBeenCalledWith(address1, ['0xToken1']);

    // Reset mocks for second address
    mockFetchAllowances.mockClear();
    mockGetPriorityToken.mockClear();
    mockFetchAllowances.mockResolvedValue([mockSDKAllowance2]);
    mockGetPriorityToken.mockResolvedValue(mockToken2);

    // Change address and verify refetch
    rerender({ address: address2 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken2',
            symbol: 'TKN2',
            name: 'Token 2',
            allowanceState: AllowanceState.Enabled,
          }),
        }),
      }),
    );
    expect(mockGetPriorityToken).toHaveBeenLastCalledWith(address2, [
      '0xToken2',
    ]);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1); // Only once since we cleared
  });

  it('should return null when no allowances and no supported tokens exist', async () => {
    // Mock empty allowances and no supported tokens
    mockFetchAllowances.mockResolvedValue([]);

    // Override SDK to have no supported tokens
    (useCardSDK as jest.Mock).mockReturnValue({
      sdk: {
        ...mockSDK,
        supportedTokens: [],
      },
    });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the hook to complete its async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should dispatch null when no fallback tokens available
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: '0x1234567890123456789012345678901234567890',
          token: null,
        }),
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityTokenLastFetched',
        payload: expect.objectContaining({
          address: '0x1234567890123456789012345678901234567890',
          lastFetched: expect.any(Date),
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should handle error when getSupportedTokensAllowances returns null', async () => {
    // Mock null response from getSupportedTokensAllowances (which causes fetchAllowances to throw)
    mockFetchAllowances.mockResolvedValue(null);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the hook to complete its async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // This should trigger an error since fetchAllowances tries to map over null
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(true);
    expect(result.current.priorityToken).toBeNull();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useGetPriorityCardToken::error fetching priority token',
    );
  });

  it('should return first token when all allowances have zero balance', async () => {
    // Create allowances where all have zero allowance amounts
    const zeroAllowanceTokens = [
      createMockSDKTokenData('0xToken1', '0'), // Zero allowance
      createMockSDKTokenData('0xToken2', '0'), // Zero allowance
      createMockSDKTokenData('0xToken3', '0'), // Zero allowance
    ];

    mockFetchAllowances.mockResolvedValue(zeroAllowanceTokens);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the hook to complete its async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should dispatch the first token even though it has zero allowance
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.NotEnabled, // Zero allowance = NotEnabled
          }),
        }),
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityTokenLastFetched',
        payload: expect.objectContaining({
          address: '0x1234567890123456789012345678901234567890',
          lastFetched: expect.any(Date),
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled(); // Should not call getPriorityToken if no valid allowances
  });

  it('should handle case when all tokens have zero allowance and no supported tokens', async () => {
    // Create allowances where all have zero allowance amounts
    const zeroAllowanceTokens = [
      createMockSDKTokenData('0xUnknownToken', '0'), // Zero allowance, not in supported tokens
    ];

    mockFetchAllowances.mockResolvedValue(zeroAllowanceTokens);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the hook to complete its async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should dispatch null since the token is not in supported tokens (filtered out)
    // and falls back to the fallback token logic
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: expect.any(String),
          token: expect.objectContaining({
            address: '0xToken1', // First supported token as fallback
            allowanceState: AllowanceState.NotEnabled,
          }),
        }),
      }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  describe('Token Adding Functionality', () => {
    // Pre-create static objects to avoid recreating them in each test
    const STATIC_TOKEN_BALANCES = {
      [mockAddress.toLowerCase()]: {
        [LINEA_CHAIN_ID]: {
          '0xToken1': '1000000000000000000',
        },
      },
    };

    const STATIC_PRIORITY_TOKEN = {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
      chainId: LINEA_CHAIN_ID,
      allowanceState: AllowanceState.Enabled,
      isStaked: false,
    } as CardTokenAllowance;

    const STATIC_EMPTY_TOKEN_LIST: unknown[] = [];
    const STATIC_EXISTING_TOKEN_LIST = [
      {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
      },
    ];

    let mockTokensController: {
      state: { allTokens: Record<string, Record<string, unknown[]>> };
      addToken: jest.Mock;
    };
    let mockNetworkController: { findNetworkClientIdByChainId: jest.Mock };

    beforeEach(() => {
      // Reset all mocks from the parent describe block
      jest.clearAllMocks();
      mockGetPriorityToken.mockReset();
      mockFetchAllowances.mockReset();
      mockDispatch.mockReset();

      // Create simple mock controllers
      mockTokensController = {
        state: {
          allTokens: {
            [LINEA_CHAIN_ID]: {
              [mockAddress.toLowerCase()]: STATIC_EMPTY_TOKEN_LIST,
            },
          },
        },
        addToken: jest.fn().mockResolvedValue(undefined),
      };

      mockNetworkController = {
        findNetworkClientIdByChainId: jest
          .fn()
          .mockReturnValue('linea-mainnet'),
      };

      // Set up the mock Engine with static references
      const mockEngine = jest.requireMock('../../../../core/Engine');
      mockEngine.context.TokensController = mockTokensController;
      mockEngine.context.NetworkController = mockNetworkController;

      // Set up SDK mock to avoid fetch attempts
      (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

      // Mock successful API calls to avoid errors
      mockFetchAllowances.mockResolvedValue([]);
      mockGetPriorityToken.mockResolvedValue(null);

      // Simplified dispatch mock
      mockDispatch.mockImplementation((action) => action);

      // Simplified selector implementation
      const { useSelector, useDispatch } = jest.requireMock('react-redux');
      useSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const selectorStr = selector.toString();
          if (selectorStr.includes('selectAllTokenBalances')) {
            return STATIC_TOKEN_BALANCES;
          }
          if (selectorStr.includes('selectCardPriorityToken')) {
            return STATIC_PRIORITY_TOKEN;
          }
          if (selectorStr.includes('selectCardPriorityTokenLastFetched')) {
            return new Date();
          }
          return null;
        },
      );

      useDispatch.mockReturnValue(mockDispatch);
    });

    afterEach(() => {
      // Clear any references to prevent memory leaks
      mockTokensController =
        undefined as unknown as typeof mockTokensController;
      mockNetworkController =
        undefined as unknown as typeof mockNetworkController;
    });

    it('should add token when it does not exist in TokensController', async () => {
      const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

      // Wait for the addToken effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTokensController.addToken).toHaveBeenCalledWith({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        image: expect.any(String),
        networkClientId: 'linea-mainnet',
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('should not add token when it already exists in TokensController', async () => {
      // Mock token already existing in controller
      mockTokensController.state.allTokens = {
        [LINEA_CHAIN_ID]: {
          [mockAddress.toLowerCase()]: STATIC_EXISTING_TOKEN_LIST,
        },
      };

      const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

      // Wait for the addToken effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTokensController.addToken).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('should handle token addition error gracefully', async () => {
      mockTokensController.addToken.mockRejectedValue(
        new Error('Add token failed'),
      );

      const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

      // Wait for the addToken effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTokensController.addToken).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'useGetPriorityCardToken::error adding priority token',
      );
      expect(result.current.error).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not add token when priorityToken is null', async () => {
      // Mock no priority token
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const selectorString = selector.toString();
          if (selectorString.includes('selectCardPriorityToken')) {
            return null; // No priority token
          }
          return null;
        },
      );

      const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

      // Wait for effects to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTokensController.addToken).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
