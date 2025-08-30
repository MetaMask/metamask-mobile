import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import { CardToken, CardTokenAllowance, AllowanceState } from '../types';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';

const mockSelectAllTokenBalances =
  selectAllTokenBalances as jest.MockedFunction<typeof selectAllTokenBalances>;
const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

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
    ],
  };

  const mockAddress = '0x1234567890123456789012345678901234567890';

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
    createMockSDKTokenData('0xToken1', '1000000000000'),
    createMockSDKTokenData('0xToken2', '500000000000'),
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

    mockPriorityToken = null;
    mockLastFetched = null;

    const mockTokenBalances = {
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xToken1': '1000000000000000000',
          '0xToken2': '500000000000000000',
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSelectAllTokenBalances.mockReturnValue(mockTokenBalances as any);

    const mockAccountSelector = (scope: string) => {
      if (scope === 'eip155:0') {
        return {
          address: mockAddress,
          id: 'test-account-id',
          type: 'eip155:eoa' as const,
          options: {},
          metadata: {},
          methods: [],
          scopes: [],
        };
      }
      return undefined;
    };
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAccountSelector as any,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectAllTokenBalances) {
        return mockTokenBalances;
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return mockAccountSelector;
      }
      const selectorString = selector.toString();
      if (
        selectorString.includes('selectCardPriorityToken') &&
        !selectorString.includes('LastFetched')
      ) {
        return mockPriorityToken;
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched;
      }
      return null;
    });

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { useDispatch } = jest.requireMock('react-redux');

    mockDispatch.mockImplementation(
      (action: { type?: string; payload?: unknown }) => action,
    );

    useDispatch.mockReturnValue(mockDispatch);

    (strings as jest.Mock).mockReturnValue('Error occurred');

    const { trace, endTrace } = jest.requireMock('../../../../util/trace');
    trace.mockImplementation(mockTrace);
    endTrace.mockImplementation(mockEndTrace);
  });

  it('should initialize with correct default state', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken());

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

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);

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

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch priority token');
    mockFetchAllowances.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useGetPriorityCardToken());

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

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should handle null response from API and fallback to first valid allowance', async () => {
    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(null);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

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

    mockPriorityToken = cachedToken;
    mockLastFetched = recentTimestamp;

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockFetchAllowances).not.toHaveBeenCalled();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should fetch new data when cache is stale', async () => {
    const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000);
    mockLastFetched = staleTimestamp;

    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockFetchAllowances).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should not fetch when no address is available', async () => {
    const noAddressSelector = () => undefined;
    mockSelectSelectedInternalAccountByScope.mockReturnValue(noAddressSelector);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectAllTokenBalances) {
        return {};
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return noAddressSelector;
      }
      return null;
    });

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockFetchAllowances).not.toHaveBeenCalled();
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.priorityToken).toBeNull();
  });

  it('should handle manual fetchPriorityToken call', async () => {
    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    mockFetchAllowances.mockClear();
    mockGetPriorityToken.mockClear();
    mockDispatch.mockClear();

    let manualResult: CardTokenAllowance | null | undefined;
    await act(async () => {
      manualResult = await result.current.fetchPriorityToken();
    });

    expect(manualResult).toEqual(
      expect.objectContaining({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        allowanceState: AllowanceState.Enabled,
      }),
    );
    expect(mockFetchAllowances).toHaveBeenCalledTimes(1);
    expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(2);
  });

  it('should return fallback token when no allowances are returned', async () => {
    mockFetchAllowances.mockResolvedValue([]);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.NotEnabled,
          isStaked: false,
          chainId: '0xe708',
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should return null when no allowances and no supported tokens exist', async () => {
    mockFetchAllowances.mockResolvedValue([]);
    (useCardSDK as jest.Mock).mockReturnValue({
      sdk: {
        ...mockSDK,
        supportedTokens: [],
      },
    });

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: null,
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should return first token when all allowances have zero balance', async () => {
    const zeroAllowanceTokens = [
      createMockSDKTokenData('0xToken1', '0'),
      createMockSDKTokenData('0xToken2', '0'),
    ];

    mockFetchAllowances.mockResolvedValue(zeroAllowanceTokens);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.NotEnabled,
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(mockGetPriorityToken).not.toHaveBeenCalled();
  });

  it('should fallback to token with positive balance when suggested token has zero balance', async () => {
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

    const customTokenBalances = {
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xZeroBalance': '0',
          '0xToken2': '500000000000000000',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectAllTokenBalances) {
        return customTokenBalances;
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return (scope: string) => {
          if (scope === 'eip155:0') {
            return {
              address: mockAddress,
              id: 'test-account-id',
              type: 'eip155:eoa' as const,
              options: {},
              metadata: {},
              methods: [],
            };
          }
          return undefined;
        };
      }
      const selectorString = selector.toString();
      if (
        selectorString.includes('selectCardPriorityToken') &&
        !selectorString.includes('LastFetched')
      ) {
        return mockPriorityToken;
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched;
      }
      return null;
    });

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
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

    const zeroBalanceTokens = {
      [mockAddress.toLowerCase()]: {
        '0x1': {
          '0xToken1': '0',
          '0xToken2': '0',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectAllTokenBalances) {
        return zeroBalanceTokens;
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return (scope: string) => {
          if (scope === 'eip155:0') {
            return {
              address: mockAddress,
              id: 'test-account-id',
              type: 'eip155:eoa' as const,
              options: {},
              metadata: {},
              methods: [],
            };
          }
          return undefined;
        };
      }
      const selectorString = selector.toString();
      if (
        selectorString.includes('selectCardPriorityToken') &&
        !selectorString.includes('LastFetched')
      ) {
        return mockPriorityToken;
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched;
      }
      return null;
    });

    mockFetchAllowances.mockResolvedValue(allowancesWithZeroBalance);
    mockGetPriorityToken.mockResolvedValue(suggestedTokenWithZeroBalance);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

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
  });

  it('should handle loading state correctly during fetch', async () => {
    let resolvePromise: (value: CardToken) => void;
    const mockPromise = new Promise<CardToken>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
    mockGetPriorityToken.mockReturnValue(mockPromise);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise(mockCardToken);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle tokens with limited allowance', async () => {
    const limitedAllowanceTokens = [
      createMockSDKTokenData('0xToken1', '1000'),
      createMockSDKTokenData('0xToken2', '2000'),
    ];

    mockFetchAllowances.mockResolvedValue(limitedAllowanceTokens);
    mockGetPriorityToken.mockResolvedValue(mockCardToken);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.Limited,
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should handle unsupported token filtering', async () => {
    const unsupportedTokenAllowances = [
      createMockSDKTokenData('0xUnsupportedToken', '1000000000000'),
    ];

    mockFetchAllowances.mockResolvedValue(unsupportedTokenAllowances);

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: '0xToken1',
          allowanceState: AllowanceState.NotEnabled,
        }),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });
});
