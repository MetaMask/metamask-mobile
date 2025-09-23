import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useContext } from 'react';
import { usePerpsDepositStatus } from './usePerpsDepositStatus';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(() => ({
    toastRef: { current: { showToast: jest.fn() } },
  })),
}));

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: jest.fn(() => ({
    clearDepositResult: jest.fn(),
  })),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger');

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('usePerpsDepositStatus', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseContext = useContext as jest.MockedFunction<typeof useContext>;
  const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
    typeof usePerpsTrading
  >;
  const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup DevLogger mock
    mockDevLogger.log = jest.fn();

    // Default Redux state - no deposit in progress
    mockUseSelector.mockImplementation(
      (selector: (state: RootState) => unknown) => {
        const mockState = {
          engine: {
            backgroundState: {
              PerpsController: {
                depositInProgress: false,
                lastDepositResult: null,
              },
            },
          },
        } as unknown as RootState;
        return selector(mockState);
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should return depositInProgress state', () => {
      // Test false state
      const { result, rerender } = renderHook(() => usePerpsDepositStatus());
      expect(result.current.depositInProgress).toBe(false);

      // Update to true state
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: true,
                  lastDepositResult: null,
                },
              },
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      rerender();
      expect(result.current.depositInProgress).toBe(true);
    });

    it('should handle successful deposit result', () => {
      const mockToastRef = { current: { showToast: jest.fn() } };
      const mockClearDepositResult = jest.fn();

      mockUseContext.mockReturnValue({
        toastRef: mockToastRef,
      });

      mockUsePerpsTrading.mockReturnValue({
        clearDepositResult: mockClearDepositResult,
        depositWithConfirmation: jest.fn(),
        placeOrder: jest.fn(),
        cancelOrder: jest.fn(),
        closePosition: jest.fn(),
        getMarkets: jest.fn(),
        getPositions: jest.fn(),
        getAccountState: jest.fn(),
        subscribeToPrices: jest.fn(),
        subscribeToPositions: jest.fn(),
        subscribeToOrderFills: jest.fn(),
        withdraw: jest.fn(),
        calculateLiquidationPrice: jest.fn(),
        calculateMaintenanceMargin: jest.fn(),
        getMaxLeverage: jest.fn(),
        updatePositionTPSL: jest.fn(),
        calculateFees: jest.fn(),
        validateOrder: jest.fn(),
        validateClosePosition: jest.fn(),
        validateWithdrawal: jest.fn(),
        getOrderFills: jest.fn(),
        getOrders: jest.fn(),
        getFunding: jest.fn(),
      } as ReturnType<typeof usePerpsTrading>);

      // Start with no result
      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Update to show successful deposit
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: false,
                  lastDepositResult: {
                    success: true,
                    txHash: '0xtransaction123',
                  },
                },
              },
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      rerender();

      // Toast should have been shown
      expect(mockToastRef.current.showToast).toHaveBeenCalled();
    });

    it('should handle failed deposit result', () => {
      const mockToastRef = { current: { showToast: jest.fn() } };
      const mockClearDepositResult = jest.fn();

      mockUseContext.mockReturnValue({
        toastRef: mockToastRef,
      });

      mockUsePerpsTrading.mockReturnValue({
        clearDepositResult: mockClearDepositResult,
        depositWithConfirmation: jest.fn(),
        placeOrder: jest.fn(),
        cancelOrder: jest.fn(),
        closePosition: jest.fn(),
        getMarkets: jest.fn(),
        getPositions: jest.fn(),
        getAccountState: jest.fn(),
        subscribeToPrices: jest.fn(),
        subscribeToPositions: jest.fn(),
        subscribeToOrderFills: jest.fn(),
        withdraw: jest.fn(),
        calculateLiquidationPrice: jest.fn(),
        calculateMaintenanceMargin: jest.fn(),
        getMaxLeverage: jest.fn(),
        updatePositionTPSL: jest.fn(),
        calculateFees: jest.fn(),
        validateOrder: jest.fn(),
        validateClosePosition: jest.fn(),
        validateWithdrawal: jest.fn(),
        getOrderFills: jest.fn(),
        getOrders: jest.fn(),
        getFunding: jest.fn(),
      } as ReturnType<typeof usePerpsTrading>);

      // Start with no result
      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Update to show failed deposit
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: false,
                  lastDepositResult: {
                    success: false,
                    error: 'Transaction failed',
                  },
                },
              },
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      rerender();

      // Toast should have been shown
      expect(mockToastRef.current.showToast).toHaveBeenCalled();
    });

    it('should handle missing PerpsController state gracefully', () => {
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {},
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      const { result } = renderHook(() => usePerpsDepositStatus());

      // Should default to false when state is missing
      expect(result.current.depositInProgress).toBe(false);
    });

    it('should handle missing toast context gracefully', () => {
      mockUseContext.mockReturnValue({
        toastRef: null,
      });

      // Update to trigger a toast
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: false,
                  lastDepositResult: {
                    success: true,
                    txHash: '0xtx',
                  },
                },
              },
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      // Should not crash
      expect(() => {
        renderHook(() => usePerpsDepositStatus());
      }).not.toThrow();
    });
  });
});
