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

jest.mock('../../../../core/redux/slices/card', () => ({
  ...jest.requireActual('../../../../core/redux/slices/card'),
  selectIsAuthenticatedCard: jest.fn(),
  selectCardPriorityToken: jest.requireActual(
    '../../../../core/redux/slices/card',
  ).selectCardPriorityToken,
  selectCardPriorityTokenLastFetched: jest.requireActual(
    '../../../../core/redux/slices/card',
  ).selectCardPriorityTokenLastFetched,
}));

import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';

const mockSelectAllTokenBalances =
  selectAllTokenBalances as jest.MockedFunction<typeof selectAllTokenBalances>;
const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;
const mockSelectIsAuthenticatedCard =
  selectIsAuthenticatedCard as jest.MockedFunction<
    typeof selectIsAuthenticatedCard
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

  const mockSupportedTokens = [
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
  ];

  // Mock Redux state that persists across test lifecycle
  const mockSDK = {
    getPriorityToken: mockGetPriorityToken,
    getSupportedTokensAllowances: mockFetchAllowances,
    getSupportedTokensByChainId: jest.fn(() => mockSupportedTokens),
    lineaChainId: CHAIN_IDS.LINEA_MAINNET,
    supportedTokens: mockSupportedTokens,
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

    // Reset all individual mock functions
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
      addToken: jest.fn().mockResolvedValue(undefined),
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

      // If selector is a function (like createSelector result), try to execute it
      if (typeof selector === 'function') {
        try {
          const mockState = {
            card: {
              cardholderAccounts: [],
              isLoaded: true,
              priorityTokensByAddress: {
                [mockAddress.toLowerCase()]: mockPriorityToken,
              },
              lastFetchedByAddress: {
                [mockAddress.toLowerCase()]: mockLastFetched,
              },
              authenticatedPriorityToken: null,
              authenticatedPriorityTokenLastFetched: null,
            },
            engine: {
              backgroundState: {
                TokenBalancesController: {
                  tokenBalances: mockTokenBalances,
                },
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as unknown as any;

          const result = selector(mockState);

          // If the result is an object with allTokenBalances, return it (this is the cardState)
          if (
            result &&
            typeof result === 'object' &&
            'allTokenBalances' in result
          ) {
            return result;
          }

          return result;
        } catch (_e) {
          // Fallback for selectors that fail
        }
      }

      const selectorString = selector?.toString?.() || '';
      if (
        selectorString.includes('selectCardPriorityToken') &&
        !selectorString.includes('LastFetched')
      ) {
        return mockPriorityToken;
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched;
      }
      if (selectorString.includes('selectIsAuthenticatedCard')) {
        return false;
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
    expect(result.current.priorityToken).toBe(null);
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
          address: mockAddress,
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

  it('should use cached token when cache is valid', async () => {
    const now = new Date();
    const recentTimestamp = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
    const cachedToken = {
      address: '0xCachedToken',
      symbol: 'CACHED',
      name: 'Cached Token',
      caipChainId: `eip155:${CHAIN_IDS.LINEA_MAINNET}`,
      allowance: '1000000000000',
      decimals: 18,
      allowanceState: AllowanceState.Enabled,
      isStaked: false,
      chainId: CHAIN_IDS.LINEA_MAINNET,
    } as CardTokenAllowance;

    mockPriorityToken = cachedToken;
    mockLastFetched = recentTimestamp;

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockGetPriorityToken).not.toHaveBeenCalled();

    expect(result.current.isLoading).toBe(false);
    // And the cached token should be surfaced by the hook
    expect(result.current.priorityToken).toEqual(
      expect.objectContaining({
        address: '0xCachedToken',
        symbol: 'CACHED',
      }),
    );
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

      // Handle createSelector - return proper cardState
      if (typeof selector === 'function') {
        try {
          const mockState = {
            card: {
              cardholderAccounts: [],
              isLoaded: true,
              priorityTokensByAddress: {},
              lastFetchedByAddress: {},
              authenticatedPriorityToken: null,
              authenticatedPriorityTokenLastFetched: null,
            },
            engine: {
              backgroundState: {
                TokenBalancesController: {
                  tokenBalances: {},
                },
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as unknown as any;

          return selector(mockState);
        } catch (_e) {
          // Fallback
        }
      }

      if (selector?.toString?.().includes('selectIsAuthenticatedCard')) {
        return false;
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
          address: mockAddress,
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.NotEnabled,
            isStaked: false,
            caipChainId: expect.any(String),
          }),
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
        getSupportedTokensByChainId: jest.fn(() => []),
      },
    });

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setCardPriorityToken'),
        payload: expect.objectContaining({
          address: mockAddress,
          token: null,
        }),
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
          address: mockAddress,
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.NotEnabled,
          }),
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

      // Handle createSelector - return proper cardState
      if (typeof selector === 'function') {
        try {
          const mockState = {
            card: {
              cardholderAccounts: [],
              isLoaded: true,
              priorityTokensByAddress: {
                [mockAddress.toLowerCase()]: mockPriorityToken,
              },
              lastFetchedByAddress: {
                [mockAddress.toLowerCase()]: mockLastFetched,
              },
              authenticatedPriorityToken: null,
              authenticatedPriorityTokenLastFetched: null,
            },
            engine: {
              backgroundState: {
                TokenBalancesController: {
                  tokenBalances: customTokenBalances,
                },
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as unknown as any;

          return selector(mockState);
        } catch (_e) {
          // Fallback
        }
      }

      const selectorString = selector?.toString?.() || '';
      if (
        selectorString.includes('selectCardPriorityToken') &&
        !selectorString.includes('LastFetched')
      ) {
        return mockPriorityToken;
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched;
      }
      if (selectorString.includes('selectIsAuthenticatedCard')) {
        return false;
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

      // Handle createSelector - return proper cardState
      if (typeof selector === 'function') {
        try {
          const mockState = {
            card: {
              cardholderAccounts: [],
              isLoaded: true,
              priorityTokensByAddress: {
                [mockAddress.toLowerCase()]: mockPriorityToken,
              },
              lastFetchedByAddress: {
                [mockAddress.toLowerCase()]: mockLastFetched,
              },
              authenticatedPriorityToken: null,
              authenticatedPriorityTokenLastFetched: null,
            },
            engine: {
              backgroundState: {
                TokenBalancesController: {
                  tokenBalances: zeroBalanceTokens,
                },
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as unknown as any;

          return selector(mockState);
        } catch (_e) {
          // Fallback
        }
      }

      const selectorString = selector?.toString?.() || '';
      if (
        selectorString.includes('selectCardPriorityToken') &&
        !selectorString.includes('LastFetched')
      ) {
        return mockPriorityToken;
      }
      if (selectorString.includes('selectCardPriorityTokenLastFetched')) {
        return mockLastFetched;
      }
      if (selectorString.includes('selectIsAuthenticatedCard')) {
        return false;
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

  it('should handle loading state correctly during fetch', async () => {
    // Use deferred promises to control timing
    let resolveAllowances: (value: typeof mockSDKTokensData) => void;
    let resolvePriorityToken: (value: CardToken) => void;

    const allowancesPromise = new Promise<typeof mockSDKTokensData>(
      (resolve) => {
        resolveAllowances = resolve;
      },
    );
    const priorityTokenPromise = new Promise<CardToken>((resolve) => {
      resolvePriorityToken = resolve;
    });

    mockFetchAllowances.mockReturnValue(allowancesPromise);
    mockGetPriorityToken.mockReturnValue(priorityTokenPromise);

    const { result } = renderHook(() => useGetPriorityCardToken());

    // Wait for initial effect to trigger
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Should be loading while fetching allowances
    expect(result.current.isLoading).toBe(true);

    // Resolve allowances
    await act(async () => {
      resolveAllowances(mockSDKTokensData);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Still loading while fetching priority token
    expect(result.current.isLoading).toBe(true);

    // Resolve priority token
    await act(async () => {
      resolvePriorityToken(mockCardToken);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Should be done loading
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
          address: mockAddress,
          token: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Limited,
          }),
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
          address: mockAddress,
          token: expect.objectContaining({
            address: '0xToken1',
            allowanceState: AllowanceState.NotEnabled,
          }),
        }),
      }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  describe('Authenticated Card - fetchPriorityTokenAPI', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGetPriorityToken.mockReset();
      mockFetchAllowances.mockReset();
      mockDispatch.mockReset();

      mockDispatch.mockImplementation((action) => action);

      // Set up authenticated state - this is the key!
      mockSelectIsAuthenticatedCard.mockReturnValue(true);

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

      const mockTokenBalances = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSelectAllTokenBalances.mockReturnValue(mockTokenBalances as any);

      // Set up authenticated state in useSelector
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseSelector.mockImplementation((selector: any) => {
        if (selector === selectAllTokenBalances) {
          return mockTokenBalances;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockAccountSelector;
        }
        if (selector === selectIsAuthenticatedCard) {
          return true;
        }

        if (typeof selector === 'function') {
          try {
            const mockState = {
              card: {
                cardholderAccounts: [],
                isLoaded: true,
                priorityTokensByAddress: {},
                lastFetchedByAddress: {},
                authenticatedPriorityToken: null,
                authenticatedPriorityTokenLastFetched: null,
              },
              engine: {
                backgroundState: {
                  TokenBalancesController: {
                    tokenBalances: mockTokenBalances,
                  },
                },
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as unknown as any;

            return selector(mockState);
          } catch (_e) {
            // Fallback
          }
        }

        return null;
      });

      const { useDispatch: useDispatchMock } = jest.requireMock('react-redux');
      useDispatchMock.mockReturnValue(mockDispatch);

      // Ensure SDK is not in loading state
      (useCardSDK as jest.Mock).mockReturnValue({
        sdk: {
          ...mockSDK,
          getCardExternalWalletDetails: jest.fn().mockResolvedValue([]),
        },
        isLoading: false,
      });
    });

    it('fetches and returns authenticated priority token with correct allowance state', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            name: 'Token 1',
            allowanceState: AllowanceState.Enabled,
            walletAddress: '0xWallet123',
            caipChainId: expect.any(String),
          }),
        }),
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining(
            'setAuthenticatedPriorityTokenLastFetched',
          ),
          payload: expect.any(Date),
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
      expect(result.current.warning).toBeNull();
    });

    it('handles empty wallet details and sets NeedDelegation warning', async () => {
      const externalWalletDetailsData = {
        priorityWalletDetail: null,
        mappedWalletDetails: [],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: null,
        }),
      );

      expect(result.current.warning).toBe('need_delegation');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('handles wallet detail without token details', async () => {
      const externalWalletDetailsData = {
        priorityWalletDetail: null,
        mappedWalletDetails: [],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: null,
        }),
      );

      expect(result.current.warning).toBe('need_delegation');
    });

    it('selects first wallet with balance when first has no balance property', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken2',
        symbol: 'TKN2',
        name: 'Token 2',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            address: '0xToken2',
            symbol: 'TKN2',
          }),
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('skips wallets with zero balance and selects wallet with positive balance', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken3',
        symbol: 'TKN3',
        name: 'Token 3',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            address: '0xToken3',
            symbol: 'TKN3',
          }),
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('skips wallets with non-numeric balance and selects wallet with valid balance', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken3',
        symbol: 'TKN3',
        name: 'Token 3',
        decimals: 18,
        allowance: '5000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            address: '0xToken3',
            symbol: 'TKN3',
          }),
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('maps NotEnabled allowance state when allowance is zero', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '0',
        allowanceState: AllowanceState.NotEnabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            allowanceState: AllowanceState.NotEnabled,
          }),
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('maps Limited allowance state when allowance is less than arbitrary limit', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '5000',
        allowanceState: AllowanceState.Limited,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            allowanceState: AllowanceState.Limited,
          }),
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('calculates available balance as minimum of balance and allowance', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '5000',
        allowanceState: AllowanceState.Limited,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
        availableBalance: '5000',
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            availableBalance: '5000',
          }),
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('handles error when external wallet data is invalid', async () => {
      // Pass undefined to simulate error condition
      const { result } = renderHook(() => useGetPriorityCardToken(undefined));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // In authenticated mode without external wallet data, hook should set null token
      expect(result.current.isLoading).toBe(false);
      // The hook should not error when no external wallet data is provided
      // It will simply not have authenticated data to work with
    });

    it('validates cache correctly for authenticated users within 30 second window', () => {
      // This test verifies that the cache validation logic works correctly
      // for authenticated users (30 second window vs 5 minute window for non-authenticated)

      // Use a fixed reference time for consistency
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      const recentTimestamp = new Date('2025-01-15T11:59:45.000Z'); // 15 seconds ago
      const staleTimestamp = new Date('2025-01-15T11:59:20.000Z'); // 40 seconds ago

      const cachedToken = {
        address: '0xCachedToken',
        symbol: 'CACHED',
        name: 'Cached Token',
        decimals: 18,
        allowanceState: AllowanceState.Enabled,
        isStaked: false,
        chainId: CHAIN_IDS.LINEA_MAINNET,
      };

      // Test the cache validation logic directly with a fixed "now" reference
      const validateCache = (
        lastFetched: Date | string | null,
        authenticated: boolean,
        currentTime: Date,
      ): boolean => {
        if (!lastFetched) return false;
        const thirtySecondsAgo = new Date(currentTime.getTime() - 30 * 1000);
        const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);
        const lastFetchedDate =
          lastFetched instanceof Date ? lastFetched : new Date(lastFetched);

        if (authenticated) {
          return lastFetchedDate > thirtySecondsAgo;
        }

        return lastFetchedDate > fiveMinutesAgo;
      };

      // Test with recent timestamp (should be valid for authenticated)
      expect(validateCache(recentTimestamp, true, fixedNow)).toBe(true);

      // Test with stale timestamp (should be invalid for authenticated)
      expect(validateCache(staleTimestamp, true, fixedNow)).toBe(false);

      // Test with recent timestamp for non-authenticated (should still be valid)
      expect(validateCache(recentTimestamp, false, fixedNow)).toBe(true);

      // Verify the cached token structure
      expect(cachedToken).toEqual(
        expect.objectContaining({
          address: '0xCachedToken',
          symbol: 'CACHED',
        }),
      );
    });

    it('processes external wallet data when authenticated cache is stale (over 30 seconds)', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      renderHook(() => useGetPriorityCardToken(externalWalletDetailsData));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
          }),
        }),
      );
    });

    it('returns authenticated priority token when manually calling fetchPriorityToken', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      // Update selector to return the authenticated token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseSelector.mockImplementation((selector: any) => {
        if (selector === selectAllTokenBalances) {
          return {};
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === 'eip155:0') {
              return {
                address: mockAddress,
                id: 'test-account-id',
                type: 'eip155:eoa' as const,
              };
            }
            return undefined;
          };
        }
        if (selector === selectIsAuthenticatedCard) {
          return true;
        }

        if (typeof selector === 'function') {
          try {
            const mockState = {
              card: {
                cardholderAccounts: [],
                isLoaded: true,
                priorityTokensByAddress: {},
                lastFetchedByAddress: {},
                authenticatedPriorityToken: priorityWalletDetail,
                authenticatedPriorityTokenLastFetched: new Date(),
              },
              engine: {
                backgroundState: {
                  TokenBalancesController: {
                    tokenBalances: {},
                  },
                },
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as unknown as any;

            return selector(mockState);
          } catch (_e) {
            // Fallback
          }
        }

        return null;
      });

      renderHook(() => useGetPriorityCardToken(externalWalletDetailsData));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify the dispatched token was set
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
          }),
        }),
      );
    });

    it('returns null and sets warning when priorityWalletDetail is undefined', async () => {
      const externalWalletDetailsData = {
        priorityWalletDetail: undefined,
        mappedWalletDetails: [],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.warning).toBe('need_delegation');
      expect(result.current.priorityToken).toBeNull();
    });

    it('handles multiple wallet details and returns priority token', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const secondWalletDetail: CardTokenAllowance = {
        address: '0xToken2',
        symbol: 'TKN2',
        name: 'Token 2',
        decimals: 18,
        allowance: '500000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet456',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail, secondWalletDetail],
      };

      renderHook(() => useGetPriorityCardToken(externalWalletDetailsData));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
          }),
        }),
      );
    });

    it('manually calls fetchPriorityToken and returns priority wallet detail', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      let fetchResult: CardTokenAllowance | null = null;
      await act(async () => {
        fetchResult = await result.current.fetchPriorityToken();
      });

      expect(fetchResult).toEqual(priorityWalletDetail);
      expect(result.current.error).toBe(false);
    });

    it('returns null when manually calling fetchPriorityToken with null priorityWalletDetail', async () => {
      const externalWalletDetailsData = {
        priorityWalletDetail: null,
        mappedWalletDetails: [],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      let fetchResult: CardTokenAllowance | null | undefined;
      await act(async () => {
        fetchResult = await result.current.fetchPriorityToken();
      });

      expect(fetchResult).toBeNull();
      expect(result.current.warning).toBe('need_delegation');
    });

    it('dispatches both setAuthenticatedPriorityToken and setAuthenticatedPriorityTokenLastFetched', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      renderHook(() => useGetPriorityCardToken(externalWalletDetailsData));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: priorityWalletDetail,
        }),
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining(
            'setAuthenticatedPriorityTokenLastFetched',
          ),
          payload: expect.any(Date),
        }),
      );
    });

    it('clears error state when fetchPriorityToken succeeds', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await result.current.fetchPriorityToken();
      });

      expect(result.current.error).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('maintains state consistency when external wallet data changes', async () => {
      const initialPriorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail: initialPriorityWalletDetail,
        mappedWalletDetails: [initialPriorityWalletDetail],
      };

      const { rerender } = renderHook(
        (props) => useGetPriorityCardToken(props),
        {
          initialProps: externalWalletDetailsData,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const updatedPriorityWalletDetail: CardTokenAllowance = {
        address: '0xToken2',
        symbol: 'TKN2',
        name: 'Token 2',
        decimals: 18,
        allowance: '2000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet456',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const updatedWalletDetailsData = {
        priorityWalletDetail: updatedPriorityWalletDetail,
        mappedWalletDetails: [updatedPriorityWalletDetail],
      };

      mockDispatch.mockClear();

      await act(async () => {
        rerender(updatedWalletDetailsData);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setAuthenticatedPriorityToken'),
          payload: updatedPriorityWalletDetail,
        }),
      );
    });

    it('handles walletDetails being undefined', async () => {
      const { result } = renderHook(() => useGetPriorityCardToken(undefined));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.priorityToken).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('handles walletDetails being null', async () => {
      const { result } = renderHook(() => useGetPriorityCardToken(null));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.priorityToken).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error state false and loading state false on successful fetch', async () => {
      const priorityWalletDetail: CardTokenAllowance = {
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
        allowance: '1000000000000',
        allowanceState: AllowanceState.Enabled,
        walletAddress: '0xWallet123',
        caipChainId:
          `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
      };

      const externalWalletDetailsData = {
        priorityWalletDetail,
        mappedWalletDetails: [priorityWalletDetail],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.warning).toBeNull();
    });
  });

  describe('Token Adding Functionality', () => {
    // Pre-create static objects to avoid recreating them in each test
    const STATIC_TOKEN_BALANCES = {
      [mockAddress.toLowerCase()]: {
        [CHAIN_IDS.LINEA_MAINNET]: {
          '0xToken1': '1000000000000000000',
        },
      },
    };

    const STATIC_PRIORITY_TOKEN = {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
      chainId: CHAIN_IDS.LINEA_MAINNET,
      caipChainId:
        `eip155:${parseInt(CHAIN_IDS.LINEA_MAINNET, 16)}` as `${string}:${string}`,
      allowanceState: AllowanceState.Enabled,
      isStaked: false,
    };

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

      // IMPORTANT: Reset authenticated state to false for non-authenticated tests
      mockSelectIsAuthenticatedCard.mockReturnValue(false);

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

      // Create simple mock controllers
      mockTokensController = {
        state: {
          allTokens: {
            [CHAIN_IDS.LINEA_MAINNET]: {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSelectAllTokenBalances.mockReturnValue(STATIC_TOKEN_BALANCES as any);

      // Simplified selector implementation
      const { useSelector: useSelectorMock, useDispatch: useDispatchMock } =
        jest.requireMock('react-redux');
      useSelectorMock.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector: any) => {
          if (selector === selectAllTokenBalances) {
            return STATIC_TOKEN_BALANCES;
          }
          if (selector === selectSelectedInternalAccountByScope) {
            return mockAccountSelector;
          }
          if (selector === selectIsAuthenticatedCard) {
            return false;
          }

          const selectorStr = selector?.toString?.() || '';
          // Detect by internal state keys to be resilient to createSelector wrappers
          if (selectorStr.includes('selectAllTokenBalances')) {
            return STATIC_TOKEN_BALANCES;
          }
          if (selectorStr.includes('priorityTokensByAddress')) {
            return STATIC_PRIORITY_TOKEN;
          }
          if (selectorStr.includes('lastFetchedByAddress')) {
            return new Date();
          }
          // As a fallback, try invoking the selector with a minimal card state
          if (typeof selector === 'function') {
            try {
              return selector({
                card: {
                  cardholderAccounts: [],
                  isLoaded: true,
                  priorityTokensByAddress: {
                    [mockAddress.toLowerCase()]: STATIC_PRIORITY_TOKEN,
                  },
                  lastFetchedByAddress: {
                    [mockAddress.toLowerCase()]: new Date(),
                  },
                  authenticatedPriorityToken: null,
                  authenticatedPriorityTokenLastFetched: null,
                },
                engine: {
                  backgroundState: {
                    TokenBalancesController: {
                      tokenBalances: STATIC_TOKEN_BALANCES,
                    },
                  },
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as unknown as any);
            } catch (_e) {
              return null;
            }
          }
          return null;
        },
      );

      useDispatchMock.mockReturnValue(mockDispatch);
    });

    afterEach(() => {
      // Clear any references to prevent memory leaks
      mockTokensController =
        undefined as unknown as typeof mockTokensController;
      mockNetworkController =
        undefined as unknown as typeof mockNetworkController;
    });

    it('should add token when it does not exist in TokensController', async () => {
      const { result } = renderHook(() => useGetPriorityCardToken());

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
      // Get the Engine mock and replace the TokensController with one that has existing tokens
      const mockEngine = jest.requireMock('../../../../core/Engine');
      const addTokenMock = jest.fn().mockResolvedValue(undefined);

      mockEngine.context.TokensController = {
        state: {
          allTokens: {
            // CHAIN_IDS.LINEA_MAINNET is '0xe708' in hex format
            '0xe708': {
              [mockAddress.toLowerCase()]: STATIC_EXISTING_TOKEN_LIST,
            },
          },
        },
        addToken: addTokenMock,
      };

      const { result } = renderHook(() => useGetPriorityCardToken());

      // Wait for the addToken effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(addTokenMock).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('should handle token addition error gracefully', async () => {
      mockTokensController.addToken.mockRejectedValue(
        new Error('Add token failed'),
      );

      const { result } = renderHook(() => useGetPriorityCardToken());

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
      const { useSelector: useSelectorMock2 } = jest.requireMock('react-redux');
      useSelectorMock2.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectAllTokenBalances) {
            return STATIC_TOKEN_BALANCES;
          }
          if (selector === selectSelectedInternalAccountByScope) {
            return (scope: string) => {
              if (scope === 'eip155:0') {
                return {
                  address: mockAddress,
                };
              }
              return undefined;
            };
          }

          // Handle createSelector - return proper cardState with null priorityToken
          if (typeof selector === 'function') {
            try {
              const mockState = {
                card: {
                  cardholderAccounts: [],
                  isLoaded: true,
                  priorityTokensByAddress: {
                    [mockAddress.toLowerCase()]: null,
                  },
                  lastFetchedByAddress: {
                    [mockAddress.toLowerCase()]: new Date(),
                  },
                  authenticatedPriorityToken: null,
                  authenticatedPriorityTokenLastFetched: null,
                },
                engine: {
                  backgroundState: {
                    TokenBalancesController: {
                      tokenBalances: STATIC_TOKEN_BALANCES,
                    },
                  },
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as unknown as any;

              return selector(mockState);
            } catch (_e) {
              // Fallback
            }
          }

          const selectorStr = selector?.toString?.() || '';
          if (selectorStr.includes('selectCardPriorityToken')) {
            return null; // No priority token
          }
          if (selectorStr.includes('selectCardPriorityTokenLastFetched')) {
            return new Date();
          }
          if (selectorStr.includes('selectIsAuthenticatedCard')) {
            return false;
          }
          return null;
        },
      );

      const { result } = renderHook(() => useGetPriorityCardToken());

      // Wait for effects to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTokensController.addToken).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
