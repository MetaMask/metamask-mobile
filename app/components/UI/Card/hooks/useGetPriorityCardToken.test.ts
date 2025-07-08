import { renderHook, act } from '@testing-library/react-hooks';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import { useCardSDK } from '../sdk';
import { CardToken } from '../types';
import Logger from '../../../../util/Logger';

// Mock the useCardSDK hook
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

// Mock console.error to suppress error logs in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('useGetPriorityCardToken', () => {
  const mockGetPriorityToken = jest.fn();
  const mockSDK = {
    getPriorityToken: mockGetPriorityToken,
  };

  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockNonZeroBalanceTokens = ['0xToken1', '0xToken2', '0xToken3'];

  const mockCardToken: CardToken = {
    address: '0xToken1',
    decimals: 18,
    symbol: 'TEST',
    name: 'Test Token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
    mockGetPriorityToken.mockReset();
    (Logger.log as jest.Mock).mockClear();
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

    let priorityToken: CardToken | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken).toEqual(mockCardToken);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(
      mockAddress,
      mockNonZeroBalanceTokens,
    );
    expect(Logger.log).toHaveBeenCalledWith(
      `Fetching retrievedPriorityToken for address: ${mockAddress}`,
    );
    expect(Logger.log).toHaveBeenCalledWith(
      'retrievedPriorityToken',
      mockCardToken,
    );
  });

  it('should handle null response from API', async () => {
    mockGetPriorityToken.mockResolvedValueOnce(null);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardToken | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith('retrievedPriorityToken', null);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch priority token');
    mockGetPriorityToken.mockRejectedValueOnce(mockError);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardToken | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error fetching priority token:',
      mockError,
    );
    expect(Logger.log).toHaveBeenCalledWith(
      `Fetching retrievedPriorityToken for address: ${mockAddress}`,
    );
  });

  it('should not fetch when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardToken | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('should not fetch when address is not provided', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(undefined));

    let priorityToken: CardToken | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('should handle empty nonZeroBalanceTokens array', async () => {
    mockGetPriorityToken.mockResolvedValueOnce(null);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardToken | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken([]);
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(mockAddress, []);
  });

  it('should handle multiple consecutive fetch calls', async () => {
    const mockTokens = [
      { ...mockCardToken, address: '0xToken1', symbol: 'TEST1' },
      { ...mockCardToken, address: '0xToken2', symbol: 'TEST2' },
      null,
    ];

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // First fetch
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[0]);
    let priorityToken1: CardToken | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken(['0xToken1']);
    });
    expect(priorityToken1).toEqual(mockTokens[0]);

    // Second fetch
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[1]);
    let priorityToken2: CardToken | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken(['0xToken2']);
    });
    expect(priorityToken2).toEqual(mockTokens[1]);

    // Third fetch
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[2]);
    let priorityToken3: CardToken | null | undefined;
    await act(async () => {
      priorityToken3 = await result.current.fetchPriorityToken(['0xToken3']);
    });
    expect(priorityToken3).toBeNull();

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
      result.current.fetchPriorityToken(mockNonZeroBalanceTokens);
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
    let priorityToken1: CardToken | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken1).toBeUndefined();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();

    // SDK becomes available
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    rerender();

    // Now fetch should work
    let priorityToken2: CardToken | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken2).toEqual(mockCardToken);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should handle address change and refetch', async () => {
    const address1 = '0x1111111111111111111111111111111111111111';
    const address2 = '0x2222222222222222222222222222222222222222';
    const mockToken1 = { ...mockCardToken, address: '0xToken1' };
    const mockToken2 = { ...mockCardToken, address: '0xToken2' };

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result, rerender } = renderHook(
      ({ address }) => useGetPriorityCardToken(address),
      {
        initialProps: { address: address1 },
      },
    );

    // First fetch with address1
    mockGetPriorityToken.mockResolvedValueOnce(mockToken1);
    let priorityToken1: CardToken | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken1).toEqual(mockToken1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(
      address1,
      mockNonZeroBalanceTokens,
    );

    // Change address
    rerender({ address: address2 });

    // Fetch with address2
    mockGetPriorityToken.mockResolvedValueOnce(mockToken2);
    let priorityToken2: CardToken | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken(
        mockNonZeroBalanceTokens,
      );
    });

    expect(priorityToken2).toEqual(mockToken2);
    expect(mockGetPriorityToken).toHaveBeenLastCalledWith(
      address2,
      mockNonZeroBalanceTokens,
    );
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

    const mockToken1 = { ...mockCardToken, symbol: 'TEST1' };
    const mockToken2 = { ...mockCardToken, symbol: 'TEST2' };

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    // Start two concurrent fetches
    mockGetPriorityToken.mockReturnValueOnce(mockPromise1);
    mockGetPriorityToken.mockReturnValueOnce(mockPromise2);

    let priorityToken1: CardToken | null | undefined;
    let priorityToken2: CardToken | null | undefined;

    const fetch1Promise = act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken(['0xToken1']);
    });

    const fetch2Promise = act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken(['0xToken2']);
    });

    // Resolve both promises
    await act(async () => {
      resolvePromise1?.(mockToken1);
      resolvePromise2?.(mockToken2);
    });

    await Promise.all([fetch1Promise, fetch2Promise]);

    expect(priorityToken1).toEqual(mockToken1);
    expect(priorityToken2).toEqual(mockToken2);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
  });
});
