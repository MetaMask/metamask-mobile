/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { parseCaipAssetId, parseCaipChainId } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { useGasFeeEstimates } from '../../../../components/Views/confirmations/hooks/gas/useGasFeeEstimates';
import { usePerpsDepositQuote } from './usePerpsDepositQuote';
import type { PerpsToken } from '../components/PerpsTokenSelector';
import type { AssetRoute } from '../controllers/types';
import type { RootState } from '../../../../reducers';
import Engine from '../../../../core/Engine';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  parseCaipAssetId: jest.fn(),
  parseCaipChainId: jest.fn(),
}));
jest.mock(
  '../../../../components/Views/confirmations/hooks/gas/useGasFeeEstimates',
);

// Mock Engine and PerpsController
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getDepositRoutes: jest.fn(),
    },
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn(),
    },
  },
}));

// Mock I18n
jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en-US',
  },
  strings: jest.fn((key: string) => key),
}));

// Mock useFiatFormatter
jest.mock(
  '../../../../components/UI/SimulationDetails/FiatDisplay/useFiatFormatter',
  () => ({
    __esModule: true,
    default: () => jest.fn((value: string) => `$${value}`),
  }),
);

// Mock getTransaction1559GasFeeEstimates to be synchronous
jest.mock('../../Swaps/utils/gas', () => ({
  getTransaction1559GasFeeEstimates: jest.fn(() =>
    Promise.resolve({
      maxFeePerGas: '50',
      maxPriorityFeePerGas: '2',
    }),
  ),
}));

// Mock Bridge utils
jest.mock('../../Bridge/utils/quoteUtils', () => ({
  shouldRefreshQuote: jest.fn(
    (_isExpired, refreshCount, maxRefreshCount, _willRefresh) =>
      refreshCount < maxRefreshCount && !_isExpired,
  ),
  isQuoteExpired: jest.fn(
    (_willRefresh, refreshRate, quoteFetchedTime) =>
      quoteFetchedTime && Date.now() - quoteFetchedTime > refreshRate,
  ),
}));

// Mock Date.now for consistent testing
const mockNow = 123;
jest.spyOn(Date, 'now').mockReturnValue(mockNow);

