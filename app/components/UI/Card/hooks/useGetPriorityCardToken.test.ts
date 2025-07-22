import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import { CardToken, CardTokenAllowance, AllowanceState } from '../types';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import { useGetAllowances } from './useGetAllowances';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('./useGetAllowances', () => ({
  useGetAllowances: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      state: {
        tokenBalances: {},
      },
    },
  },
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
    supportedTokens: [
      {
        address: '0xSupportedToken',
        decimals: 18,
        symbol: 'SUPP',
        name: 'Supported Token',
      },
    ],
  };

  const mockAddress = '0x1234567890123456789012345678901234567890';

  const createMockAllowance = (
    address: string,
    allowanceAmount: string,
    symbol = 'TEST',
    name = 'Test Token',
  ): CardTokenAllowance => ({
    allowanceState: AllowanceState.Limited,
    address: address as `0x${string}`,
    isStaked: false,
    decimals: 18,
    name,
    symbol,
    allowance: {
      gt: (other: number) => Number(allowanceAmount) > other,
      toString: () => allowanceAmount,
      isZero: () => allowanceAmount === '0',
    } as unknown as CardTokenAllowance['allowance'],
    chainId: '0x1',
  });

  const mockCardTokenAllowances = [
    createMockAllowance('0xToken1', '1000000', 'TKN1', 'Token 1'),
    createMockAllowance('0xToken2', '500000', 'TKN2', 'Token 2'),
    createMockAllowance('0xToken3', '0', 'TKN3', 'Token 3'),
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
    mockUseSelector.mockReturnValue('0x1');

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    (useGetAllowances as jest.Mock).mockReturnValue({
      fetchAllowances: mockFetchAllowances,
    });

    // Set up react-redux mock
    const useSelector = jest.requireMock('react-redux').useSelector;
    useSelector.mockImplementation(mockUseSelector);
    (strings as jest.Mock).mockReturnValue('Error occurred');

    // Mock trace utilities
    const { trace, endTrace } = jest.requireMock('../../../../util/trace');
    trace.mockImplementation(mockTrace);
    endTrace.mockImplementation(mockEndTrace);

    // Mock Engine TokenBalancesController with proper types
    (Engine.context.TokenBalancesController.state.tokenBalances as Record<
      string,
      Record<string, Record<string, string>>
    >) = {
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xToken1': '1000000000000000000',
          '0xToken2': '500000000000000000',
          '0xToken3': '0',
        },
      },
    };
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
    mockFetchAllowances.mockResolvedValue(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.priorityToken).toEqual(mockCardTokenAllowances[0]);
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
    mockFetchAllowances.mockResolvedValue(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValue(null);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual(mockCardTokenAllowances[0]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch priority token');
    mockFetchAllowances.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(true);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      mockError,
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
    const { result } = renderHook(() => useGetPriorityCardToken(undefined));

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
      chainId: '0x1',
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should handle multiple consecutive fetch calls', async () => {
    // Test multiple fetch calls with valid address - each should make fresh API calls
    const expectedToken1 = createMockAllowance(
      '0xToken1',
      '1000000',
      'TKN1',
      'Token 1',
    );

    mockFetchAllowances.mockResolvedValueOnce([expectedToken1]);
    mockGetPriorityToken.mockResolvedValueOnce({
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
    });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for automatic fetch from useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual(expectedToken1);

    // Set up second fetch with different data
    const expectedToken2 = createMockAllowance(
      '0xToken2',
      '500000',
      'TKN2',
      'Token 2',
    );

    mockFetchAllowances.mockResolvedValueOnce([expectedToken2]);
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
    expect(priorityToken2).toEqual(expectedToken2);

    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2); // Called for both fetches
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should make fresh API calls on each fetchPriorityToken invocation', async () => {
    // The fetchPriorityToken function doesn't cache - it always makes fresh API calls
    mockFetchAllowances.mockResolvedValue(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the automatic fetch from useEffect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual(mockCardTokenAllowances[0]);
    expect(mockFetchAllowances).toHaveBeenCalledTimes(1);

    // Reset the call count to track subsequent calls
    mockFetchAllowances.mockClear();
    mockGetPriorityToken.mockClear();

    // Manual fetch should make fresh API calls
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken();
    });

    expect(priorityToken2).toEqual(mockCardTokenAllowances[0]);
    expect(mockFetchAllowances).toHaveBeenCalledTimes(1); // Fresh API call made
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1); // Fresh API call made
    expect(result.current.priorityToken).toEqual(mockCardTokenAllowances[0]);
  });

  it('should fallback to token with positive balance when suggested token has zero balance', async () => {
    // Create allowances where suggested token has zero balance
    const tokenWithZeroBalance = createMockAllowance(
      '0xZeroBalance',
      '1000000',
      'ZERO',
      'Zero Balance Token',
    );
    const tokenWithPositiveBalance = createMockAllowance(
      '0xToken2',
      '500000',
      'TKN2',
      'Token 2',
    );
    const allowancesWithZeroBalance = [
      tokenWithZeroBalance,
      tokenWithPositiveBalance,
    ];

    const suggestedTokenWithZeroBalance = {
      address: '0xZeroBalance',
      symbol: 'ZERO',
      name: 'Zero Balance Token',
      decimals: 18,
    };

    // Mock balances where suggested token has zero balance
    (Engine.context.TokenBalancesController.state.tokenBalances as Record<
      string,
      Record<string, Record<string, string>>
    >) = {
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xZeroBalance': '0', // Zero balance
          '0xToken2': '500000000000000000', // Positive balance
        },
      },
    };

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Should return the token with positive balance, not the suggested one with zero balance
    expect(result.current.priorityToken).toEqual(tokenWithPositiveBalance);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should return suggested token even with zero balance if no other token has positive balance', async () => {
    // Create allowances where all tokens have zero balance
    const tokenWithZeroBalance1 = createMockAllowance(
      '0xZeroBalance1',
      '1000000',
      'ZERO1',
      'Zero Balance Token 1',
    );
    const tokenWithZeroBalance2 = createMockAllowance(
      '0xZeroBalance2',
      '500000',
      'ZERO2',
      'Zero Balance Token 2',
    );
    const allowancesWithZeroBalance = [
      tokenWithZeroBalance1,
      tokenWithZeroBalance2,
    ];

    const suggestedTokenWithZeroBalance = {
      address: '0xZeroBalance1',
      symbol: 'ZERO1',
      name: 'Zero Balance Token 1',
      decimals: 18,
    };

    // Mock balances where all tokens have zero balance
    (Engine.context.TokenBalancesController.state.tokenBalances as Record<
      string,
      Record<string, Record<string, string>>
    >) = {
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xZeroBalance1': '0',
          '0xZeroBalance2': '0',
        },
      },
    };

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Should return the suggested token even though it has zero balance
    expect(result.current.priorityToken).toEqual(tokenWithZeroBalance1);
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

    mockFetchAllowances.mockResolvedValue(mockCardTokenAllowances);
    mockGetPriorityToken.mockReturnValue(mockPromise);

    // Now provide an address which will trigger useEffect and start loading
    await act(async () => {
      rerender({ address: mockAddress });
    });

    // Loading should now be true as the fetch is in progress
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise which should set loading back to false
    await act(async () => {
      resolvePromise?.(mockCardToken);
      await new Promise((resolve) => setTimeout(resolve, 0)); // Let the promise resolve
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should refetch when SDK becomes available', async () => {
    mockFetchAllowances.mockResolvedValue(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const { result, rerender } = renderHook(() =>
      useGetPriorityCardToken(mockAddress),
    );

    // Wait for initial mount with no SDK
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toBeNull();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();

    // Enable SDK and trigger rerender
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    await act(async () => {
      rerender();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual(mockCardTokenAllowances[0]);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should handle address change and refetch', async () => {
    const address1 = '0x1111111111111111111111111111111111111111';
    const address2 = '0x2222222222222222222222222222222222222222';
    const mockAllowance1 = createMockAllowance(
      '0xToken1',
      '1000000',
      'TKN1',
      'Token 1',
    );
    const mockAllowance2 = createMockAllowance(
      '0xToken2',
      '500000',
      'TKN2',
      'Token 2',
    );
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
    (Engine.context.TokenBalancesController.state.tokenBalances as Record<
      string,
      Record<string, Record<string, string>>
    >) = {
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

    // Use mockResolvedValue instead of mockResolvedValueOnce for multiple calls
    mockFetchAllowances.mockResolvedValue([mockAllowance1]);
    mockGetPriorityToken.mockResolvedValue(mockToken1);

    const { result, rerender } = renderHook(
      ({ address }) => useGetPriorityCardToken(address),
      {
        initialProps: { address: address1 },
      },
    );

    // Wait for the useEffect to trigger the fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual(mockAllowance1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(address1, ['0xToken1']);

    // Reset mocks for second address
    mockFetchAllowances.mockClear();
    mockGetPriorityToken.mockClear();
    mockFetchAllowances.mockResolvedValue([mockAllowance2]);
    mockGetPriorityToken.mockResolvedValue(mockToken2);

    // Change address and verify refetch
    await act(async () => {
      rerender({ address: address2 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual(mockAllowance2);
    expect(mockGetPriorityToken).toHaveBeenLastCalledWith(address2, [
      '0xToken2',
    ]);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1); // Only once since we cleared
  });

  it('should automatically fetch priority token on mount when address is provided', async () => {
    mockFetchAllowances.mockResolvedValue(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Wait for the useEffect to trigger the fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toEqual(mockCardTokenAllowances[0]);
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
    const mockAllowance1 = createMockAllowance(
      '0xToken1',
      '1000000',
      'TKN1',
      'Token 1',
    );
    const mockAllowance2 = createMockAllowance(
      '0xToken2',
      '500000',
      'TKN2',
      'Token 2',
    );

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    mockFetchAllowances.mockResolvedValueOnce([mockAllowance1]);
    mockFetchAllowances.mockResolvedValueOnce([mockAllowance2]);
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

    expect(priorityToken1).toEqual(mockAllowance1);
    expect(priorityToken2).toEqual(mockAllowance2);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
  });
});
