import '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import { useRewards } from './useRewards';
import Engine from '../../../../../core/Engine';
import { waitFor } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

// Mock useBridgeQuoteData hook
const mockActiveQuote = {
  quote: {
    requestId:
      '0xd12f19d577efae2b92748c1abc32d8be78a5e73a99d74e16cada270a2ad99516' as Hex,
    bridgeId: '1inch',
    srcChainId: 1,
    destChainId: 1,
    aggregator: '1inch',
    aggregatorType: 'AGG',
    srcAsset: {
      address: '0x0000000000000000000000000000000000000000',
      chainId: 1,
      assetId: 'eip155:1/slip44:60' as CaipAssetType,
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
      coingeckoId: 'ethereum',
      aggregators: [],
      occurrences: 100,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      metadata: {},
    },
    srcTokenAmount: '991250000000000000',
    destAsset: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: 1,
      assetId:
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType,
      symbol: 'USDC',
      decimals: 6,
      name: 'USDC',
      coingeckoId: 'usd-coin',
      aggregators: [
        'uniswapLabs',
        'metamask',
        'aave',
        'coinGecko',
        'openSwap',
        'zerion',
        'oneInch',
        'liFi',
        'xSwap',
        'socket',
        'rubic',
        'squid',
        'rango',
        'sonarwatch',
        'sushiSwap',
        'pmm',
        'bancor',
      ],
      occurrences: 17,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
      metadata: {
        storage: {
          balance: 9,
          approval: 10,
        },
      },
    },
    destTokenAmount: '4437209427',
    minDestTokenAmount: '4348465238',
    walletAddress: '0xC5FE6EF47965741f6f7A4734Bf784bf3ae3f2452',
    destWalletAddress: '0xC5FE6EF47965741f6f7A4734Bf784bf3ae3f2452',
    feeData: {
      metabridge: {
        amount: '8750000000000000',
        asset: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: 1,
          assetId: 'eip155:1/slip44:60' as CaipAssetType,
          symbol: 'ETH',
          decimals: 18,
          name: 'Ethereum',
          coingeckoId: 'ethereum',
          aggregators: [],
          occurrences: 100,
          iconUrl:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
          metadata: {},
        },
      },
    },
    bridges: ['1inch'],
    protocols: ['1inch'],
    steps: [],
    slippage: 2,
  },
  trade: {
    chainId: 1,
    to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
    from: '0xC5FE6EF47965741f6f7A4734Bf784bf3ae3f2452',
    value: '0xde0b6b3a7640000',
    data: '0x5f575529000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563646656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b200000000000000000000000000000000000000000000000000000000001033050560000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f191500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000048a76dfc3b0000000000000000000000000000000000000000000000000000000103305056200000000000000000000000e0554a476a092703abdb3ef35c80e0d76d32939f7dcbea7c0000000000000000000000000000000000000000000000001f',
    gasLimit: 266281,
  },
  estimatedProcessingTimeInSeconds: 0,
  sentAmount: {
    amount: '1',
    valueInCurrency: '4470.66',
    usd: '4470.66',
  },
  minToTokenAmount: {
    amount: '4348.465238',
    valueInCurrency: '4348.465238',
    usd: '4348.465238',
  },
  toTokenAmount: {
    amount: '4437.209427',
    valueInCurrency: '4436.36635720887',
    usd: '4436.36635720887',
  },
  swapRate: '4437.209427',
  totalNetworkFee: {
    amount: '0.000436147290796704',
    valueInCurrency: '1.94986624707319270464',
    usd: '1.94986624707319270464',
  },
  totalMaxNetworkFee: {
    amount: '0.000908611296073614',
    valueInCurrency: '4.06209217690446316524',
    usd: '4.06209217690446316524',
  },
  gasFee: {
    effective: {
      amount: '0.000436147290796704',
      valueInCurrency: '1.94986624707319270464',
      usd: '1.94986624707319270464',
    },
    total: {
      amount: '0.000436147290796704',
      valueInCurrency: '1.94986624707319270464',
      usd: '1.94986624707319270464',
    },
    max: {
      amount: '0.000908611296073614',
      valueInCurrency: '4.06209217690446316524',
      usd: '4.06209217690446316524',
    },
  },
  adjustedReturn: {
    valueInCurrency: '4434.41649096179680729536',
    usd: '4434.41649096179680729536',
  },
  cost: {
    valueInCurrency: '36.24350903820319270464',
    usd: '36.24350903820319270464',
  },
  includedTxFees: null,
};

