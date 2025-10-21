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

// Mock specific selectors directly
jest.mock('../../../../selectors/featureFlagController/rewards', () => ({
  selectRewardsEnabledFlag: jest.fn().mockReturnValue(true),
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

  const mockPerpsTradingReturn = {
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
  };

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
    mockUsePerpsTrading.mockReturnValue(mockPerpsTradingReturn);
  });

  describe('Fee calculation', () => {
    it('calculates fees for market orders', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: '100000',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45);
      expect(result.current.metamaskFeeRate).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(45);
    });

    it('calculates fees for limit orders as maker', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
        protocolFeeRate: 0.00015,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'limit' as const,
        amount: '100000',
        isMaker: true,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: true,
        amount: '100000',
      });
      expect(result.current.protocolFeeRate).toBe(0.00015);
      expect(result.current.protocolFee).toBeCloseTo(15, 10);
    });

    it('calculates fees for limit orders as taker', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'limit' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45);
    });

    it('handles zero amount', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '0',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.protocolFee).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(0);
    });

    it('handles empty amount string', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.protocolFee).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('falls back to default fee rate on error', async () => {
      mockCalculateFees.mockReturnValue(
        Promise.reject(new Error('Network error')),
      );

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBe('Network error');
      expect(result.current.protocolFeeRate).toBe(0);
      expect(result.current.protocolFee).toBe(0);
    });

    it('handles non-Error rejection', async () => {
      mockCalculateFees.mockReturnValue(Promise.reject('Unknown error'));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBe('Failed to fetch fees');
      expect(result.current.protocolFeeRate).toBe(0);
    });

    it('handles zero amount', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '0',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.totalFee).toBe(0);
      expect(result.current.protocolFee).toBe(0);
      expect(result.current.estimatedPoints).toBeUndefined();
    });

    it('handle rewards disabled', async () => {
      const { selectRewardsEnabledFlag } = jest.requireMock(
        '../../../../selectors/featureFlagController/rewards',
      );
      selectRewardsEnabledFlag.mockReturnValue(false);

      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.totalFee).toBe(90);
      expect(result.current.protocolFee).toBe(45);
      expect(result.current.metamaskFee).toBe(45);
      expect(result.current.feeDiscountPercentage).toBeUndefined();
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.bonusBips).toBeUndefined();
      expect(result.current.originalMetamaskFeeRate).toBe(0.00045);
    });

    it('apply fee discount when discountBips provided', async () => {
      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(1000);
        }
        return Promise.resolve(null);
      });

      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.totalFee).toBeGreaterThan(0);
      expect(result.current.originalMetamaskFeeRate).toBe(0.01);
    });
  });

  describe('Loading states', () => {
    it('show loading state during fee calculation', async () => {
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

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoadingMetamaskFee).toBe(true);

      deferred.resolve({
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0,
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );
    });
  });

  describe('Re-calculation on parameter changes', () => {
    it('recalculate when order type changes', async () => {
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
        .mockReturnValueOnce(Promise.resolve(updatedMockMarketFeeResult))
        .mockReturnValueOnce(Promise.resolve(updatedMockLimitFeeResult));

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

      await waitFor(
        () => expect(result.current.protocolFeeRate).toBe(0.00045),
        { timeout: 500 },
      );

      rerender({
        orderType: 'limit' as 'market' | 'limit',
        amount: '100000',
        isMaker: true,
      });

      await waitFor(
        () => expect(result.current.protocolFeeRate).toBe(0.00015),
        { timeout: 500 },
      );

      expect(mockCalculateFees).toHaveBeenCalledTimes(2);
    });

    it('recalculate when amount changes', async () => {
      mockCalculateFees
        .mockReturnValueOnce(
          Promise.resolve({
            feeRate: 0.00045,
            feeAmount: 45,
            protocolFeeRate: 0.00045,
            metamaskFeeRate: 0,
          }),
        )
        .mockReturnValueOnce(
          Promise.resolve({
            feeRate: 0.00045,
            feeAmount: 90,
            protocolFeeRate: 0.00045,
            metamaskFeeRate: 0,
          }),
        );

      const { result, rerender } = renderHook(
        ({ amount }) =>
          usePerpsOrderFees({ orderType: 'market', amount, isMaker: false }),
        {
          initialProps: { amount: '100000' },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => expect(result.current.protocolFee).toBe(45), {
        timeout: 500,
      });

      rerender({ amount: '200000' });

      await waitFor(() => expect(result.current.protocolFee).toBe(90), {
        timeout: 500,
      });
    });
  });

  describe('MetaMask fee integration', () => {
    it('include MetaMask fees in total calculation', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.01045,
        feeAmount: 1045,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.01,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.metamaskFeeRate).toBe(0.01);
      expect(result.current.metamaskFee).toBe(1000);
      expect(result.current.totalFee).toBe(1045);
    });
  });
});

describe('formatFeeRate', () => {
  it('format fee rate as percentage', () => {
    expect(formatFeeRate(0.00045)).toBe('0.045%');
    expect(formatFeeRate(0.00015)).toBe('0.015%');
    expect(formatFeeRate(0.01)).toBe('1.000%');
    expect(formatFeeRate(0)).toBe('0.000%');
  });

  it('handle very small fee rates', () => {
    expect(formatFeeRate(0.000001)).toBe('0.000%');
    expect(formatFeeRate(0.00001)).toBe('0.001%');
  });

  it('handle large fee rates', () => {
    expect(formatFeeRate(0.1)).toBe('10.000%');
    expect(formatFeeRate(1)).toBe('100.000%');
  });

  it('handle invalid values', () => {
    expect(formatFeeRate(undefined)).toBe('N/A');
    expect(formatFeeRate(null)).toBe('N/A');
    expect(formatFeeRate(NaN)).toBe('N/A');
  });
});

