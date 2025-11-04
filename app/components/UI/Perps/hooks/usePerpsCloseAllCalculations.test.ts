import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsCloseAllCalculations } from './usePerpsCloseAllCalculations';
import Engine from '../../../../core/Engine';
import type { Position, FeeCalculationResult } from '../controllers/types';
import type { EstimatedPointsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

/**
 * Note: This test file contains act() warnings from React Testing Library.
 * These warnings occur because the hook uses useEffect with async operations
 * that trigger state updates. The tests properly use waitFor() to handle
 * async behavior, and all assertions pass. This is expected behavior for
 * hooks that perform calculations asynchronously in response to prop changes.
 */

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      calculateFees: jest.fn(),
    },
    RewardsController: {
      estimatePoints: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Test data helpers
const createMockPosition = (overrides: Partial<Position> = {}): Position => ({
  coin: 'BTC',
  size: '0.5',
  entryPrice: '50000',
  positionValue: '25000',
  unrealizedPnl: '100',
  marginUsed: '1000',
  leverage: { type: 'cross', value: 25 },
  liquidationPrice: '48000',
  maxLeverage: 50,
  returnOnEquity: '10',
  cumulativeFunding: {
    allTime: '0',
    sinceOpen: '0',
    sinceChange: '0',
  },
  takeProfitPrice: undefined,
  stopLossPrice: undefined,
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

const createMockFeeResult = (
  overrides: Partial<FeeCalculationResult> = {},
): FeeCalculationResult => ({
  feeRate: 0.011,
  feeAmount: 275,
  protocolFeeRate: 0.001,
  protocolFeeAmount: 25,
  metamaskFeeRate: 0.01,
  metamaskFeeAmount: 250,
  ...overrides,
});

const createMockPointsResult = (
  overrides: Partial<EstimatedPointsDto> = {},
): EstimatedPointsDto => ({
  pointsEstimate: 100,
  bonusBips: 1000,
  ...overrides,
});

describe('usePerpsCloseAllCalculations', () => {
  const mockCalculateFees = Engine.context.PerpsController
    .calculateFees as jest.Mock;
  const mockEstimatePoints = Engine.context.RewardsController
    .estimatePoints as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default selector mocks
    let selectorCallCount = 0;
    mockUseSelector.mockImplementation(() => {
      selectorCallCount++;
      if (selectorCallCount % 2 === 1) {
        return '0x1234567890123456789012345678901234567890'; // selectedAddress
      }
      return '0xa4b1'; // chainId
    });

    // Setup default Engine mock responses
    mockCalculateFees.mockResolvedValue(createMockFeeResult());
    mockEstimatePoints.mockResolvedValue(createMockPointsResult());
  });

  describe('Initial State', () => {
    it('returns zero values for empty positions array', () => {
      // Arrange
      const positions: Position[] = [];
      const priceData = {};

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalMargin).toBe(0);
      expect(result.current.totalPnl).toBe(0);
      expect(result.current.totalFees).toBe(0);
      expect(result.current.receiveAmount).toBe(0);
      expect(result.current.totalEstimatedPoints).toBe(0);
      expect(result.current.avgFeeDiscountPercentage).toBe(0);
      expect(result.current.avgBonusBips).toBe(0);
      expect(result.current.avgMetamaskFeeRate).toBe(0);
      expect(result.current.avgProtocolFeeRate).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.shouldShowRewards).toBe(false);
    });

    it('initializes loading state correctly', () => {
      // Arrange
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert - Should start calculating
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Total Margin Calculation', () => {
    it('calculates total margin including P&L for single position', () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: '1000',
          unrealizedPnl: '100',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalMargin).toBe(1100); // 1000 + 100
    });

    it('calculates total margin for multiple positions', () => {
      // Arrange
      const positions = [
        createMockPosition({
          coin: 'BTC',
          marginUsed: '1000',
          unrealizedPnl: '100',
        }),
        createMockPosition({
          coin: 'ETH',
          marginUsed: '500',
          unrealizedPnl: '-50',
        }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalMargin).toBe(1550); // (1000+100) + (500-50)
    });

    it('handles negative P&L correctly', () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: '1000',
          unrealizedPnl: '-200',
        }),
      ];
      const priceData = { BTC: { price: '48000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalMargin).toBe(800); // 1000 - 200
    });
  });

  describe('Total P&L Calculation', () => {
    it('calculates total P&L for single position', () => {
      // Arrange
      const positions = [
        createMockPosition({
          unrealizedPnl: '100',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalPnl).toBe(100);
    });

    it('calculates total P&L for multiple positions', () => {
      // Arrange
      const positions = [
        createMockPosition({ coin: 'BTC', unrealizedPnl: '100' }),
        createMockPosition({ coin: 'ETH', unrealizedPnl: '50' }),
        createMockPosition({ coin: 'SOL', unrealizedPnl: '-25' }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
        SOL: { price: '100' },
      };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalPnl).toBe(125); // 100 + 50 - 25
    });
  });

  describe('Fee Calculation', () => {
    it('calculates fees for single position using current market price', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          coin: 'BTC',
          size: '0.5',
          entryPrice: '50000',
        }),
      ];
      const priceData = { BTC: { price: '52000' } };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 286 }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: (0.5 * 52000).toString(), // Uses current price, not entry price
        coin: 'BTC',
      });
      expect(result.current.totalFees).toBe(286);
    });

    it('falls back to entry price when current price unavailable', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          coin: 'BTC',
          size: '0.5',
          entryPrice: '50000',
        }),
      ];
      const priceData = {}; // No price data

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: (0.5 * 50000).toString(), // Uses entry price as fallback
        coin: 'BTC',
      });
    });

    it('aggregates fees across multiple positions', async () => {
      // Arrange
      const positions = [
        createMockPosition({ coin: 'BTC', size: '0.5' }),
        createMockPosition({ coin: 'ETH', size: '10' }),
      ];
      const priceData = {
        BTC: { price: '52000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees
        .mockResolvedValueOnce(createMockFeeResult({ feeAmount: 286 }))
        .mockResolvedValueOnce(createMockFeeResult({ feeAmount: 330 }));

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.totalFees).toBe(616); // 286 + 330
    });

    it('handles fee calculation errors gracefully', async () => {
      // Arrange
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockRejectedValue(new Error('Fee calculation failed'));

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasError).toBe(true);
      expect(result.current.totalFees).toBe(0);
    });
  });

  describe('Points Estimation', () => {
    it('estimates points for single position with correct coin parameter', async () => {
      // Arrange
      const positions = [createMockPosition({ coin: 'BTC' })];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 275 }),
      );
      mockEstimatePoints.mockResolvedValue(
        createMockPointsResult({ pointsEstimate: 150, bonusBips: 1000 }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockEstimatePoints).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'PERPS',
          activityContext: expect.objectContaining({
            perpsContext: expect.objectContaining({
              type: 'CLOSE_POSITION',
              coin: 'BTC',
              usdFeeValue: '275',
            }),
          }),
        }),
      );
      expect(result.current.totalEstimatedPoints).toBe(150);
      expect(result.current.avgBonusBips).toBe(1000);
    });

    it('aggregates points across multiple positions with different coins', async () => {
      // Arrange
      const positions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 275 }),
      );
      mockEstimatePoints
        .mockResolvedValueOnce(
          createMockPointsResult({ pointsEstimate: 150, bonusBips: 1000 }),
        )
        .mockResolvedValueOnce(
          createMockPointsResult({ pointsEstimate: 100, bonusBips: 1500 }),
        );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.totalEstimatedPoints).toBe(250); // 150 + 100

      // Weighted average bonus: (150*1000 + 100*1500) / 250 = 1200
      expect(result.current.avgBonusBips).toBe(1200);
    });

    it('handles points estimation errors without failing entire calculation', async () => {
      // Arrange
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 275 }),
      );
      mockEstimatePoints.mockRejectedValue(new Error('Points API failed'));

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasError).toBe(false); // Points error doesn't fail calculation
      expect(result.current.totalFees).toBeGreaterThan(0); // Fees still calculated
      expect(result.current.totalEstimatedPoints).toBe(0); // No points
      expect(result.current.shouldShowRewards).toBe(false);
    });

    it('sets shouldShowRewards to true when at least one position has valid points', async () => {
      // Arrange
      const positions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees.mockResolvedValue(createMockFeeResult());
      mockEstimatePoints
        .mockResolvedValueOnce(createMockPointsResult({ pointsEstimate: 150 }))
        .mockRejectedValueOnce(new Error('Failed')); // Second one fails

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.shouldShowRewards).toBe(true); // One valid result
    });

    it('sets shouldShowRewards to false when all points are zero', async () => {
      // Arrange
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockResolvedValue(createMockFeeResult());
      mockEstimatePoints.mockResolvedValue(
        createMockPointsResult({ pointsEstimate: 0 }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.shouldShowRewards).toBe(false);
    });
  });

  describe('Average Fee Rates', () => {
    it('calculates weighted average fee rates for multiple positions', async () => {
      // Arrange
      const positions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees
        .mockResolvedValueOnce(
          createMockFeeResult({
            feeAmount: 300,
            metamaskFeeRate: 0.01,
            protocolFeeRate: 0.001,
          }),
        )
        .mockResolvedValueOnce(
          createMockFeeResult({
            feeAmount: 200,
            metamaskFeeRate: 0.008,
            protocolFeeRate: 0.0012,
          }),
        );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Weighted average MetaMask fee: (300*0.01 + 200*0.008) / 500 = 0.0092
      expect(result.current.avgMetamaskFeeRate).toBeCloseTo(0.0092, 4);

      // Weighted average protocol fee: (300*0.001 + 200*0.0012) / 500 = 0.00108
      expect(result.current.avgProtocolFeeRate).toBeCloseTo(0.00108, 5);
    });

    it('returns zero average rates for empty positions', () => {
      // Arrange
      const positions: Position[] = [];
      const priceData = {};

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.avgMetamaskFeeRate).toBe(0);
      expect(result.current.avgProtocolFeeRate).toBe(0);
    });
  });

  describe('Receive Amount Calculation', () => {
    it('calculates receive amount as margin minus fees', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: '1000',
          unrealizedPnl: '100',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 50 }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.receiveAmount).toBe(1050); // (1000 + 100) - 50
    });

    it('handles negative receive amount when fees exceed margin', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: '100',
          unrealizedPnl: '-50',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 100 }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.receiveAmount).toBe(-50); // (100 - 50) - 100
    });
  });

  describe('Loading and Error States', () => {
    it('sets loading to false after successful calculation', async () => {
      // Arrange
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets hasError to true when fee calculation fails', async () => {
      // Arrange
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockRejectedValue(new Error('Network error'));

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });
    });

    it('sets hasError to true when account information missing', async () => {
      // Arrange
      mockUseSelector.mockReturnValue(null); // No selected address
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });
    });

    it('sets hasError to true when some position calculations fail', async () => {
      // Arrange
      const positions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees
        .mockResolvedValueOnce(createMockFeeResult()) // First succeeds
        .mockRejectedValueOnce(new Error('Failed')); // Second fails

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles positions with zero size', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          size: '0',
          marginUsed: '0',
          unrealizedPnl: '0',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: '0',
        coin: 'BTC',
      });
    });

    it('handles positions with negative size (short positions)', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          size: '-0.5',
          entryPrice: '50000',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: (0.5 * 51000).toString(), // Uses absolute value
        coin: 'BTC',
      });
    });

    it('handles invalid numeric values gracefully', () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: 'invalid',
          unrealizedPnl: 'NaN',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert - Should not crash
      expect(result.current.totalMargin).toBe(0);
      expect(result.current.totalPnl).toBe(0);
    });

    it('does not recalculate when positions array changes due to optimization', async () => {
      // Arrange - The hook has an optimization to prevent recalculation when
      // positions change (to avoid slow points API calls on WebSocket updates)
      const initialPositions = [createMockPosition({ coin: 'BTC' })];
      const updatedPositions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };

      // Act
      const { result, rerender } = renderHook(
        ({ positions }) =>
          usePerpsCloseAllCalculations({ positions, priceData }),
        {
          initialProps: { positions: initialPositions },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockCalculateFees.mock.calls.length;

      // Act - Change positions
      rerender({ positions: updatedPositions });

      // Small delay to ensure no recalculation triggered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - Should not recalculate due to hasValidResultsRef optimization
      expect(mockCalculateFees.mock.calls.length).toBe(initialCallCount);
    });

    it('does not recalculate when only price data changes', async () => {
      // Arrange
      const positions = [createMockPosition()];
      const initialPriceData = { BTC: { price: '51000' } };
      const updatedPriceData = { BTC: { price: '52000' } };

      // Act
      const { result, rerender } = renderHook(
        ({ priceData }) =>
          usePerpsCloseAllCalculations({ positions, priceData }),
        {
          initialProps: { priceData: initialPriceData },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCountAfterInitial = mockCalculateFees.mock.calls.length;

      // Act - Change price data
      rerender({ priceData: updatedPriceData });

      // Small delay to ensure no recalculation triggered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - Should not recalculate
      expect(mockCalculateFees.mock.calls.length).toBe(callCountAfterInitial);
    });
  });

  describe('Account and Chain Requirements', () => {
    it('handles missing chain ID', async () => {
      // Arrange
      let selectorCallCount = 0;
      mockUseSelector.mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 2 === 1) {
          return '0x1234567890123456789012345678901234567890'; // Valid address
        }
        return null; // Missing chainId
      });
      const positions = [createMockPosition()];
      const priceData = { BTC: { price: '51000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasError).toBe(true);
    });
  });
});
