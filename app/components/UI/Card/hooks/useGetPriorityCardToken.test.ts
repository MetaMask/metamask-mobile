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

describe('useGetPriorityCardToken', () => {
  const mockGetPriorityToken = jest.fn();
  const mockFetchAllowances = jest.fn();
  const mockDispatch = jest.fn();
  const mockTrace = jest.fn();
  const mockEndTrace = jest.fn();

  // Mock Redux state that persists across test lifecycle
  let mockPriorityToken: CardTokenAllowance | null = null;
  let mockLastFetched: Date | string | null = null;
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

  // Create mock data that matches the SDK response format
  const createMockSDKTokenData = (
    address: string,
    allowanceAmount: string,
  ) => ({
    address,
    usAllowance: {
      gt: (other: number) => Number(allowanceAmount) > other,
      toString: () => allowanceAmount,
      isZero: () => allowanceAmount === '0',
      lt: (other: number) => Number(allowanceAmount) < other,
    },
    globalAllowance: {
      gt: (other: number) => Number(allowanceAmount) > other,
      toString: () => allowanceAmount,
      isZero: () => allowanceAmount === '0',
      lt: (other: number) => Number(allowanceAmount) < other,
    },
  });

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
    mockGetPriorityToken.mockReset();
    mockFetchAllowances.mockReset();
    mockDispatch.mockReset();
    mockTrace.mockReset();
    mockEndTrace.mockReset();

    // Reset mock state for each test
    mockPriorityToken = null;
    mockLastFetched = null;

    // Mock token balances
    const defaultTokenBalances = {
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xToken1': '1000000000000000000',
          '0xToken2': '500000000000000000',
          '0xToken3': '0',
        },
      },
    };

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    // Set up react-redux mocks with simplified implementation
    const { useSelector, useDispatch } = jest.requireMock('react-redux');

    // Simplified dispatch mock that just captures calls
    mockDispatch.mockImplementation(
      (action: { type?: string; payload?: unknown }) => action,
    );

    // Simplified selector mock that returns static values for most tests
    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      const selectorString = selector.toString();
      if (selectorString.includes('selectAllTokenBalances')) {
        return defaultTokenBalances;
      }
      if (selectorString.includes('selectCardPriorityToken')) {
        return null; // Most tests start with no cached token
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return null; // Most tests start with no last fetched time
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

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.priorityToken).toBe(null);
    expect(typeof result.current.fetchPriorityToken).toBe('function');
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

    // Verify that dispatch was called with the correct actions
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Enabled,
        }),
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityTokenLastFetched'),
        payload: expect.any(Date),
      }),
    );

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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Enabled,
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
      chainId: '0xe708',
    } as CardTokenAllowance;

    // Reset all mocks to ensure clean state
    jest.resetAllMocks();

    // Create fresh mock functions for this test
    const testMockFetchAllowances = jest.fn();
    const testMockGetPriorityToken = jest.fn();
    const testMockDispatch = jest.fn();

    // Mock react-redux hooks
    const useReduxMocks = jest.requireMock('react-redux');
    useReduxMocks.useDispatch.mockReturnValue(testMockDispatch);

    // Track selector calls for debugging
    const selectorCalls: string[] = [];

    // Mock useSelector to consistently return cached values
    useReduxMocks.useSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const selectorString = selector.toString();
        selectorCalls.push(selectorString.substring(0, 50) + '...');

        if (selectorString.includes('selectAllTokenBalances')) {
          return {
            [mockAddress.toLowerCase()]: {
              '0x1': {
                '0xCachedToken': '1000000000000000000',
              },
            },
          };
        }
        if (
          selectorString.includes('selectCardPriorityToken') &&
          !selectorString.includes('LastFetched')
        ) {
          return cachedToken;
        }
        if (
          selectorString.includes('selectCardPriorityTokenLastFetched') ||
          selectorString.includes('LastFetched')
        ) {
          return recentTimestamp;
        }
        return null;
      },
    );

    // Mock the SDK with test-specific functions
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

    // Give the hook time to stabilize and run any effects
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // The key assertion: no API calls should have been made
    expect(testMockFetchAllowances).not.toHaveBeenCalled();
    expect(testMockGetPriorityToken).not.toHaveBeenCalled();

    // No new dispatch calls should have been made since cache is valid
    expect(testMockDispatch).not.toHaveBeenCalled();

    // Hook should not be in loading or error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
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
            '0x1': {
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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Enabled,
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
      '1000000000000', // Large allowance for enabled state
    );
    const tokenWithPositiveBalanceSDK = createMockSDKTokenData(
      '0xToken2',
      '500000000000', // Large allowance for enabled state
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

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should have dispatched the token with positive balance, not the suggested one with zero balance
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: '0xToken2',
          symbol: 'TKN2',
          name: 'Token 2',
          allowanceState: AllowanceState.Enabled,
        }),
      }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should return suggested token even with zero balance if no other token has positive balance', async () => {
    // Create SDK format allowances where all tokens have zero balance, using supported tokens
    const tokenWithZeroBalance1SDK = createMockSDKTokenData(
      '0xToken1',
      '1000000000000', // Large allowance for enabled state
    );
    const tokenWithZeroBalance2SDK = createMockSDKTokenData(
      '0xToken2',
      '500000000000', // Large allowance for enabled state
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

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should have dispatched the suggested token even though it has zero balance
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityToken',
        payload: expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Enabled,
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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Enabled,
        }),
      }),
    );
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Enabled,
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
          address: '0xToken2',
          symbol: 'TKN2',
          name: 'Token 2',
          allowanceState: AllowanceState.Enabled,
        }),
      }),
    );
    expect(mockGetPriorityToken).toHaveBeenLastCalledWith(address2, [
      '0xToken2',
    ]);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1); // Only once since we cleared
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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Enabled,
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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.NotEnabled,
          isStaked: false,
          chainId: LINEA_CHAIN_ID,
        }),
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityTokenLastFetched',
        payload: expect.any(Date),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
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
        payload: null,
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityTokenLastFetched',
        payload: expect.any(Date),
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
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.NotEnabled, // Zero allowance = NotEnabled
        }),
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card/setCardPriorityTokenLastFetched',
        payload: expect.any(Date),
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
          address: '0xToken1', // First supported token as fallback
          allowanceState: AllowanceState.NotEnabled,
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });
});