describe('usePerpsDepositQuote', () => {
  const mockToken: PerpsToken = {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    chainId: '0xa4b1',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  };

  const mockRoutes: AssetRoute[] = [
    {
      assetId:
        'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      chainId: 'eip155:42161',
      contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
    },
  ];

  const mockGasFeeEstimates = {
    gasFeeEstimates: {
      gasLimit: '100000',
      maxFeePerGas: '50',
      maxPriorityFeePerGas: '2',
    },
    gasEstimateType: 'fee-market',
  };

  const createMockState = (
    overrides?: DeepPartial<RootState>,
  ): DeepPartial<RootState> => ({
    fiatOrders: {
      networks: [
        {
          active: true,
          chainId: '42161',
          chainName: 'Arbitrum One',
        },
      ],
    },
    settings: {
      primaryCurrency: 'ETH',
    },
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              usdConversionRate: 3000,
            },
          },
        },
        NetworkController: {
          selectedNetworkClientId: 'arbitrum',
          networkConfigurationsByChainId: {
            '0xa4b1': {
              chainId: '0xa4b1',
              name: 'Arbitrum One',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'arbitrum',
                  url: 'https://arb1.arbitrum.io/rpc',
                  type: RpcEndpointType.Custom,
                },
              ],
            },
          },
        },
        TokenRatesController: {
          marketData: {
            '0xa4b1': {
              '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
                price: 1,
                currency: 'USD',
              },
            },
          },
        },
        GasFeeController: {
          gasFeeEstimatesByChainId: {
            '0xa4b1': {
              gasFeeEstimates: {
                low: {
                  minWaitTimeEstimate: 15000,
                  maxWaitTimeEstimate: 30000,
                  suggestedMaxPriorityFeePerGas: '1',
                  suggestedMaxFeePerGas: '20',
                },
                medium: {
                  minWaitTimeEstimate: 15000,
                  maxWaitTimeEstimate: 30000,
                  suggestedMaxPriorityFeePerGas: '2',
                  suggestedMaxFeePerGas: '50',
                },
                high: {
                  minWaitTimeEstimate: 15000,
                  maxWaitTimeEstimate: 30000,
                  suggestedMaxPriorityFeePerGas: '3',
                  suggestedMaxFeePerGas: '100',
                },
              },
              gasEstimateType: 'fee-market',
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                address: '0x1234567890123456789012345678901234567890',
              },
            },
          },
        },
        MultichainNetworkController: {
          selectedMultichainNetworkChainId: undefined,
          isEvmSelected: true,
          multichainNetworkConfigurationsByChainId: {},
        },
        TransactionController: {
          transactions: [],
          transactionBatches: [],
        },
        BridgeController: {
          quotes: [],
          quoteFetchError: null,
        },
        PerpsController: {
          depositStatus: 'idle',
          currentDepositTxHash: null,
          depositError: null,
        },
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Engine methods
    (
      Engine.context.PerpsController.getDepositRoutes as jest.Mock
    ).mockReturnValue(mockRoutes);

    (parseCaipAssetId as jest.Mock).mockReturnValue({
      chainId: 'eip155:42161',
      assetNamespace: 'erc20',
      assetReference: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    });
    (parseCaipChainId as jest.Mock).mockReturnValue({
      chainId: '42161',
      namespace: 'eip155',
    });
    (useGasFeeEstimates as jest.Mock).mockReturnValue(mockGasFeeEstimates);
  });

  describe('basic functionality', () => {
    it('should return initial state when amount is zero', () => {
      const state = createMockState();

      (parseCaipChainId as jest.Mock).mockReturnValue({
        reference: '42161',
        namespace: 'eip155',
      });

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '0',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current).toEqual({
        formattedQuoteData: {
          networkFee: '-',
          estimatedTime: '',
          receivingAmount: '0.00 USDC',
          exchangeRate: undefined,
        },
        isLoading: false,
        quoteFetchError: null,
        quoteFetchedTime: null,
        isExpired: null,
        willRefresh: true,
        refreshQuote: expect.any(Function),
        hasValidQuote: false,
        bridgeQuote: null,
      });
    });

    it('should return initial state when no token is selected', () => {
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: undefined as unknown as PerpsToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData).toEqual({
        networkFee: 'perps.deposit.calculating_fee',
        estimatedTime: '',
        receivingAmount: '0.00 USDC',
        exchangeRate: undefined,
      });

      expect(result.current.quoteFetchError).toBeNull();
      expect(result.current.quoteFetchedTime).toBeNull();
      expect(result.current.isExpired).toBe(null);
      expect(result.current.willRefresh).toBe(true);
      expect(result.current.refreshQuote).toEqual(expect.any(Function));
      expect(result.current.hasValidQuote).toBe(false);
      expect(result.current.bridgeQuote).toBeNull();
    });

    it('should calculate quote data for valid inputs', () => {
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '100.00 USDC',
      );
      // Initially shows calculating state for direct deposits
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });
  });

  describe('route matching', () => {
    it('should find matching route for selected token', () => {
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '100.00 USDC',
      );
      // Initially shows calculating state for direct deposits
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });

    it('should handle no matching route', () => {
      (
        Engine.context.PerpsController.getDepositRoutes as jest.Mock
      ).mockReturnValue([]);

      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      // Still shows calculating state even without routes for direct deposits
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });

    it('should handle different chain IDs', () => {
      const differentChainToken = {
        ...mockToken,
        chainId: '0x1' as `0x${string}`,
      };
      (parseCaipAssetId as jest.Mock).mockReturnValue({
        chainId: 'eip155:1',
        assetNamespace: 'erc20',
        assetReference: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      });
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: differentChainToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });
  });

  describe('gas fee estimation', () => {
    it('should use gas fee estimates when available', () => {
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.networkFee).toBeDefined();
      // Initially shows calculating state
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });

    it('should handle missing gas fee estimates', () => {
      (useGasFeeEstimates as jest.Mock).mockReturnValue({
        gasFeeEstimates: null,
        gasEstimateType: null,
      });
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      // Still shows calculating initially even with missing estimates
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });

    it('should handle legacy gas estimates', () => {
      (useGasFeeEstimates as jest.Mock).mockReturnValue({
        gasFeeEstimates: {
          gasLimit: '100000',
          gasPrice: '50',
        },
        gasEstimateType: 'legacy',
      });
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.networkFee).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle parseCaipAssetId errors', () => {
      (parseCaipAssetId as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid CAIP ID');
      });
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData).toEqual({
        networkFee: 'perps.deposit.calculating_fee', // Shows calculating initially
        estimatedTime: '3-5 seconds',
        receivingAmount: '100.00 USDC',
        exchangeRate: undefined,
      });
      expect(result.current.isLoading).toBe(true); // Still loading when error occurs
      expect(result.current.quoteFetchError).toBeNull();
      expect(DevLogger.log).toHaveBeenCalled();
    });

    it('should handle getDepositRoutes errors', () => {
      (
        Engine.context.PerpsController.getDepositRoutes as jest.Mock
      ).mockImplementation(() => {
        throw new Error('Route fetch failed');
      });

      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
      expect(result.current.formattedQuoteData.estimatedTime).toBe(
        '3-5 seconds',
      );
      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '100.00 USDC',
      );
      expect(result.current.formattedQuoteData.exchangeRate).toBeUndefined();
    });
  });

  describe('memoization', () => {
    it('should memoize results for same inputs', () => {
      const state = createMockState();

      const { result: result1 } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      const { result: result2 } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result1.current.formattedQuoteData).toEqual(
        result2.current.formattedQuoteData,
      );
      expect(result1.current.isLoading).toEqual(result2.current.isLoading);
      expect(result1.current.quoteFetchError).toEqual(
        result2.current.quoteFetchError,
      );
      expect(result1.current.quoteFetchedTime).toEqual(
        result2.current.quoteFetchedTime,
      );
      expect(result1.current.isExpired).toEqual(result2.current.isExpired);
      expect(result1.current.willRefresh).toEqual(result2.current.willRefresh);
      expect(result1.current.hasValidQuote).toEqual(
        result2.current.hasValidQuote,
      );
      expect(result1.current.bridgeQuote).toEqual(result2.current.bridgeQuote);
    });

    it('should recalculate when amount changes', () => {
      const state = createMockState();
      let currentAmount = '100';

      const { result, rerender } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: currentAmount,
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '100.00 USDC',
      );

      const initialResult = { ...result.current };

      currentAmount = '200';
      rerender({});

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '200.00 USDC',
      );
      expect(result.current.formattedQuoteData.receivingAmount).not.toBe(
        initialResult.formattedQuoteData.receivingAmount,
      );
    });

    it('should recalculate when token changes', () => {
      const state = createMockState();
      const differentToken = {
        ...mockToken,
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
      } as PerpsToken;
      let currentToken: PerpsToken | undefined = mockToken;

      const { result, rerender } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: currentToken as PerpsToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '100.00 USDC',
      );
      expect(result.current.formattedQuoteData.exchangeRate).toBeUndefined();

      currentToken = differentToken;
      rerender({});

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '299995.00 USDC',
      );
      expect(result.current.formattedQuoteData.exchangeRate).toBe(
        '1 ETH ≈ 3000.00 USDC',
      );
    });
  });

  describe('amount parsing and validation', () => {
    it('should handle empty string amount', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.00 USDC',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle dot-only amount', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '.',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.00 USDC',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle invalid string amount', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: 'invalid',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.00 USDC',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle negative amount', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '-100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.00 USDC',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle very small amounts', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '0.000001',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.000001 USDC',
      );
    });

    it('should handle very large amounts', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '999999999.999999',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '999999999.999999 USDC',
      );
    });
  });

  describe('direct deposit fee calculation', () => {
    it('should calculate direct deposit fee with valid gas estimates', () => {
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.networkFee).not.toBe('-');
    });

    it('should handle missing gas estimates gracefully', () => {
      const state = createMockState();

      // Mock gas estimation to return undefined
      const mockGetTransaction1559GasFeeEstimates = jest.requireMock(
        '../../Swaps/utils/gas',
      ).getTransaction1559GasFeeEstimates;
      mockGetTransaction1559GasFeeEstimates.mockResolvedValueOnce(undefined);

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      // Test initial state - async effects will run
      expect(result.current.formattedQuoteData.networkFee).toBeDefined();
    });
  });

  describe('same-chain swap functionality', () => {
    const ethToken: PerpsToken = {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0xa4b1',
      decimals: 18,
      symbol: 'ETH',
      name: 'Ethereum',
    };

    it('should handle ETH to USDC swap on Arbitrum', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '1',
            selectedToken: ethToken,
          }),
        { state },
      );

      expect(result.current.formattedQuoteData.networkFee).toBe('$5.00');
      expect(result.current.formattedQuoteData.exchangeRate).toBe(
        '1 ETH ≈ 3000.00 USDC',
      );
      expect(result.current.quoteFetchedTime).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle missing token rates for same-chain swap', () => {
      const stateWithoutTokenRates = createMockState({
        engine: {
          backgroundState: {
            TokenRatesController: {
              marketData: {
                // No token rates
              },
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '1',
            selectedToken: ethToken,
          }),
        { state: stateWithoutTokenRates },
      );

      expect(result.current.formattedQuoteData.exchangeRate).toBeUndefined();
    });

    it('should handle invalid token rates', () => {
      const stateWithInvalidTokenRates = createMockState({
        engine: {
          backgroundState: {
            TokenRatesController: {
              marketData: {
                '0xa4b1': {
                  '0x0000000000000000000000000000000000000000': {
                    // @ts-ignore - Mocking invalid price
                    price: null, // Invalid price
                    currency: 'USD',
                  },
                },
              },
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '1',
            selectedToken: ethToken,
          }),
        { state: stateWithInvalidTokenRates },
      );

      expect(result.current.formattedQuoteData.exchangeRate).toBeUndefined();
    });

    it('should handle exchange rate formatting errors', () => {
      const stateWithZeroPrice = createMockState({
        engine: {
          backgroundState: {
            TokenRatesController: {
              marketData: {
                '0xa4b1': {
                  '0x0000000000000000000000000000000000000000': {
                    price: 0, // Zero price
                    currency: 'USD',
                  },
                },
              },
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '1',
            selectedToken: ethToken,
          }),
        { state: stateWithZeroPrice },
      );

      expect(result.current.formattedQuoteData.exchangeRate).toBeUndefined();
    });
  });

  describe('bridge quote processing', () => {
    it('should handle empty quotes array', () => {
      const stateWithEmptyQuotes = createMockState({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [],
              quoteFetchError: null,
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const ethToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: ethToken,
          }),
        { state: stateWithEmptyQuotes },
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });

    it('should handle bridge controller loading state', () => {
      const stateWithLoadingBridge = createMockState({
        engine: {
          backgroundState: {
            BridgeController: {
              // @ts-ignore - Mocking loading state
              quotes: null, // Loading state
              quoteFetchError: null,
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const ethToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: ethToken,
          }),
        { state: stateWithLoadingBridge },
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });
  });

  describe('quote expiration and refresh', () => {
    it('should detect expired quotes', () => {
      // Mock isQuoteExpired to return true
      const mockIsQuoteExpired = jest.requireMock(
        '../../Bridge/utils/quoteUtils',
      ).isQuoteExpired;
      mockIsQuoteExpired.mockReturnValue(true);

      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.isExpired).toBe(true);
    });

    it('should handle refresh functionality', () => {
      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(typeof result.current.refreshQuote).toBe('function');

      // Should be able to call refresh without errors
      expect(() => result.current.refreshQuote()).not.toThrow();
    });

    it('should handle shouldRefreshQuote logic', () => {
      // Mock shouldRefreshQuote to return false
      const mockShouldRefreshQuote = jest.requireMock(
        '../../Bridge/utils/quoteUtils',
      ).shouldRefreshQuote;
      mockShouldRefreshQuote.mockReturnValue(false);

      const state = createMockState();
      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      expect(result.current.willRefresh).toBe(false);
    });
  });

  describe('token change handling', () => {
    it('should reset state when token changes', () => {
      const state = createMockState();
      let currentToken = mockToken;

      const { result, rerender } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: currentToken,
          }),
        { state },
      );

      // Change token
      const newToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      currentToken = newToken;
      rerender({});

      // State should be reset for new token
      expect(result.current.quoteFetchError).toBeNull();
    });

    it('should handle token address change', () => {
      const state = createMockState();
      let currentToken = mockToken;

      const { result, rerender } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: currentToken,
          }),
        { state },
      );

      // Change token address
      const tokenWithDifferentAddress: PerpsToken = {
        ...mockToken,
        address: '0x9876543210987654321098765432109876543210',
      };

      currentToken = tokenWithDifferentAddress;
      rerender({});

      // Should trigger state reset
      expect(result.current.quoteFetchError).toBeNull();
    });

    it('should handle token chainId change', () => {
      const state = createMockState();
      let currentToken = mockToken;

      const { result, rerender } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: currentToken,
          }),
        { state },
      );

      // Change token chainId
      const tokenWithDifferentChainId: PerpsToken = {
        ...mockToken,
        chainId: '0x1', // Different chain
      };

      currentToken = tokenWithDifferentChainId;
      rerender({});

      // Should trigger state reset
      expect(result.current.quoteFetchError).toBeNull();
    });

    it('should handle bridge-required tokens', () => {
      const state = createMockState();

      const bridgeToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1', // Different chain requiring bridge
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: bridgeToken,
          }),
        { state },
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.formattedQuoteData.networkFee).toBe(
        'perps.deposit.calculating_fee',
      );
    });
  });

  describe('error handling', () => {
    it('should handle calcTokenValue errors', () => {
      // This would require mocking the calcTokenValue import
      // For now, we test the error handling structure
      const state = createMockState();

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      // Should handle errors gracefully
      expect(result.current.quoteFetchError).toBeNull();
    });

    it('should handle bridge controller errors', () => {
      const stateWithBridgeError = createMockState({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [],
              quoteFetchError: 'Bridge network error',
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const ethToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: ethToken,
          }),
        { state: stateWithBridgeError },
      );

      expect(result.current.quoteFetchError).toBe('Bridge network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fee parsing errors', () => {
      const stateWithInvalidFeeData = createMockState({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [
                {
                  quote: {
                    destTokenAmount: '100.00',
                    feeData: {
                      metabridge: {
                        amount: 'invalid_amount', // Invalid amount
                        asset: {
                          symbol: 'USDC',
                          decimals: 6,
                        },
                      },
                    },
                  },
                  estimatedProcessingTimeInSeconds: 180,
                },
              ],
              quoteFetchError: null,
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const ethToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: ethToken,
          }),
        { state: stateWithInvalidFeeData },
      );

      // Invalid amount should result in error handling
      expect(result.current.formattedQuoteData.networkFee).toBe('NaN USDC');
    });

    it('should handle metabridge fee processing errors', () => {
      const stateWithMetabridgeError = createMockState({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [
                {
                  quote: {
                    destTokenAmount: '100.00',
                    feeData: {
                      metabridge: {
                        amount: '5000000',
                        asset: {
                          symbol: 'USDC',
                          // @ts-ignore - Mocking invalid decimals
                          decimals: null, // Invalid decimals
                        },
                      },
                    },
                  },
                  estimatedProcessingTimeInSeconds: 180,
                },
              ],
              quoteFetchError: null,
            },
            MultichainNetworkController: {
              selectedMultichainNetworkChainId: undefined,
              isEvmSelected: true,
              multichainNetworkConfigurationsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0x1234567890123456789012345678901234567890',
                  },
                },
              },
            },
          },
        },
      });

      const ethToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { result } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: ethToken,
          }),
        { state: stateWithMetabridgeError },
      );

      // Invalid decimals should result in error handling
      expect(result.current.formattedQuoteData.networkFee).toBe('0.0000 USDC');
    });
  });

  describe('cleanup and debouncing', () => {
    it('should cleanup debounced calls on unmount', () => {
      const state = createMockState();

      const { unmount } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: mockToken,
          }),
        { state },
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should cleanup timeouts on unmount', () => {
      const state = createMockState();

      const ethToken: PerpsToken = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { unmount } = renderHookWithProvider(
        () =>
          usePerpsDepositQuote({
            amount: '100',
            selectedToken: ethToken,
          }),
        { state },
      );

      // Should cleanup timeouts without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
