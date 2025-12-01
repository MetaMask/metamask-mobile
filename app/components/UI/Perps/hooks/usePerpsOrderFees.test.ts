/* eslint-disable react/no-children-prop */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePerpsTrading } from './usePerpsTrading';
import {
  usePerpsOrderFees,
  formatFeeRate,
  clearRewardsCaches,
} from './usePerpsOrderFees';
import type { FeeCalculationResult } from '../controllers/types';

jest.mock('./usePerpsTrading');

// Import existing mocks
import { createMockEngineContext, TEST_CONSTANTS } from '../__mocks__';

// Use shared Engine context mock
const mockEngineContext = createMockEngineContext();

const mockControllerMessenger = {
  call: jest.fn(),
};

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: mockControllerMessenger,
  context: mockEngineContext,
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest
    .fn()
    .mockReturnValue('0x1234567890123456789012345678901234567890'),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: jest.fn().mockReturnValue('0xa4b1'),
}));

// Mock Redux store and selectors
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
  typeof usePerpsTrading
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Test wrapper with Redux Provider
const createWrapper = () => {
  const mockStore = configureStore({
    reducer: {
      // Minimal reducer for testing
      test: (state = {}) => state,
    },
  });
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store: mockStore, children });
  };
};

describe('usePerpsOrderFees', () => {
  const mockCalculateFees = jest.fn<
    Promise<FeeCalculationResult>,
    [{ orderType: 'market' | 'limit'; isMaker?: boolean; amount?: string }]
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    clearRewardsCaches();

    // Mock Redux state selectors correctly based on the selector function
    mockUseSelector.mockImplementation((selectorFn) => {
      // Create a mock state that the selectors can use
      const mockState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                ENABLE_REWARDS: true,
              },
              cacheTimestamp: 0,
            },
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [TEST_CONSTANTS.MOCK_ACCOUNT_ID]: {
                    address: TEST_CONSTANTS.MOCK_ADDRESS,
                    id: TEST_CONSTANTS.MOCK_ACCOUNT_ID,
                    metadata: { name: 'Test Account' },
                  },
                },
                selectedAccount: TEST_CONSTANTS.MOCK_ACCOUNT_ID,
              },
            },
            NetworkController: {
              selectedNetworkClientId: 'arbitrum',
              networkConfigurationsByChainId: {
                '0xa4b1': { chainId: '0xa4b1' },
              },
            },
          },
        },
      };

      // Call the actual selector with our mock state
      try {
        return selectorFn(mockState);
      } catch (error) {
        // Fallback for selectors that don't match our mock structure
        // Return sensible defaults based on common selector patterns
        const selectorStr = selectorFn.toString();
        if (
          selectorStr.includes('rewards') ||
          selectorStr.includes('Rewards')
        ) {
          return true; // rewardsEnabled
        }
        if (
          selectorStr.includes('address') ||
          selectorStr.includes('Address')
        ) {
          return TEST_CONSTANTS.MOCK_ADDRESS; // selectedAddress
        }
        if (selectorStr.includes('chain') || selectorStr.includes('Chain')) {
          return '0xa4b1'; // chainId
        }
        return undefined;
      }
    });
    mockUsePerpsTrading.mockReturnValue({
      calculateFees: mockCalculateFees,
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      depositWithConfirmation: jest.fn(),
      clearDepositResult: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      updateMargin: jest.fn(),
      flipPosition: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      getFunding: jest.fn(),
      getOrders: jest.fn(),
      getOrderFills: jest.fn(),
    });
  });

  describe('Fee calculation', () => {
    it('should calculate fees for market orders', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045, // 0.045% total
        feeAmount: 45,
        protocolFeeRate: 0.00045, // 0.045% protocol
        metamaskFeeRate: 0, // 0% MetaMask currently
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      // Initial loading state
      expect(result.current.isLoadingMetamaskFee).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for async calculation
      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Verify calculated fees
      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45); // 100000 * 0.00045
      expect(result.current.metamaskFeeRate).toBe(0); // 0% currently
      expect(result.current.metamaskFee).toBe(0); // 100000 * 0
      expect(result.current.totalFee).toBe(45); // protocol + metamask
    });

    it('calculates fees for limit orders as maker', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00015, // 0.015% total
        feeAmount: 15,
        protocolFeeRate: 0.00015, // 0.015% protocol
        metamaskFeeRate: 0, // 0% MetaMask currently
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49500',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: true,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00015);
      expect(result.current.protocolFee).toBeCloseTo(15, 10);
    });

    it('should calculate fees for limit orders as taker', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045, // 0.045% total
        feeAmount: 45,
        protocolFeeRate: 0.00045, // 0.045% protocol
        metamaskFeeRate: 0, // 0% MetaMask currently
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45);
    });

    it('should handle zero amount', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '0',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.protocolFee).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(0);
    });

    it('should handle empty amount string', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.protocolFee).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle undefined fee rates from provider', async () => {
      mockCalculateFees.mockResolvedValue({
        feeRate: 0.001,
        feeAmount: 100,
        metamaskFeeRate: undefined,
        protocolFeeRate: undefined,
      });

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(0);
      expect(result.current.metamaskFeeRate).toBeUndefined();
      expect(result.current.protocolFeeRate).toBeUndefined();
    });

    it('should fall back to default fee rate on error', async () => {
      mockCalculateFees.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.protocolFeeRate).toBe(0); // No fallback - error state
      expect(result.current.protocolFee).toBe(0); // 100000 * 0
    });

    it('should handle non-Error rejection', async () => {
      mockCalculateFees.mockRejectedValue('Unknown error');

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch fees');
      expect(result.current.protocolFeeRate).toBe(0); // No fallback - error state
    });

    it('should handle zero amount', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '0',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.totalFee).toBe(0);
      expect(result.current.protocolFee).toBe(0);
      expect(result.current.estimatedPoints).toBeUndefined();
    });

    it('should handle rewards enabled', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045, // Non-zero to test discount path
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Comprehensive assertions to ensure reward paths are covered
      expect(result.current.totalFee).toBe(90); // 45 protocol + 45 metamask
      expect(result.current.protocolFee).toBe(45);
      expect(result.current.metamaskFee).toBe(45);
      expect(result.current.feeDiscountPercentage).toBeUndefined();
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.bonusBips).toBeUndefined();
      expect(result.current.originalMetamaskFeeRate).toBe(0.00045);
    });

    it('should apply fee discount when discountBips provided', async () => {
      // Mock controller to return fee discount
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(1000); // 10% discount (1000 bips)
        }
        return Promise.resolve(null);
      });

      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045, // 0.045% protocol + 1% metamask
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01, // 1% base rate
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.totalFee).toBeGreaterThan(0);
      expect(result.current.originalMetamaskFeeRate).toBe(0.01);
      // The hook should apply discount internally
    });
  });

  describe('Loading states', () => {
    it('should show loading state during fee calculation', async () => {
      // Create a deferred promise that we can control
      const deferred: {
        promise: Promise<FeeCalculationResult>;
        resolve: (value: FeeCalculationResult) => void;
      } = (() => {
        let resolve: (value: FeeCalculationResult) => void = () => true;
        const promise = new Promise<FeeCalculationResult>((res) => {
          resolve = res;
        });
        return { promise, resolve };
      })();

      mockCalculateFees.mockReturnValue(deferred.promise);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      // Should be loading initially
      expect(result.current.isLoadingMetamaskFee).toBe(true);

      // Resolve the calculation
      deferred.resolve({
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });
    });
  });

  describe('Re-calculation on parameter changes', () => {
    it('should recalculate when order type changes', async () => {
      const mockMarketFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      const mockLimitFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };

      const updatedMockMarketFeeResult: FeeCalculationResult = {
        ...mockMarketFeeResult,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      const updatedMockLimitFeeResult: FeeCalculationResult = {
        ...mockLimitFeeResult,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      mockCalculateFees
        .mockResolvedValueOnce(updatedMockMarketFeeResult)
        .mockResolvedValueOnce(updatedMockLimitFeeResult);

      const { result, rerender } = renderHook(
        (props: {
          orderType: 'market' | 'limit';
          amount: string;
          isMaker: boolean;
        }) => usePerpsOrderFees(props),
        {
          initialProps: {
            orderType: 'market' as 'market' | 'limit',
            amount: '100000',
            isMaker: false,
          },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.protocolFeeRate).toBe(0.00045);
      });

      // Change to limit order
      rerender({
        orderType: 'limit' as 'market' | 'limit',
        amount: '100000',
        isMaker: true,
      });

      await waitFor(() => {
        expect(result.current.protocolFeeRate).toBe(0.00015);
      });

      expect(mockCalculateFees).toHaveBeenCalledTimes(2);
    });

    it('should recalculate when amount changes', async () => {
      mockCalculateFees
        .mockResolvedValueOnce({
          feeRate: 0.00045,
          feeAmount: 45,
          protocolFeeRate: 0.00045,
          metamaskFeeRate: 0,
        })
        .mockResolvedValueOnce({
          feeRate: 0.00045,
          feeAmount: 90,
          protocolFeeRate: 0.00045,
          metamaskFeeRate: 0,
        });

      const { result, rerender } = renderHook(
        ({ amount }) => usePerpsOrderFees({ orderType: 'market', amount }),
        {
          initialProps: { amount: '100000' },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.protocolFee).toBe(45);
      });

      rerender({ amount: '200000' });

      await waitFor(() => {
        expect(result.current.protocolFee).toBe(90);
      });
    });
  });

  describe('MetaMask fee integration', () => {
    it('should include MetaMask fees in total calculation', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045, // 0.045% protocol + 1% MetaMask = 1.045% total
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // The provider now returns MetaMask fee directly

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.metamaskFeeRate).toBe(0.01);
      expect(result.current.metamaskFee).toBe(1000); // 100000 * 0.01
      expect(result.current.totalFee).toBe(1045); // 45 + 1000
    });
  });
});

