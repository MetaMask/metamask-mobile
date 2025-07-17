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
});