describe('useRewards', () => {
  const mockCall = Engine.controllerMessenger.call as jest.Mock;

  const defaultSourceToken = {
    address: '0x0000000000000000000000000000000000000000' as Hex,
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'ETH',
    currencyExchangeRate: 2000,
  };

  const defaultDestToken = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
    chainId: '0x1' as Hex,
    decimals: 6,
    symbol: 'USDC',
    currencyExchangeRate: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when rewards feature is disabled', () => {
    it('should return default state when rewards feature is disabled', async () => {
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(false);
        }
        return Promise.resolve(null);
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          shouldShowRewardsRow: false,
          isLoading: false,
          estimatedPoints: null,
          hasError: false,
        });
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:isRewardsFeatureEnabled',
      );
    });
  });

  describe('when user has not opted in', () => {
    it('should return default state when user has not opted in', async () => {
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:getHasAccountOptedIn') {
          return Promise.resolve(false);
        }
        return Promise.resolve(null);
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          shouldShowRewardsRow: false,
          isLoading: false,
          estimatedPoints: null,
          hasError: false,
        });
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getHasAccountOptedIn',
        'eip155:1:0x1234567890123456789012345678901234567890',
      );
    });
  });

  describe('when rewards estimation is successful', () => {
    it('should return estimated points when all conditions are met', async () => {
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:getHasAccountOptedIn') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({ pointsEstimate: 100 });
        }
        return Promise.resolve(null);
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          shouldShowRewardsRow: true,
          isLoading: false,
          estimatedPoints: 100,
          hasError: false,
        });
      });

      // Verify the correct estimate request was made
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        {
          activityType: 'SWAP',
          account: 'eip155:1:0x1234567890123456789012345678901234567890',
          activityContext: {
            swapContext: {
              srcAsset: {
                id: 'eip155:1/slip44:60',
                amount: '991250000000000000',
              },
              destAsset: {
                id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                amount: '4437209427',
              },
              feeAsset: {
                id: 'eip155:1/slip44:60',
                amount: '8750000000000000',
              },
            },
          },
        },
      );
    });

    it('should handle source token without exchange rate', async () => {
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:getHasAccountOptedIn') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({ pointsEstimate: 50 });
        }
        return Promise.resolve(null);
      });

      const sourceTokenWithoutRate = {
        ...defaultSourceToken,
        currencyExchangeRate: undefined,
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: sourceTokenWithoutRate,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      await waitFor(() => {
        expect(result.current.estimatedPoints).toBe(50);
      });

      // Check that fee asset was created without USD price
      const callArgs = mockCall.mock.calls.find(
        (call) => call[0] === 'RewardsController:estimatePoints',
      );
      expect(callArgs[1].activityContext.swapContext.feeAsset.usdPrice).toBe(
        undefined,
      );
    });
  });

  describe('when required data is missing', () => {
    it('should return null when activeQuote is missing', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: undefined,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      expect(result.current).toEqual({
        shouldShowRewardsRow: false,
        isLoading: false,
        estimatedPoints: null,
        hasError: false,
      });

      // Should not call Engine methods
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should return null when sourceToken is missing', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: undefined,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      expect(result.current).toEqual({
        shouldShowRewardsRow: false,
        isLoading: false,
        estimatedPoints: null,
        hasError: false,
      });
    });

    it('should return null when destToken is missing', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: undefined,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      expect(result.current).toEqual({
        shouldShowRewardsRow: false,
        isLoading: false,
        estimatedPoints: null,
        hasError: false,
      });
    });

    it('should return null when sourceAmount is missing', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: undefined,
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      expect(result.current).toEqual({
        shouldShowRewardsRow: false,
        isLoading: false,
        estimatedPoints: null,
        hasError: false,
      });
    });
  });

  describe('error handling', () => {
    it('should handle rewards estimation error gracefully', async () => {
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:getHasAccountOptedIn') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:estimatePoints') {
          throw new Error('Network error');
        }
        return Promise.resolve(null);
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          shouldShowRewardsRow: true,
          isLoading: false,
          estimatedPoints: null,
          hasError: true,
        });
      });
    });

    it('should set hasError to true when isRewardsFeatureEnabled fails', async () => {
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          throw new Error('Feature check failed');
        }
        return Promise.resolve(null);
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          shouldShowRewardsRow: false,
          isLoading: false,
          estimatedPoints: null,
          hasError: true,
        });
      });
    });

    it('should set hasError to true when getHasAccountOptedIn fails', async () => {
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:getHasAccountOptedIn') {
          throw new Error('Opt-in check failed');
        }
        return Promise.resolve(null);
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          shouldShowRewardsRow: false,
          isLoading: false,
          estimatedPoints: null,
          hasError: true,
        });
      });
    });

    it('should reset hasError to false when estimation succeeds after previous error', async () => {
      // First mock returns error
      mockCall.mockImplementationOnce((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:getHasAccountOptedIn') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:estimatePoints') {
          throw new Error('Network error');
        }
        return Promise.resolve(null);
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result, rerender } = renderHookWithProvider(
        (props) =>
          useRewards({
            activeQuote: props?.activeQuote || mockActiveQuote,
            isQuoteLoading: false,
          }),
        { state: testState },
      );

      // Wait for first error
      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });

      // Now mock successful response
      mockCall.mockImplementation((method) => {
        if (method === 'RewardsController:isRewardsFeatureEnabled') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:getHasAccountOptedIn') {
          return Promise.resolve(true);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({ pointsEstimate: 100 });
        }
        return Promise.resolve(null);
      });

      // Create a new quote with different requestId to trigger re-estimation
      const updatedQuote = {
        ...mockActiveQuote,
        quote: {
          ...mockActiveQuote.quote,
          requestId: '0xnewrequestid' as Hex,
        },
      };

      // Trigger re-render with new quote
      rerender({ activeQuote: updatedQuote });

      // Wait for successful retry
      await waitFor(() => {
        expect(result.current).toEqual({
          shouldShowRewardsRow: true,
          isLoading: false,
          estimatedPoints: 100,
          hasError: false,
        });
      });
    });
  });

  describe('loading states', () => {
    it('should show loading when quote is loading', () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: defaultSourceToken,
          destToken: defaultDestToken,
          sourceAmount: '1',
        },
      });

      const { result } = renderHookWithProvider(
        () =>
          useRewards({
            activeQuote: mockActiveQuote,
            isQuoteLoading: true,
          }),
        { state: testState },
      );

      expect(result.current.isLoading).toBe(true);
    });
  });
});