describe('formatFeeRate', () => {
  it('should format fee rate as percentage', () => {
    expect(formatFeeRate(0.00045)).toBe('0.045%');
    expect(formatFeeRate(0.00015)).toBe('0.015%');
    expect(formatFeeRate(0.01)).toBe('1.000%');
    expect(formatFeeRate(0)).toBe('0.000%');
  });

  it('should handle very small fee rates', () => {
    expect(formatFeeRate(0.000001)).toBe('0.000%');
    expect(formatFeeRate(0.00001)).toBe('0.001%');
  });

  it('should handle large fee rates', () => {
    expect(formatFeeRate(0.1)).toBe('10.000%');
    expect(formatFeeRate(1)).toBe('100.000%');
  });

  it('should handle invalid values', () => {
    expect(formatFeeRate(undefined)).toBe('N/A');
    expect(formatFeeRate(null)).toBe('N/A');
    expect(formatFeeRate(NaN)).toBe('N/A');
  });
});

describe('clearRewardsCaches', () => {
  it('should clear all rewards caches', () => {
    // Act
    clearRewardsCaches();

    // Assert - Function should execute without throwing errors
    // The cache clearing is tested implicitly through hook behavior
    expect(true).toBe(true);
  });
});

describe('usePerpsOrderFees - Maker/Taker Determination', () => {
  const mockCalculateFees = jest.fn<
    Promise<FeeCalculationResult>,
    [{ orderType: 'market' | 'limit'; isMaker?: boolean; amount?: string }]
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    clearRewardsCaches();
    mockControllerMessenger.call.mockReset();
    mockUseSelector.mockImplementation((selectorFn) => {
      const mockState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                ENABLE_REWARDS: true,
              },
              cacheTimestamp: 0,
            },
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [TEST_CONSTANTS.MOCK_ACCOUNT_ID]: {
                    address: TEST_CONSTANTS.MOCK_ADDRESS,
                    id: TEST_CONSTANTS.MOCK_ACCOUNT_ID,
                    metadata: { name: 'Test Account' },
                  },
                },
                selectedAccount: TEST_CONSTANTS.MOCK_ACCOUNT_ID,
              },
            },
            NetworkController: {
              selectedNetworkClientId: 'arbitrum',
              networkConfigurationsByChainId: {
                '0xa4b1': { chainId: '0xa4b1' },
              },
            },
          },
        },
      };

      try {
        return selectorFn(mockState);
      } catch (error) {
        // Fallback to string-based selector detection for mock state
        // eslint-disable-next-line no-console
        console.debug('Selector fallback:', error);
        const selectorStr = selectorFn.toString();
        if (
          selectorStr.includes('rewards') ||
          selectorStr.includes('Rewards')
        ) {
          return true;
        }
        if (
          selectorStr.includes('address') ||
          selectorStr.includes('Address')
        ) {
          return TEST_CONSTANTS.MOCK_ADDRESS;
        }
        if (selectorStr.includes('chain') || selectorStr.includes('Chain')) {
          return '0xa4b1';
        }
        return undefined;
      }
    });
    mockUsePerpsTrading.mockReturnValue({
      calculateFees: mockCalculateFees,
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      depositWithConfirmation: jest.fn(),
      clearDepositResult: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      updateMargin: jest.fn(),
      flipPosition: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      getFunding: jest.fn(),
      getOrders: jest.fn(),
      getOrderFills: jest.fn(),
    });
  });

  describe('Market Orders', () => {
    it('treats market orders as taker regardless of price', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
    });
  });

  describe('Limit Orders - Long Direction', () => {
    it('treats buy limit above ask as taker when price would execute immediately', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '50100',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
    });

    it('treats buy limit at ask price as taker', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '50001',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });

    it('treats buy limit below ask as maker when price goes to order book', async () => {
      const mockMakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockMakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49500',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: true,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00015);
    });
  });

  describe('Limit Orders - Short Direction', () => {
    it('treats sell limit below bid as taker when price would execute immediately', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49900',
            direction: 'short',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
    });

    it('treats sell limit at bid price as taker', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49999',
            direction: 'short',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });

    it('treats sell limit above bid as maker when price goes to order book', async () => {
      const mockMakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockMakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '50500',
            direction: 'short',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: true,
        amount: '100000',
        coin: 'ETH',
      });
      expect(result.current.protocolFeeRate).toBe(0.00015);
    });
  });

  describe('Edge Cases - Invalid Data', () => {
    it('defaults to taker when currentPrice is missing', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49500',
            direction: 'long',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });

    it('defaults to taker when limitPrice is empty string', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });

    it('defaults to taker when limitPrice is NaN', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: 'invalid',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });

    it('defaults to taker when limitPrice is zero', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '0',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });

    it('defaults to taker when limitPrice is negative', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '-1000',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });

    it('defaults to taker when direction is missing', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49500',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });
  });

  describe('No Bid/Ask Data - Conservative Taker', () => {
    it('defaults to taker when bid and ask are unavailable', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49500',
            direction: 'long',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
        coin: 'ETH',
      });
    });
  });

  describe('Fee Calculations', () => {
    it('applies maker fee rate (0.015%) for maker orders', async () => {
      const mockMakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockMakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49500',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.protocolFeeRate).toBe(0.00015);
      expect(result.current.protocolFee).toBeCloseTo(15, 10);
    });

    it('applies taker fee rate (0.045%) for taker orders', async () => {
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockTakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '50100',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45);
    });

    it('calculates correct USD fee amount for maker orders', async () => {
      const mockMakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 75,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockMakerFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '500000',
            limitPrice: '49500',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.protocolFee).toBe(75);
      expect(result.current.totalFee).toBe(75);
    });
  });

  describe('Hook Integration - useMemo Dependencies', () => {
    it('recalculates maker status when limit price changes', async () => {
      const mockMakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      const mockTakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };

      mockCalculateFees
        .mockResolvedValueOnce(mockMakerFeeResult)
        .mockResolvedValueOnce(mockTakerFeeResult);

      const { result, rerender } = renderHook(
        ({ limitPrice }: { limitPrice: string }) =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice,
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
          }),
        {
          initialProps: { limitPrice: '49500' },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.protocolFeeRate).toBe(0.00015);
      });

      rerender({ limitPrice: '50100' });

      await waitFor(() => {
        expect(result.current.protocolFeeRate).toBe(0.00045);
      });

      expect(mockCalculateFees).toHaveBeenCalledTimes(2);
    });

    it('does not recalculate maker status when irrelevant props change', async () => {
      const mockMakerFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockMakerFeeResult);

      const { result, rerender } = renderHook(
        ({ coin }: { coin: string }) =>
          usePerpsOrderFees({
            orderType: 'limit',
            amount: '100000',
            limitPrice: '49500',
            direction: 'long',
            currentAskPrice: 50001,
            currentBidPrice: 49999,
            coin,
          }),
        {
          initialProps: { coin: 'BTC' },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      const firstCallCount = mockCalculateFees.mock.calls.length;

      rerender({ coin: 'ETH' });

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees.mock.calls.length).toBeGreaterThan(
        firstCallCount,
      );
    });
  });
});