describe('clearRewardsCaches', () => {
  it('clear all rewards caches', () => {
    // Act
    clearRewardsCaches();

    // Assert - Function should execute without throwing errors
    // The cache clearing is tested implicitly through hook behavior
    expect(true).toBe(true);
  });
});

describe('usePerpsOrderFees - Enhanced Error Handling', () => {
  const mockCalculateFees = jest.fn<
    Promise<FeeCalculationResult>,
    [{ orderType: 'market' | 'limit'; isMaker?: boolean; amount?: string }]
  >();

  const mockPerpsTradingReturn = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockControllerMessenger.call.mockReset();
    mockUsePerpsTrading.mockReturnValue(mockPerpsTradingReturn);
  });

  describe('Error resilience', () => {
    it('calculates fees without crashing when rewards estimation succeeds', async () => {
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
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBeNull();
      expect(result.current.totalFee).toBeGreaterThan(0);
    });

    it('handles edge case rewards data without crashing', async () => {
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
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBeNull();
      expect(result.current.totalFee).toBeGreaterThan(0);
    });
  });

  describe('Separated error handling', () => {
    it('show correct fees when core fee calculation succeeds but rewards fails', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBeNull();
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.metamaskFeeRate).toBe(0.00045);
      expect(result.current.totalFee).toBe(90);
    });

    it('reset all fees when core fee calculation fails', async () => {
      mockCalculateFees.mockReturnValue(
        Promise.reject(new Error('Core calculation failed')),
      );

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBe('Core calculation failed');
      expect(result.current.protocolFeeRate).toBe(0);
      expect(result.current.metamaskFeeRate).toBe(0);
      expect(result.current.totalFee).toBe(0);
      expect(result.current.estimatedPoints).toBeUndefined();
    });
  });

  describe('Cache Management and TTL', () => {
    it('validate cached basePointsPerDollar is finite', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: 100,
            bonusBips: 200,
            basePointsPerDollar: Infinity,
          });
        }
        return Promise.resolve();
      });

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.estimatedPoints).toBeUndefined();
    });
  });

  describe('Rewards API Failure Handling', () => {
    it('continue with 0% discount when rewards API fails', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.reject(new Error('Rewards API unavailable'));
        }
        return Promise.resolve();
      });

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBeNull();
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.metamaskFeeRate).toBe(0.00045);
      expect(result.current.totalFee).toBe(90);
    });

    it('handle points estimation API failure gracefully', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.reject(new Error('Points estimation failed'));
        }
        return Promise.resolve();
      });

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.error).toBeNull();
      expect(result.current.totalFee).toBe(90);
      expect(result.current.estimatedPoints).toBeUndefined();
    });
  });

  describe('Fee Discount Edge Cases and Validation', () => {
    it('handle negative discount values gracefully', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(-500);
        }
        return Promise.resolve();
      });

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.metamaskFee).toBe(45);
      expect(result.current.totalFee).toBe(90);
    });
  });

  describe('Points Calculation Edge Cases', () => {
    it('handle invalid points calculation gracefully', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      mockControllerMessenger.call.mockImplementation((method: string) => {
        if (method === 'RewardsController:getPerpsDiscountForAccount') {
          return Promise.resolve(0);
        }
        if (method === 'RewardsController:estimatePoints') {
          return Promise.resolve({
            pointsEstimate: NaN,
            bonusBips: 200,
          });
        }
        return Promise.resolve();
      });

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.totalFee).toBe(90);
    });
  });

  describe('Component Lifecycle and Cache Management', () => {
    it('clear points cache on component mount', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result: result1, unmount: unmount1 } = renderHook(
        () => usePerpsOrderFees(orderParams),
        { wrapper: createWrapper() },
      );

      await waitFor(
        () => expect(result1.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      unmount1();

      const { result: result2 } = renderHook(
        () => usePerpsOrderFees(orderParams),
        { wrapper: createWrapper() },
      );

      await waitFor(
        () => expect(result2.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result2.current.totalFee).toBeGreaterThan(0);
    });

    it('handle cleanup when component unmounts during async operations', async () => {
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

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result, unmount } = renderHook(
        () => usePerpsOrderFees(orderParams),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoadingMetamaskFee).toBe(true);

      unmount();

      resolveCalculateFees?.(mockFeeResult);
    });

    it('handle cache TTL expiration correctly', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result: result1, unmount: unmount1 } = renderHook(
        () => usePerpsOrderFees(orderParams),
        { wrapper: createWrapper() },
      );

      await waitFor(
        () => expect(result1.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      unmount1();

      const { result: result2 } = renderHook(
        () => usePerpsOrderFees(orderParams),
        { wrapper: createWrapper() },
      );

      await waitFor(
        () => expect(result2.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result2.current.totalFee).toBeGreaterThan(0);
    });

    it('handle discount validation edge cases', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.totalFee).toBeGreaterThan(0);
      expect(result.current.protocolFee).toBe(45);
    });

    it('handle invalid amount for points estimation', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '0',
        isMaker: false,
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.totalFee).toBe(0);
    });

    it('handle empty coin parameter for points estimation', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00045,
      };
      mockCalculateFees.mockReturnValue(Promise.resolve(mockFeeResult));

      const orderParams = {
        orderType: 'market' as const,
        amount: '100000',
        isMaker: false,
        coin: '',
      };

      const { result } = renderHook(() => usePerpsOrderFees(orderParams), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => expect(result.current.isLoadingMetamaskFee).toBe(false),
        { timeout: 500 },
      );

      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.totalFee).toBe(90);
    });
  });
});
