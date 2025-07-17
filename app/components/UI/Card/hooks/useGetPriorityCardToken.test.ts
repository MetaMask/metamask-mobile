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

describe('useGetPriorityCardToken', () => {
  const mockGetPriorityToken = jest.fn();
  const mockFetchAllowances = jest.fn();
  const mockUseSelector = jest.fn();
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
    mockUseSelector.mockReturnValue('0x1');

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    (useGetAllowances as jest.Mock).mockReturnValue({
      fetchAllowances: mockFetchAllowances,
    });

    // Set up react-redux mock
    const useSelector = jest.requireMock('react-redux').useSelector;
    useSelector.mockImplementation(mockUseSelector);
    (strings as jest.Mock).mockReturnValue('Error occurred');

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

  it('should initialize with correct default state', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.fetchPriorityToken).toBe('function');
  });

  it('should fetch priority token successfully', async () => {
    mockFetchAllowances.mockResolvedValueOnce(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValueOnce(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    expect(result.current.isLoading).toBe(false);

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken();
    });

    expect(priorityToken).toEqual(mockCardTokenAllowances[0]);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(mockAddress, [
      '0xToken1',
      '0xToken2',
    ]);
  });

  it('should handle null response from API', async () => {
    mockFetchAllowances.mockResolvedValueOnce(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken();
    });

    expect(priorityToken).toEqual(mockCardTokenAllowances[0]);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch priority token');
    mockFetchAllowances.mockResolvedValueOnce(mockCardTokenAllowances);
    mockGetPriorityToken.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken();
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Error occurred');
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      mockError,
      'useGetPriorityCardToken::error fetching priority token',
    );
  });

  it('should not fetch when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken();
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should not fetch when address is not provided', async () => {
    const { result } = renderHook(() => useGetPriorityCardToken(undefined));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken();
    });

    expect(priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should handle empty allowances array', async () => {
    mockFetchAllowances.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    let priorityToken: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken = await result.current.fetchPriorityToken();
    });

    expect(priorityToken).toEqual({
      ...mockSDK.supportedTokens[0],
      allowanceState: AllowanceState.NotEnabled,
      isStaked: false,
      chainId: '0x1',
    });
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
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

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    mockFetchAllowances.mockResolvedValueOnce(mockAllowanceSets[0]);
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[0]);
    let priorityToken1: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken();
    });
    expect(priorityToken1).toEqual(mockAllowanceSets[0][0]);

    mockFetchAllowances.mockResolvedValueOnce(mockAllowanceSets[1]);
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[1]);
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken();
    });
    expect(priorityToken2).toEqual(mockAllowanceSets[1][0]);

    mockFetchAllowances.mockResolvedValueOnce(mockAllowanceSets[2]);
    mockGetPriorityToken.mockResolvedValueOnce(mockTokens[2]);
    let priorityToken3: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken3 = await result.current.fetchPriorityToken();
    });
    expect(priorityToken3).toEqual(mockAllowanceSets[2][0]);

    expect(mockGetPriorityToken).toHaveBeenCalledTimes(2); // Only called for non-zero allowances
    expect(result.current.isLoading).toBe(false);
  });

  it('should maintain loading state correctly during fetch', async () => {
    let resolvePromise: (value: CardToken) => void;
    const mockPromise = new Promise<CardToken>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchAllowances.mockResolvedValueOnce(mockCardTokenAllowances);
    mockGetPriorityToken.mockReturnValueOnce(mockPromise);

    const { result } = renderHook(() => useGetPriorityCardToken(mockAddress));

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      result.current.fetchPriorityToken();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise?.(mockCardToken);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should refetch when SDK becomes available', async () => {
    mockFetchAllowances.mockResolvedValueOnce(mockCardTokenAllowances);
    mockGetPriorityToken.mockResolvedValueOnce(mockCardToken);

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const { result, rerender } = renderHook(() =>
      useGetPriorityCardToken(mockAddress),
    );

    let priorityToken1: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken();
    });

    expect(priorityToken1).toBeNull();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    rerender();

    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken();
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

    const { result, rerender } = renderHook(
      ({ address }) => useGetPriorityCardToken(address),
      {
        initialProps: { address: address1 },
      },
    );

    mockFetchAllowances.mockResolvedValueOnce([mockAllowance1]);
    mockGetPriorityToken.mockResolvedValueOnce(mockToken1);
    let priorityToken1: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken1 = await result.current.fetchPriorityToken();
    });

    expect(priorityToken1).toEqual(mockAllowance1);
    expect(mockGetPriorityToken).toHaveBeenCalledWith(address1, ['0xToken1']);

    rerender({ address: address2 });

    mockFetchAllowances.mockResolvedValueOnce([mockAllowance2]);
    mockGetPriorityToken.mockResolvedValueOnce(mockToken2);
    let priorityToken2: CardTokenAllowance | null | undefined;
    await act(async () => {
      priorityToken2 = await result.current.fetchPriorityToken();
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
