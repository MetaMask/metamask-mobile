import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import { CardToken, CardTokenAllowance, AllowanceState } from '../types';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';

// Mock the useCardSDK hook
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

// Mock console.error to suppress error logs in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('useGetPriorityCardToken', () => {
  const mockGetPriorityToken = jest.fn();
  const mockSDK = {
    getPriorityToken: mockGetPriorityToken,
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
    mockConsoleError.mockClear();
    mockGetPriorityToken.mockReset();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should initialize with correct default state', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.fetchPriorityToken).toBe('function');
  });

  it('should fetch priority token successfully', async () => {
    mockGetPriorityToken.mockResolvedValueOnce(mockCardToken);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    expect(result.current.isLoading).toBe(false);

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockCardTokenAllowances,
      );
    });

    expect(priorityToken).toEqual(mockCardTokenAllowances[0]);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(
      mockAddress,
      ['0xToken1', '0xToken2'], // Only non-zero allowances
    );
  });

  it('should handle null response from API', async () => {
    mockGetPriorityToken.mockResolvedValueOnce(null);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockCardTokenAllowances,
      );
    });

    expect(priorityToken).toEqual(mockCardTokenAllowances[0]); // Fallback to first allowance
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch priority token');
    mockGetPriorityToken.mockRejectedValueOnce(mockError);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockCardTokenAllowances,
      );
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error fetching priority token:',
      mockError,
    );
  });

  it('should not fetch when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockCardTokenAllowances,
      );
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should not fetch when address is not provided', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(undefined));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockCardTokenAllowances,
      );
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should handle empty allowances array', async () => {
    mockGetPriorityToken.mockResolvedValueOnce(null);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken([]);
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(mockAddress, []);
  });

  it('should handle multiple consecutive fetch calls', async () => {
    const mockAllowanceSets = [
      [createMockAllowance('0xToken1', '1000000', 'TKN1', 'Token 1')],
      [createMockAllowance('0xToken2', '500000', 'TKN2', 'Token 2')],
      [createMockAllowance('0xToken3', '0', 'TKN3', 'Token 3')],
    ];

    const mockTokens = [
      { address: '0xToken1', symbol: 'TKN1', name: 'Token 1', decimals: 18 },
      { address: '0xToken2', symbol: 'TKN2', name: 'Token 2', decimals: 18 },
      null,
    ];

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // First fetch
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[0]);
    let priorityToken1: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken(
        mockAllowanceSets[0],
      );
    });
    expect(priorityToken1).toEqual(mockAllowanceSets[0][0]);

    // Second fetch
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[1]);
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken(
        mockAllowanceSets[1],
      );
    });
    expect(priorityToken2).toEqual(mockAllowanceSets[1][0]);

    // Third fetch (null response, should return first allowance)
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[2]);
    let priorityToken3: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken3 = await result.current.fetchPriorityToken(
        mockAllowanceSets[2],
      );
    });
    expect(priorityToken3).toEqual(mockAllowanceSets[2][0]);

    expect(mockGetPriorityToken).toHaveBeenCalledTimes(3);
    expect(result.current.isLoading).toBe(false);
  });

  it('should maintain loading state correctly during fetch', async () => {
    let resolvePromise: (value: CardToken) => void;
    const mockPromise = new Promise<CardToken>((resolve) => {
      resolvePromise = resolve;
    });

    mockGetPriorityToken.mockReturnValueOnce(mockPromise);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    expect(result.current.isLoading).toBe(false);

    // Start the fetch
    act(() => {
      result.current.fetchPriorityToken(mockCardTokenAllowances);
    });

    // Check loading state is true during fetch
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise?.(mockCardToken);
    });

    // Check loading state is false after fetch
    expect(result.current.isLoading).toBe(false);
  });

  it('should refetch when SDK becomes available', async () => {
    mockGetPriorityToken.mockResolvedValueOnce(mockCardToken);

    // Start with no SDK
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const { result, rerender } = renderHook(() =>
      useGetPriorityCardToken(mockAddress),
    );

    // Try to fetch with no SDK
    let priorityToken1: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken(
        mockCardTokenAllowances,
      );
    });

    expect(priorityToken1).toBeNull();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();

    // SDK becomes available
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    rerender();

    // Now fetch should work
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken(
        mockCardTokenAllowances,
      );
    });

    expect(priorityToken2).toEqual(mockCardTokenAllowances[0]);
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

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result, rerender } = renderHook(
      ({ address }) => useGetPriorityCardToken(address),
      {
        initialProps: { address: address1 },
      },
    );

    // First fetch with address1
    mockGetPriorityToken.mockResolvedValueOnce(mockToken1);
    let priorityToken1: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken([
        mockAllowance1,
      ]);
    });

    expect(priorityToken1).toEqual(mockAllowance1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(address1, ['0xToken1']);

    // Change address
    rerender({ address: address2 });

    // Fetch with address2
    mockGetPriorityToken.mockResolvedValueOnce(mockToken2);
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken([
        mockAllowance2,
      ]);
    });

    expect(priorityToken2).toEqual(mockAllowance2);
    expect(mockGetPriorityToken).toHaveBeenLastCalledWith(address2, [
      '0xToken2',
    ]);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2);
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

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Start two concurrent fetches
    mockGetPriorityToken.mockReturnValueOnce(mockPromise1);
    mockGetPriorityToken.mockReturnValueOnce(mockPromise2);

    let priorityToken1: CardTokenAllowance | null | undefined;
    let priorityToken2: CardTokenAllowance | null | undefined;

    const fetch1Promise = act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken([
        mockAllowance1,
      ]);
    });

    const fetch2Promise = act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken([
        mockAllowance2,
      ]);
    });

    // Resolve both promises
    await act(async () => {
      resolvePromise1?.(mockToken1);
      resolvePromise2?.(mockToken2);
    });

    await Promise.all([fetch1Promise, fetch2Promise]);

    expect(priorityToken1).toEqual(mockAllowance1);
    expect(priorityToken2).toEqual(mockAllowance2);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
  });
});
