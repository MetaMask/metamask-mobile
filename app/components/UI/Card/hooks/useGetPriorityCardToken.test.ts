import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import { CardToken, CardTokenAllowance, AllowanceState } from '../types';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import Logger from '../../../../util/Logger';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockRefetch = jest.fn();
let mockUseQueryOptions: Record<string, unknown> = {};
const mockUseQueryReturn = {
  data: undefined as unknown,
  isLoading: false,
  error: null as unknown,
  refetch: mockRefetch,
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: Record<string, unknown>) => {
    mockUseQueryOptions = options;
    return mockUseQueryReturn;
  },
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
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

  const setupDefaultMocks = () => {
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
      if (selector === selectIsAuthenticatedCard) {
        return false;
      }

      if (typeof selector === 'function') {
        try {
          const mockState = {
            card: {
              cardholderAccounts: [],
              isLoaded: true,
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

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPriorityToken.mockReset();
    mockFetchAllowances.mockReset();

    // Reset useQuery mock return values
    mockUseQueryReturn.data = undefined;
    mockUseQueryReturn.isLoading = false;
    mockUseQueryReturn.error = null;
    mockRefetch.mockReset();
    mockUseQueryOptions = {};

    setupDefaultMocks();
  });

  it('should initialize with correct default state', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetPriorityCardToken());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.priorityToken).toBe(null);
  });

  it('should return priority token from useQuery data', async () => {
    const priorityToken: CardTokenAllowance = {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
      allowanceState: AllowanceState.Enabled,
      allowance: '1000000000000',
      caipChainId: `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
    };

    mockUseQueryReturn.data = {
      priorityToken,
      allTokensWithAllowances: [priorityToken],
    };

    const { result } = renderHook(() => useGetPriorityCardToken());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.priorityToken).toEqual(priorityToken);
    expect(result.current.allTokensWithAllowances).toEqual([priorityToken]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should pass correct enabled flag to useQuery when unauthenticated', () => {
    renderHook(() => useGetPriorityCardToken());

    expect(mockUseQueryOptions.enabled).toBe(true);
  });

  it('should disable useQuery when SDK is not available', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    renderHook(() => useGetPriorityCardToken());

    expect(mockUseQueryOptions.enabled).toBe(false);
  });

  it('should disable useQuery when no address is available', () => {
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
      if (selector === selectIsAuthenticatedCard) {
        return false;
      }

      if (typeof selector === 'function') {
        try {
          const mockState = {
            card: { cardholderAccounts: [], isLoaded: true },
            engine: {
              backgroundState: {
                TokenBalancesController: { tokenBalances: {} },
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

    const { result } = renderHook(() => useGetPriorityCardToken());

    expect(mockUseQueryOptions.enabled).toBe(false);
    expect(result.current.priorityToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('should report error when useQuery has an error', () => {
    mockUseQueryReturn.error = new Error('Failed to fetch');

    const { result } = renderHook(() => useGetPriorityCardToken());

    expect(result.current.error).toBe(true);
    expect(result.current.priorityToken).toBeNull();
  });

  it('should report loading when useQuery is loading', () => {
    mockUseQueryReturn.isLoading = true;

    const { result } = renderHook(() => useGetPriorityCardToken());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return null priorityToken when useQuery returns no data', () => {
    mockUseQueryReturn.data = undefined;

    const { result } = renderHook(() => useGetPriorityCardToken());

    expect(result.current.priorityToken).toBeNull();
    expect(result.current.allTokensWithAllowances).toBeNull();
  });

  it('should handle manual fetchPriorityToken call (unauthenticated)', async () => {
    const priorityToken: CardTokenAllowance = {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
      allowanceState: AllowanceState.Enabled,
      allowance: '1000000000000',
      caipChainId: `eip155:${CHAIN_IDS.LINEA_MAINNET}` as `${string}:${string}`,
    };

    mockRefetch.mockResolvedValue({
      data: {
        priorityToken,
        allTokensWithAllowances: [priorityToken],
      },
    });

    const { result } = renderHook(() => useGetPriorityCardToken());

    let manualResult: CardTokenAllowance | null | undefined;
    await act(async () => {
      manualResult = await result.current.fetchPriorityToken();
    });

    expect(manualResult).toEqual(priorityToken);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  describe('queryFn logic', () => {
    it('should fetch allowances and determine priority token via queryFn', async () => {
      mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
      mockGetPriorityToken.mockResolvedValue(mockCardToken);

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      expect(queryFn).toBeDefined();

      const queryResult = await queryFn();

      expect(mockFetchAllowances).toHaveBeenCalledTimes(1);
      expect(mockGetPriorityToken).toHaveBeenCalledTimes(1);
      expect(mockGetPriorityToken).toHaveBeenCalledWith(mockAddress, [
        '0xToken1',
        '0xToken2',
      ]);
      expect(queryResult).toEqual(
        expect.objectContaining({
          priorityToken: expect.objectContaining({
            address: '0xToken1',
            symbol: 'TKN1',
            allowanceState: AllowanceState.Enabled,
          }),
          allTokensWithAllowances: expect.any(Array),
        }),
      );
    });

    it('should return fallback token when no allowances are returned', async () => {
      mockFetchAllowances.mockResolvedValue([]);

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: CardTokenAllowance;
        allTokensWithAllowances: CardTokenAllowance[];
      };

      expect(queryResult.priorityToken).toEqual(
        expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          name: 'Token 1',
          allowanceState: AllowanceState.NotEnabled,
          isStaked: false,
        }),
      );
      expect(queryResult.allTokensWithAllowances).toEqual([]);
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

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: null;
        allTokensWithAllowances: CardTokenAllowance[];
      };

      expect(queryResult.priorityToken).toBeNull();
      expect(queryResult.allTokensWithAllowances).toEqual([]);
      expect(mockGetPriorityToken).not.toHaveBeenCalled();
    });

    it('should return first token when all allowances have zero balance', async () => {
      const zeroAllowanceTokens = [
        createMockSDKTokenData('0xToken1', '0'),
        createMockSDKTokenData('0xToken2', '0'),
      ];

      mockFetchAllowances.mockResolvedValue(zeroAllowanceTokens);

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: CardTokenAllowance;
        allTokensWithAllowances: CardTokenAllowance[];
      };

      expect(queryResult.priorityToken).toEqual(
        expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          allowanceState: AllowanceState.NotEnabled,
        }),
      );
      expect(mockGetPriorityToken).not.toHaveBeenCalled();
    });

    it('should handle null response from API and fallback to first valid allowance', async () => {
      mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
      mockGetPriorityToken.mockResolvedValue(null);

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: CardTokenAllowance;
      };

      expect(queryResult.priorityToken).toEqual(
        expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          allowanceState: AllowanceState.Enabled,
        }),
      );
    });

    it('should handle tokens with limited allowance', async () => {
      const limitedAllowanceTokens = [
        createMockSDKTokenData('0xToken1', '1000'),
        createMockSDKTokenData('0xToken2', '2000'),
      ];

      mockFetchAllowances.mockResolvedValue(limitedAllowanceTokens);
      mockGetPriorityToken.mockResolvedValue(mockCardToken);

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: CardTokenAllowance;
      };

      expect(queryResult.priorityToken).toEqual(
        expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          allowanceState: AllowanceState.Limited,
        }),
      );
    });

    it('should handle unsupported token filtering', async () => {
      const unsupportedTokenAllowances = [
        createMockSDKTokenData('0xUnsupportedToken', '1000000000000'),
      ];

      mockFetchAllowances.mockResolvedValue(unsupportedTokenAllowances);

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: CardTokenAllowance;
      };

      expect(queryResult.priorityToken).toEqual(
        expect.objectContaining({
          address: '0xToken1',
          allowanceState: AllowanceState.NotEnabled,
        }),
      );
    });

    it('should fallback to token with positive balance when suggested token has zero balance', async () => {
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
        if (selector === selectIsAuthenticatedCard) {
          return false;
        }

        if (typeof selector === 'function') {
          try {
            const mockState = {
              card: { cardholderAccounts: [], isLoaded: true },
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

        return null;
      });

      const tokenWithZeroBalanceSDK = createMockSDKTokenData(
        '0xZeroBalance',
        '1000000000000',
      );
      const tokenWithPositiveBalanceSDK = createMockSDKTokenData(
        '0xToken2',
        '500000000000',
      );

      mockFetchAllowances.mockResolvedValue([
        tokenWithZeroBalanceSDK,
        tokenWithPositiveBalanceSDK,
      ]);
      mockGetPriorityToken.mockResolvedValue({
        address: '0xZeroBalance',
        symbol: 'ZERO',
        name: 'Zero Balance Token',
        decimals: 18,
      });

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: CardTokenAllowance;
      };

      expect(queryResult.priorityToken).toEqual(
        expect.objectContaining({
          address: '0xToken2',
          symbol: 'TKN2',
          allowanceState: AllowanceState.Enabled,
        }),
      );
    });

    it('should return suggested token even with zero balance if no other token has positive balance', async () => {
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
        if (selector === selectIsAuthenticatedCard) {
          return false;
        }

        if (typeof selector === 'function') {
          try {
            const mockState = {
              card: { cardholderAccounts: [], isLoaded: true },
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

        return null;
      });

      mockFetchAllowances.mockResolvedValue(mockSDKTokensData);
      mockGetPriorityToken.mockResolvedValue({
        address: '0xToken1',
        symbol: 'TKN1',
        name: 'Token 1',
        decimals: 18,
      });

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      const queryResult = (await queryFn()) as {
        priorityToken: CardTokenAllowance;
      };

      expect(queryResult.priorityToken).toEqual(
        expect.objectContaining({
          address: '0xToken1',
          symbol: 'TKN1',
          allowanceState: AllowanceState.Enabled,
        }),
      );
    });

    it('should throw when SDK or selectedAddress not available', async () => {
      (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

      renderHook(() => useGetPriorityCardToken());

      const queryFn = mockUseQueryOptions.queryFn as () => Promise<unknown>;
      await expect(queryFn()).rejects.toThrow(
        'SDK or selectedAddress not available',
      );
    });
  });

  describe('Authenticated Card - externalWalletDetailsData derivation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGetPriorityToken.mockReset();
      mockFetchAllowances.mockReset();

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

      (useCardSDK as jest.Mock).mockReturnValue({
        sdk: {
          ...mockSDK,
          getCardExternalWalletDetails: jest.fn().mockResolvedValue([]),
        },
        isLoading: false,
      });
    });

    it('returns authenticated priority token from externalWalletDetailsData', async () => {
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
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.priorityToken).toEqual(priorityWalletDetail);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
      expect(result.current.warning).toBeNull();
    });

    it('handles empty wallet details and sets NeedDelegation warning', () => {
      const externalWalletDetailsData = {
        priorityWalletDetail: null,
        mappedWalletDetails: [],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      expect(result.current.warning).toBe('need_delegation');
      expect(result.current.priorityToken).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('handles wallet detail without token details', () => {
      const externalWalletDetailsData = {
        priorityWalletDetail: null,
        mappedWalletDetails: [],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      expect(result.current.warning).toBe('need_delegation');
    });

    it('returns priority wallet detail from externalWalletDetailsData', async () => {
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
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.priorityToken).toEqual(priorityWalletDetail);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('returns null and sets warning when priorityWalletDetail is undefined', () => {
      const externalWalletDetailsData = {
        priorityWalletDetail: undefined,
        mappedWalletDetails: [],
      };

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      expect(result.current.warning).toBe('need_delegation');
      expect(result.current.priorityToken).toBeNull();
    });

    it('handles multiple wallet details and returns priority token', () => {
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

      const { result } = renderHook(() =>
        useGetPriorityCardToken(externalWalletDetailsData),
      );

      expect(result.current.priorityToken).toEqual(priorityWalletDetail);
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

    it('handles error when external wallet data is invalid', () => {
      const { result } = renderHook(() => useGetPriorityCardToken(undefined));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priorityToken).toBeNull();
    });

    it('handles walletDetails being null', () => {
      const { result } = renderHook(() => useGetPriorityCardToken(null));

      expect(result.current.priorityToken).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error state false and loading state false on successful derivation', async () => {
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
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.error).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.warning).toBeNull();
    });

    it('disables useQuery when authenticated', () => {
      renderHook(() => useGetPriorityCardToken());

      expect(mockUseQueryOptions.enabled).toBe(false);
    });
  });

  describe('Token Adding Functionality', () => {
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
      jest.clearAllMocks();
      mockGetPriorityToken.mockReset();
      mockFetchAllowances.mockReset();

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

      const mockEngine = jest.requireMock('../../../../core/Engine');
      mockEngine.context.TokensController = mockTokensController;
      mockEngine.context.NetworkController = mockNetworkController;

      (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSelectAllTokenBalances.mockReturnValue(STATIC_TOKEN_BALANCES as any);

      // Provide the priority token via useQuery data so the addToken effect triggers
      mockUseQueryReturn.data = {
        priorityToken: STATIC_PRIORITY_TOKEN,
        allTokensWithAllowances: [STATIC_PRIORITY_TOKEN],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseSelector.mockImplementation((selector: any) => {
        if (selector === selectAllTokenBalances) {
          return STATIC_TOKEN_BALANCES;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockAccountSelector;
        }
        if (selector === selectIsAuthenticatedCard) {
          return false;
        }

        if (typeof selector === 'function') {
          try {
            return selector({
              card: {
                cardholderAccounts: [],
                isLoaded: true,
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
      });
    });

    afterEach(() => {
      mockTokensController =
        undefined as unknown as typeof mockTokensController;
      mockNetworkController =
        undefined as unknown as typeof mockNetworkController;
    });

    it('should add token when it does not exist in TokensController', async () => {
      const { result } = renderHook(() => useGetPriorityCardToken());

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
      const mockEngine = jest.requireMock('../../../../core/Engine');
      const addTokenMock = jest.fn().mockResolvedValue(undefined);

      mockEngine.context.TokensController = {
        state: {
          allTokens: {
            '0xe708': {
              [mockAddress.toLowerCase()]: STATIC_EXISTING_TOKEN_LIST,
            },
          },
        },
        addToken: addTokenMock,
      };

      const { result } = renderHook(() => useGetPriorityCardToken());

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

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTokensController.addToken).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'useGetPriorityCardToken::error adding priority token',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should not add token when priorityToken is null', async () => {
      mockUseQueryReturn.data = undefined;

      const { result } = renderHook(() => useGetPriorityCardToken());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTokensController.addToken).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