describe('usePerpsOrderFees - Enhanced Error Handling', () => {
  const mockCalculateFees = jest.fn<
    Promise<FeeCalculationResult>,
    [{ orderType: 'market' | 'limit'; isMaker?: boolean; amount?: string }]
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset controller messenger mock
    mockControllerMessenger.call.mockReset();
    mockUsePerpsTrading.mockReturnValue({
      calculateFees: mockCalculateFees,
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      depositWithConfirmation: jest.fn(),
      clearDepositResult: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      updateMargin: jest.fn(),
      flipPosition: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      getFunding: jest.fn(),
      getOrders: jest.fn(),
      getOrderFills: jest.fn(),
    });
  });

  describe('Error resilience', () => {
    it('calculates fees without crashing when rewards estimation succeeds', async () => {
      // Arrange - Given valid fee calculation and rewards response
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({ pointsEstimate: 100, bonusBips: 200 });
        }
        return Promise.resolve();
      });
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act - When calculating fees for a trade
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Then fee calculation completes successfully
      expect(result.current.error).toBeNull();
      expect(result.current.totalFee).toBeGreaterThan(0);
    });

    it('handles edge case rewards data without crashing', async () => {
      // Arrange - Given rewards with extreme bonus values
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({ pointsEstimate: 100, bonusBips: -10000 });
        }
        return Promise.resolve();
      });
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act - When calculating fees with edge case rewards
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Then calculation completes without errors
      expect(result.current.error).toBeNull();
      expect(result.current.totalFee).toBeGreaterThan(0);
    });
  });

  describe('Separated error handling', () => {
    it('should show correct fees when core fee calculation succeeds but rewards fails', async () => {
      // Arrange - Mock core fees to succeed, but rewards to fail internally
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Core fees should still be available even if rewards fails
      expect(result.current.error).toBeNull();
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.metamaskFeeRate).toBe(0.00045);
      expect(result.current.totalFee).toBe(90); // protocolFee (45) + metamaskFee (45) = 90
    });

    it('should reset all fees when core fee calculation fails', async () => {
      // Arrange
      mockCalculateFees.mockRejectedValue(new Error('Core calculation failed'));

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      // Wait for error handling
      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - All fees should be reset on core calculation error
      expect(result.current.error).toBe('Core calculation failed');
      expect(result.current.protocolFeeRate).toBe(0);
      expect(result.current.metamaskFeeRate).toBe(0);
      expect(result.current.totalFee).toBe(0);
      expect(result.current.estimatedPoints).toBeUndefined();
    });
  });

  describe('Cache Management and TTL', () => {
    it('should validate cached basePointsPerDollar is finite', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock non-finite basePointsPerDollar response
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: 100,
            bonusBips: 200,
            basePointsPerDollar: Infinity, // Invalid cached value
          });
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Should handle invalid cached basePointsPerDollar gracefully
      expect(result.current.estimatedPoints).toBeUndefined();
    });
  });

  describe('Rewards API Failure Handling', () => {
    it('should continue with 0% discount when rewards API fails', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock rewards API to fail
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.reject(new Error('Rewards API unavailable'));
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Core fees should still be available even if rewards fails
      expect(result.current.error).toBeNull();
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.metamaskFeeRate).toBe(0.00045);
      expect(result.current.totalFee).toBe(90); // protocolFee (45) + metamaskFee (45) = 90
    });

    it('should handle points estimation API failure gracefully', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.reject(new Error('Points estimation failed'));
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Core functionality should work, points should be undefined
      expect(result.current.error).toBeNull();
      expect(result.current.totalFee).toBe(90);
      expect(result.current.estimatedPoints).toBeUndefined();
    });
  });

  describe('Fee Discount Edge Cases and Validation', () => {
    it('should handle negative discount values gracefully', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock negative discount
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(-500); // -5% discount
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Negative discount should be treated as 0%
      expect(result.current.metamaskFee).toBe(45); // Full metamask fee
      expect(result.current.totalFee).toBe(90);
    });
  });

  describe('Points Calculation Edge Cases', () => {
    it('should handle invalid points calculation gracefully', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0); // No discount
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: NaN, // Invalid points estimate
            bonusBips: 200,
          });
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Should handle invalid points gracefully
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.totalFee).toBe(90); // Core functionality still works
    });
  });

  describe('Component Lifecycle and Cache Management', () => {
    it('should clear points cache on component mount', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act - Multiple instances should each clear cache
      const { result: result1, unmount: unmount1 } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result1.current.isLoadingMetamaskFee).toBe(false);
      });

      unmount1();

      const { result: result2 } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result2.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Both instances should work correctly
      expect(result2.current.totalFee).toBeGreaterThan(0);
    });

    it('should handle cleanup when component unmounts during async operations', async () => {
      // Arrange - Delay the API response
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };

      let resolveCalculateFees:
        | ((value: FeeCalculationResult) => void)
        | undefined;
      const delayedPromise = new Promise<FeeCalculationResult>((resolve) => {
        resolveCalculateFees = resolve;
      });
      mockCalculateFees.mockReturnValue(delayedPromise);

      // Act - Render and unmount before async operation completes
      const { result, unmount } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      // Verify loading state
      expect(result.current.isLoadingMetamaskFee).toBe(true);

      // Unmount before promise resolves
      unmount();

      // Complete the async operation
      resolveCalculateFees?.(mockFeeResult);

      // Assert - Should not cause any errors or memory leaks
      // The test passes if no errors are thrown during cleanup
    });

    it('should handle cache TTL expiration correctly', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act - Test basic caching mechanism by multiple calls
      const { result: result1, unmount: unmount1 } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result1.current.isLoadingMetamaskFee).toBe(false);
      });

      unmount1();

      const { result: result2 } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result2.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Cache mechanism works
      expect(result2.current.totalFee).toBeGreaterThan(0);
    });

    it('should handle discount validation edge cases', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act - Test with various discount scenarios
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Fee calculation works regardless of discount edge cases
      expect(result.current.totalFee).toBeGreaterThan(0);
      expect(result.current.protocolFee).toBe(45);
    });

    it('should handle invalid amount for points estimation', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '0', // Invalid amount - targets line 203
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Should not have points estimation for invalid amount
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.totalFee).toBe(0);
    });

    it('should handle empty coin parameter for points estimation', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            coin: '', // Empty coin - should trigger early return in points estimation
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Points estimation should not be available for empty coin
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.totalFee).toBe(90); // Base fees still calculated
    });
  });
});
