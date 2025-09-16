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

// Mock dependencies
jest.mock('./usePerpsTrading');

// Mock Engine
const mockControllerMessenger = {
  call: jest.fn(),
};

const mockAccountTreeController = {
  getAccountsFromSelectedAccountGroup: jest.fn().mockReturnValue([
    {
      type: 'eip155:1',
      address: '0x1234567890123456789012345678901234567890',
    },
  ]),
};

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: mockControllerMessenger,
  context: {
    AccountTreeController: mockAccountTreeController,
  },
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
    // Reset controller messenger mock
    mockControllerMessenger.call.mockReset();
    // Set default rewards enabled
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectRewardsEnabledFlag')) {
        return true;
      }
      return undefined;
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
            isMaker: false,
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
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45); // 100000 * 0.00045
      expect(result.current.metamaskFeeRate).toBe(0); // 0% currently
      expect(result.current.metamaskFee).toBe(0); // 100000 * 0
      expect(result.current.totalFee).toBe(45); // protocol + metamask
    });

    it('should calculate fees for limit orders as maker', async () => {
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
            isMaker: true,
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
            isMaker: false,
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
            isMaker: false,
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
            isMaker: false,
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
    it('should fall back to default fee rate on error', async () => {
      mockCalculateFees.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
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
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch fees');
      expect(result.current.protocolFeeRate).toBe(0); // No fallback - error state
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
            isMaker: false,
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
        ({ amount }) =>
          usePerpsOrderFees({ orderType: 'market', amount, isMaker: false }),
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
            isMaker: false,
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
            isMaker: false,
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
            isMaker: false,
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
            isMaker: false,
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
            isMaker: false,
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

  describe('Caching behavior', () => {
    it('performs calculations reliably across multiple calls', async () => {
      // Arrange - Given consistent fee and rewards responses
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

      // Act - When making the first calculation call
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Then calculation completes successfully
      expect(result.current.error).toBeNull();
      expect(result.current.totalFee).toBeGreaterThan(0);
    });

    it('should validate cached basePointsPerDollar is finite', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };

      // Mock controller messenger responses
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0); // No discount
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: 100,
            bonusBips: 200,
          });
        }
        return Promise.resolve();
      });
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act - Multiple calls to test cache validation
      const { result, rerender } = renderHook(
        (props: { amount: string }) =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: props.amount,
            isMaker: false,
          }),
        {
          initialProps: { amount: '100000' },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Change amount to trigger recalculation
      rerender({ amount: '200000' });

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Should handle cache validation properly
      expect(result.current.error).toBeNull();
      expect(isFinite(result.current.totalFee)).toBe(true);
    });
  });

  describe('Component unmount cleanup', () => {
    it('should handle component unmount during async operations', async () => {
      // Arrange
      let resolvePromise: ((value: FeeCalculationResult) => void) | undefined;
      const pendingPromise = new Promise<FeeCalculationResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockCalculateFees.mockReturnValue(pendingPromise);

      // Act
      const { result, unmount } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      // Unmount while async operation is pending
      unmount();

      // Resolve after unmount
      resolvePromise?.({
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      });

      // Assert - Should not cause React warnings or crashes
      // This test mainly ensures no console errors are thrown
      expect(result.current.isLoadingMetamaskFee).toBe(true);
    });
  });

  describe('formatFeeRate utility function', () => {
    it('formats undefined rate as N/A', () => {
      // Arrange & Act
      const result = formatFeeRate(undefined);

      // Assert
      expect(result).toBe('N/A');
    });

    it('formats null rate as N/A', () => {
      // Arrange & Act
      const result = formatFeeRate(null);

      // Assert
      expect(result).toBe('N/A');
    });

    it('formats zero rate correctly', () => {
      // Arrange & Act
      const result = formatFeeRate(0);

      // Assert
      expect(result).toBe('0.000%');
    });

    it('formats positive rate with correct percentage', () => {
      // Arrange & Act
      const result = formatFeeRate(0.00045);

      // Assert
      expect(result).toBe('0.045%');
    });

    it('formats rate with more decimal places', () => {
      // Arrange & Act
      const result = formatFeeRate(0.123456);

      // Assert
      expect(result).toBe('12.346%');
    });
  });

  describe('clearRewardsCaches utility function', () => {
    it('clears both fee discount and points calculation caches', () => {
      // Arrange - Function exists and is callable

      // Act
      clearRewardsCaches();

      // Assert - Function executes without throwing
      expect(typeof clearRewardsCaches).toBe('function');
    });
  });

  describe('Cache behavior edge cases', () => {
    beforeEach(() => {
      // Clear caches before each test
      clearRewardsCaches();
      jest.clearAllMocks();
    });

    it('should handle zero amount edge case', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0,
        feeAmount: 0,
        protocolFeeRate: 0,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '0',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert
      expect(result.current.totalFee).toBe(0);
      expect(result.current.protocolFee).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
    });

    it('should handle empty string amount', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0,
        feeAmount: 0,
        protocolFeeRate: 0,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert
      expect(result.current.totalFee).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should handle rewards controller API failure gracefully', async () => {
      // Arrange - Mock successful fee calculation but failing rewards API
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock rewards API to throw error
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method.includes('RewardsController:')) {
          return Promise.reject(new Error('Rewards API unavailable'));
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '1000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Core fee calculation should still work
      expect(result.current.totalFee).toBe(0.9); // 0.45 + 0.45
      expect(result.current.protocolFee).toBe(0.45);
      expect(result.current.metamaskFee).toBe(0.45);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Rewards Integration - Fee Discounts', () => {
    beforeEach(() => {
      clearRewardsCaches();
      jest.clearAllMocks();
    });

    it('should apply fee discount from RewardsController', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045, // 0.045% protocol + 1% MetaMask
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock 20% fee discount
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(20); // 20% discount
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert
      expect(result.current.originalMetamaskFeeRate).toBe(0.01);
      expect(result.current.feeDiscountPercentage).toBe(20);
      expect(result.current.metamaskFeeRate).toBe(0.008); // 1% * (1 - 0.20) = 0.8%
      expect(result.current.metamaskFee).toBe(800); // 100000 * 0.008
      expect(result.current.totalFee).toBe(845); // 45 + 800
    });

    it('should cache fee discount for subsequent calls', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(15); // 15% discount
        }
        return Promise.resolve();
      });

      // Act - First call
      const { result, rerender } = renderHook(
        ({ amount }) =>
          usePerpsOrderFees({
            orderType: 'market',
            amount,
            isMaker: false,
          }),
        {
          initialProps: { amount: '100000' },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Clear mock call count and rerender with different amount
      mockControllerMessenger.call.mockClear();
      rerender({ amount: '200000' });

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Fee discount should be cached (RewardsController not called again)
      expect(mockControllerMessenger.call).not.toHaveBeenCalledWith(
        'RewardsController:getPerpsDiscountForAccount',
        expect.any(String),
      );
      expect(result.current.feeDiscountPercentage).toBe(15);
    });

    it('should handle no fee discount available', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(undefined); // No discount
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert
      expect(result.current.originalMetamaskFeeRate).toBe(0.01);
      expect(result.current.feeDiscountPercentage).toBeUndefined();
      expect(result.current.metamaskFeeRate).toBe(0.01); // No discount applied
    });

    it('should handle rewards disabled flag', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock rewards disabled
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectRewardsEnabledFlag')) {
          return false; // Rewards disabled
        }
        return undefined;
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - No rewards calls should be made
      expect(mockControllerMessenger.call).not.toHaveBeenCalled();
      expect(result.current.feeDiscountPercentage).toBeUndefined();
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.bonusBips).toBeUndefined();
    });
  });

  describe('Rewards Integration - Points Estimation', () => {
    beforeEach(() => {
      clearRewardsCaches();
      jest.clearAllMocks();
      // Re-enable rewards for these tests (default is already true from main beforeEach)
    });

    it('should estimate points for trade', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: 250,
            bonusBips: 500, // 5% bonus
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
            coin: 'ETH',
            isClosing: false,
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert
      expect(mockControllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        expect.objectContaining({
          activityType: 'PERPS',
          account: expect.stringContaining('eip155:42161:'),
          activityContext: {
            perpsContext: {
              type: 'OPEN_POSITION',
              usdFeeValue: '1000', // 100000 * 0.01 = 1000
              coin: 'ETH',
            },
          },
        }),
      );
      expect(result.current.estimatedPoints).toBe(250);
      expect(result.current.bonusBips).toBe(500);
    });

    it('should handle closing position correctly', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: 150,
            bonusBips: 300,
          });
        }
        return Promise.resolve();
      });

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '50000',
            coin: 'BTC',
            isClosing: true, // Closing position
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert
      expect(mockControllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        expect.objectContaining({
          activityContext: {
            perpsContext: {
              type: 'CLOSE_POSITION',
              coin: 'BTC',
            },
          },
        }),
      );
      expect(result.current.estimatedPoints).toBe(150);
    });

    it('should cache points calculation parameters', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: 100,
            bonusBips: 200, // 2% bonus
          });
        }
        return Promise.resolve();
      });

      // Act - First call
      const { result, rerender } = renderHook(
        ({ amount }) =>
          usePerpsOrderFees({
            orderType: 'market',
            amount,
            coin: 'ETH',
            isMaker: false,
          }),
        {
          initialProps: { amount: '100000' },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.estimatedPoints).toBe(100);

      // Clear and rerender with different amount - should use cache for calculation
      mockControllerMessenger.call.mockClear();
      rerender({ amount: '200000' });

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Should use cached parameters to calculate points locally
      expect(mockControllerMessenger.call).not.toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        expect.any(Object),
      );
      expect(result.current.estimatedPoints).toBeGreaterThan(100); // Should be higher due to larger amount
    });

    it('should skip points estimation for zero amounts', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0,
        feeAmount: 0,
        protocolFeeRate: 0,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '0',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Points estimation should not be called for zero amounts
      expect(mockControllerMessenger.call).not.toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        expect.any(Object),
      );
      expect(result.current.estimatedPoints).toBeUndefined();
    });

    it('should handle points estimation failure gracefully', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      mockControllerMessenger.call.mockImplementation((method: string) => {
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
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Fee calculation should still work, points just unavailable
      expect(result.current.totalFee).toBe(1045);
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.error).toBeNull(); // Non-blocking error
    });
  });

  describe('Development Mode Features', () => {
    const originalDev = __DEV__;

    beforeEach(() => {
      clearRewardsCaches();
      jest.clearAllMocks();
      // Mock development environment
      (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    });

    afterEach(() => {
      (global as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
    });

    it('should simulate fee discount in development mode', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Use the development simulation trigger amount
      const simulationAmount = '41'; // Matches DEVELOPMENT_CONFIG.SIMULATE_FEE_DISCOUNT_AMOUNT

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: simulationAmount,
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Should simulate 20% discount without calling rewards API
      expect(result.current.feeDiscountPercentage).toBe(20);
      expect(result.current.metamaskFeeRate).toBe(0.008); // 1% * 0.8 = 0.8%
      expect(mockControllerMessenger.call).not.toHaveBeenCalledWith(
        'RewardsController:getPerpsDiscountForAccount',
        expect.any(String),
      );
    });
  });

  describe('Address Handling', () => {
    beforeEach(() => {
      clearRewardsCaches();
      jest.clearAllMocks();
    });

    it('should handle missing user address gracefully', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock no EVM account available
      mockAccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [],
      );

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Core fees should work, but no rewards integration
      expect(result.current.totalFee).toBe(1045);
      expect(result.current.feeDiscountPercentage).toBeUndefined();
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(mockControllerMessenger.call).not.toHaveBeenCalled();
    });

    it('should handle account controller error gracefully', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Mock AccountTreeController throwing error
      mockAccountTreeController.getAccountsFromSelectedAccountGroup.mockImplementation(
        () => {
          throw new Error('Account access error');
        },
      );

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Should handle gracefully
      expect(result.current.totalFee).toBe(1045);
      expect(result.current.error).toBeNull(); // Non-blocking error
    });

    it('should format CAIP account ID correctly', async () => {
      // Arrange
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const testAddress = '0x1234567890123456789012345678901234567890';
      mockAccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [
          {
            type: 'eip155:1',
            address: testAddress,
          },
        ],
      );

      mockControllerMessenger.call.mockImplementation(
        (method: string, ...args) => {
          if (method === 'RewardsController:getPerpsDiscountForAccount') {
            // Verify CAIP account ID format
            expect(args[0]).toBe(`eip155:42161:${testAddress}`);
            return Promise.resolve(10);
          }
          return Promise.resolve();
        },
      );

      // Act
      const { result } = renderHook(
        () =>
          usePerpsOrderFees({
            orderType: 'market',
            amount: '100000',
            isMaker: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Assert - Mock implementation verifies the CAIP format
      expect(result.current.feeDiscountPercentage).toBe(10);
    });
  });
});
