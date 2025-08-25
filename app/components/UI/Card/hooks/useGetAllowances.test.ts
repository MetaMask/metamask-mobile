import { renderHook, act } from '@testing-library/react-hooks';
import { useGetAllowances } from './useGetAllowances';
import { useCardSDK } from '../sdk';
import { AllowanceState } from '../types';
import { ARBITRARY_ALLOWANCE } from '../constants';
import { useSelector } from 'react-redux';

// Mock the useCardSDK hook
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock console.error to suppress error logs in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('useGetAllowances', () => {
  const mockGetSupportedTokensAllowances = jest.fn();
  const mockSupportedTokens = [
    {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
    },
    {
      address: '0xToken2',
      symbol: 'TKN2',
      name: 'Token 2',
      decimals: 6,
    },
    {
      address: '0xToken3',
      symbol: 'TKN3',
      name: 'Token 3',
      decimals: 18,
    },
    {
      address: '0xToken4',
      symbol: 'TKN4',
      name: 'Token 4',
      decimals: 8,
    },
    {
      address: '0xToken5',
      symbol: 'TKN5',
      name: 'Token 5',
      decimals: 18,
    },
    {
      address: '0xToken6',
      symbol: 'TKN6',
      name: 'Token 6',
      decimals: 18,
    },
  ];
  const mockSDK = {
    getSupportedTokensAllowances: mockGetSupportedTokensAllowances,
    supportedTokens: mockSupportedTokens,
  };

  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockChainId = '0x1'; // Ethereum mainnet

  const createMockToken = (
    address: string,
    usAllowance: string,
    globalAllowance: string,
  ) => ({
    address: address as `0x${string}`,
    usAllowance: {
      isZero: () => usAllowance === '0',
      lt: (other: number) => Number(usAllowance) < other,
      toString: () => usAllowance,
    },
    globalAllowance: {
      isZero: () => globalAllowance === '0',
      lt: (other: number) => Number(globalAllowance) < other,
      toString: () => globalAllowance,
    },
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
    mockGetSupportedTokensAllowances.mockReset();

    // Set up default useSelector mock to return chainId
    (useSelector as jest.Mock).mockImplementation(() => mockChainId);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should initialize with null allowances and correct loading state', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.fetchAllowances).toBe('function');
  });

  it('should initialize with loading state when autoFetch is true', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress, true));

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(typeof result.current.fetchAllowances).toBe('function');
  });

  it('should fetch allowances successfully when autoFetch is true', async () => {
    const mockTokens = [
      createMockToken('0xToken1', '0', '1000000000000'),
      createMockToken('0xToken2', '500000', '0'),
      createMockToken('0xToken3', '0', '0'),
    ];

    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetAllowances(mockAddress, true),
    );

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.allowances).toHaveLength(3);

    const allowances = result.current.allowances;
    expect(allowances).not.toBeNull();

    // Check first token (uses globalAllowance since usAllowance is zero)
    expect(allowances?.[0]).toEqual({
      allowanceState: AllowanceState.Unlimited,
      address: '0xToken1',
      tag: AllowanceState.Unlimited,
      isStaked: false,
      decimals: 18,
      name: 'Token 1',
      symbol: 'TKN1',
      allowance: mockTokens[0].globalAllowance,
      chainId: mockChainId,
    });

    // Check second token (uses usAllowance since it's non-zero)
    expect(allowances?.[1]).toEqual({
      allowanceState: AllowanceState.Limited,
      address: '0xToken2',
      tag: AllowanceState.Limited,
      isStaked: false,
      decimals: 6,
      name: 'Token 2',
      symbol: 'TKN2',
      allowance: mockTokens[1].usAllowance,
      chainId: mockChainId,
    });

    // Check third token (uses globalAllowance since usAllowance is zero)
    expect(allowances?.[2]).toEqual({
      allowanceState: AllowanceState.NotActivated,
      address: '0xToken3',
      tag: AllowanceState.NotActivated,
      isStaked: false,
      decimals: 18,
      name: 'Token 3',
      symbol: 'TKN3',
      allowance: mockTokens[2].globalAllowance,
      chainId: mockChainId,
    });

    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledWith(mockAddress);
  });

  it('should not fetch allowances automatically when autoFetch is false', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress, false));

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();
  });

  it('should not fetch allowances automatically when autoFetch is undefined', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();
  });

  it('should fetch allowances manually when fetchAllowances is called', async () => {
    const mockTokens = [createMockToken('0xToken1', '1000000', '0')];

    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.fetchAllowances();
    });

    expect(result.current.allowances).toHaveLength(1);
    const allowances = result.current.allowances;
    expect(allowances).not.toBeNull();
    expect(allowances?.[0]).toEqual({
      allowanceState: AllowanceState.Limited,
      address: '0xToken1',
      tag: AllowanceState.Limited,
      isStaked: false,
      decimals: 18,
      name: 'Token 1',
      symbol: 'TKN1',
      allowance: mockTokens[0].usAllowance,
      chainId: mockChainId,
    });
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch allowances');
    mockGetSupportedTokensAllowances.mockRejectedValueOnce(mockError);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.fetchAllowances();
    });

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error fetching allowances:',
      mockError,
    );
  });

  it('should not fetch allowances when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    await act(async () => {
      await result.current.fetchAllowances();
    });

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();
  });

  it('should not fetch allowances when address is not provided', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(undefined));

    await act(async () => {
      await result.current.fetchAllowances();
    });

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();
  });

  it('should correctly classify allowance states', async () => {
    const mockTokens = [
      // NotActivated: both allowances are zero
      createMockToken('0xToken1', '0', '0'),
      // Limited: US allowance is non-zero and less than ARBITRARY_ALLOWANCE
      createMockToken('0xToken2', '50000', '0'),
      // Unlimited: global allowance is greater than or equal to ARBITRARY_ALLOWANCE
      createMockToken('0xToken3', '0', ARBITRARY_ALLOWANCE.toString()),
      // Unlimited: global allowance is much greater than ARBITRARY_ALLOWANCE
      createMockToken('0xToken4', '0', (ARBITRARY_ALLOWANCE * 2).toString()),
      // Limited: US allowance takes precedence and is limited
      createMockToken('0xToken5', '50000', ARBITRARY_ALLOWANCE.toString()),
      // Unlimited: US allowance takes precedence and is unlimited
      createMockToken('0xToken6', ARBITRARY_ALLOWANCE.toString(), '0'),
    ];

    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    await act(async () => {
      await result.current.fetchAllowances();
    });

    const allowances = result.current.allowances;
    expect(allowances).not.toBeNull();
    expect(allowances).toHaveLength(6);

    expect(allowances?.[0].allowanceState).toBe(AllowanceState.NotActivated);
    expect(allowances?.[1].allowanceState).toBe(AllowanceState.Limited);
    expect(allowances?.[2].allowanceState).toBe(AllowanceState.Unlimited);
    expect(allowances?.[3].allowanceState).toBe(AllowanceState.Unlimited);
    expect(allowances?.[4].allowanceState).toBe(AllowanceState.Limited);
    expect(allowances?.[5].allowanceState).toBe(AllowanceState.Unlimited);
  });

  it('should refetch allowances when SDK becomes available', async () => {
    const mockTokens = [createMockToken('0xToken1', '1000000', '0')];

    // Start with no SDK
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const { result, rerender } = renderHook(() =>
      useGetAllowances(mockAddress, false),
    );

    expect(result.current.allowances).toBeNull();
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();

    // SDK becomes available - set up mock for successful call
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    rerender();

    await act(async () => {
      await result.current.fetchAllowances();
    });

    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].address).toBe('0xToken1');
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple consecutive fetch calls', async () => {
    const mockTokensSets = [
      [createMockToken('0xToken1', '1000000', '0')],
      [createMockToken('0xToken2', '0', '0')],
      [createMockToken('0xToken3', '0', ARBITRARY_ALLOWANCE.toString())],
    ];

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    // First fetch
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensSets[0]);
    await act(async () => {
      await result.current.fetchAllowances();
    });
    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].allowanceState).toBe(
      AllowanceState.Limited,
    );

    // Second fetch
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensSets[1]);
    await act(async () => {
      await result.current.fetchAllowances();
    });
    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].allowanceState).toBe(
      AllowanceState.NotActivated,
    );

    // Third fetch
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensSets[2]);
    await act(async () => {
      await result.current.fetchAllowances();
    });
    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].allowanceState).toBe(
      AllowanceState.Unlimited,
    );

    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(3);
  });

  it('should handle empty response from API', async () => {
    mockGetSupportedTokensAllowances.mockResolvedValueOnce([]);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    await act(async () => {
      await result.current.fetchAllowances();
    });

    expect(result.current.allowances).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
  });

  it('should update allowances when autoFetch is changed from false to true', async () => {
    const mockTokens = [createMockToken('0xToken1', '1000000', '0')];

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ autoFetch }) => useGetAllowances(mockAddress, autoFetch),
      {
        initialProps: { autoFetch: false },
      },
    );

    expect(result.current.allowances).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();

    // Change autoFetch to true
    rerender({ autoFetch: true });

    await waitForNextUpdate();

    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].allowanceState).toBe(
      AllowanceState.Limited,
    );
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
  });

  it('should handle address change and refetch when autoFetch is enabled', async () => {
    const mockTokensAddress1 = [createMockToken('0xToken1', '1000000', '0')];
    const mockTokensAddress2 = [
      createMockToken('0xToken2', '0', ARBITRARY_ALLOWANCE.toString()),
    ];

    const address1 = '0x1111111111111111111111111111111111111111';
    const address2 = '0x2222222222222222222222222222222222222222';

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    // Set up mock for first address before rendering
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensAddress1);

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ address }) => useGetAllowances(address, true),
      {
        initialProps: { address: address1 },
      },
    );

    // Wait for first address fetch
    await waitForNextUpdate();

    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].address).toBe('0xToken1');
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledWith(address1);

    // Set up mock for second address and rerender
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensAddress2);
    rerender({ address: address2 });

    await waitForNextUpdate();

    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].address).toBe('0xToken2');
    expect(mockGetSupportedTokensAllowances).toHaveBeenLastCalledWith(address2);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(2);
  });

  it('should filter out tokens not found in supportedTokens', async () => {
    const mockTokens = [
      createMockToken('0xToken1', '1000000', '0'), // This exists in supportedTokens
      createMockToken('0xUnknownToken', '1000000', '0'), // This doesn't exist in supportedTokens
    ];

    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    await act(async () => {
      await result.current.fetchAllowances();
    });

    // Should only have the token that exists in supportedTokens
    expect(result.current.allowances).toHaveLength(1);
    expect(result.current.allowances?.[0].address).toBe('0xToken1');
    expect(result.current.allowances?.[0].symbol).toBe('TKN1');
  });
});
