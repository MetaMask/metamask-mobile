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
  const mockUseSelector = jest.fn();
  const mockTrace = jest.fn();
  const mockEndTrace = jest.fn();
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
    mockTrace.mockReset();
    mockEndTrace.mockReset();
    mockUseSelector.mockReturnValue({
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xToken1': '1000000000000000000',
          '0xToken2': '500000000000000000',
          '0xToken3': '0',
        },
      },
    });

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    // Set up react-redux mock
    const useSelector = jest.requireMock('react-redux').useSelector;
    useSelector.mockImplementation(mockUseSelector);
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
    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
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

    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
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

  it('should handle empty allowances array', async () => {
    mockFetchAllowances.mockResolvedValue([]);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual({
      ...mockSDK.supportedTokens[0],
      allowanceState: AllowanceState.NotEnabled,
      isStaked: false,
      chainId: LINEA_CHAIN_ID,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
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

    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
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

    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
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
    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
      }),
    );
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
    mockUseSelector.mockReturnValue({
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xZeroBalance': '0', // Zero balance (exact case match with suggested token)
          '0xToken2': '500000000000000000', // Positive balance (exact case match with allowance)
        },
      },
    });

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should return the token with positive balance, not the suggested one with zero balance
    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken2',
        symbol: 'TKN2',
        name: 'Token 2',
        allowanceState: AllowanceState.Enabled,
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
    mockUseSelector.mockReturnValue({
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xToken1': '0',
          '0xToken2': '0',
        },
      },
    });

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should return the suggested token even though it has zero balance
    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
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

    const { result: result2 } = renderHook(() =>
      useGetPriorityCardToken(mockAddress),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result2.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
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
    mockUseSelector.mockReturnValue({
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
    });

    // Use mockResolvedValue instead of mockResolvedValueOnce for multiple calls
    mockFetchAllowances.mockResolvedValue([mockSDKAllowance1]);
    mockGetPriorityToken.mockResolvedValue(mockToken1);

    const { result, rerender } = renderHook(
      ({ address }) => useGetPriorityCardToken(address),
      {
        initialProps: { address: address1 },
      },
    );

    // Wait for the useEffect to trigger the fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
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

    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken2',
        symbol: 'TKN2',
        name: 'Token 2',
        allowanceState: AllowanceState.Enabled,
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

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the useEffect to trigger the fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
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
});
