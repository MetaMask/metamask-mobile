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
      getPerpsDiscountForAccount: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Test data helpers
const createMockPosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'BTC',
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
  const mockGetPerpsDiscount = Engine.context.RewardsController
    .getPerpsDiscountForAccount as jest.Mock;

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
    mockGetPerpsDiscount.mockResolvedValue(0); // Default: no discount
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
      expect(result.current.totalFees).toBeUndefined();
      expect(result.current.receiveAmount).toBe(0);
      expect(result.current.totalEstimatedPoints).toBeUndefined();
      expect(result.current.avgFeeDiscountPercentage).toBeUndefined();
      expect(result.current.avgBonusBips).toBeUndefined();
      expect(result.current.avgMetamaskFeeRate).toBeUndefined();
      expect(result.current.avgProtocolFeeRate).toBeUndefined();
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
    it('calculates total margin excluding P&L for single position', () => {
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
      expect(result.current.totalMargin).toBe(1000); // Only marginUsed, PnL excluded
    });

    it('calculates total margin for multiple positions', () => {
      // Arrange
      const positions = [
        createMockPosition({
          symbol: 'BTC',
          marginUsed: '1000',
          unrealizedPnl: '100',
        }),
        createMockPosition({
          symbol: 'ETH',
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
      expect(result.current.totalMargin).toBe(1500); // 1000 + 500, PnL excluded
    });

    it('excludes negative P&L from margin calculation', () => {
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
      expect(result.current.totalMargin).toBe(1000); // Only marginUsed, negative PnL excluded
    });

    it('excludes positive P&L from margin calculation', () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: '500',
          unrealizedPnl: '250',
        }),
      ];
      const priceData = { BTC: { price: '52000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalMargin).toBe(500); // Only marginUsed, positive PnL excluded
      expect(result.current.totalPnl).toBe(250); // PnL is tracked separately
    });

    it('calculates total margin with zero P&L', () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: '800',
          unrealizedPnl: '0',
        }),
      ];
      const priceData = { BTC: { price: '50000' } };

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.totalMargin).toBe(800); // Only marginUsed
      expect(result.current.totalPnl).toBe(0);
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
        createMockPosition({ symbol: 'BTC', unrealizedPnl: '100' }),
        createMockPosition({ symbol: 'ETH', unrealizedPnl: '50' }),
        createMockPosition({ symbol: 'SOL', unrealizedPnl: '-25' }),
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
          symbol: 'BTC',
          size: '0.5',
          entryPrice: '50000',
        }),
      ];
      const priceData = { BTC: { price: '52000' } };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({
          feeAmount: 286, // Base total (before discount calculation)
          metamaskFeeAmount: 261, // MetaMask component
          protocolFeeAmount: 25, // Protocol component
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
      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: (0.5 * 52000).toString(), // Uses current price, not entry price
        symbol: 'BTC',
      });
      // Total recalculated from components (no discount): 261 + 25 = 286
      expect(result.current.totalFees).toBe(286);
    });

    it('falls back to entry price when current price unavailable', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          symbol: 'BTC',
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
        symbol: 'BTC',
      });
    });

    it('aggregates fees across multiple positions', async () => {
      // Arrange
      const positions = [
        createMockPosition({ symbol: 'BTC', size: '0.5' }),
        createMockPosition({ symbol: 'ETH', size: '10' }),
      ];
      const priceData = {
        BTC: { price: '52000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees
        .mockResolvedValueOnce(
          createMockFeeResult({
            feeAmount: 286,
            metamaskFeeAmount: 261,
            protocolFeeAmount: 25,
          }),
        )
        .mockResolvedValueOnce(
          createMockFeeResult({
            feeAmount: 330,
            metamaskFeeAmount: 305,
            protocolFeeAmount: 25,
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
      // Total recalculated from components: (261+25) + (305+25) = 616
      expect(result.current.totalFees).toBe(616);
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

  describe('Fee Discount', () => {
    it('applies account-level fee discount to MetaMask fees', async () => {
      // Arrange: 10% discount (1000 basis points)
      mockGetPerpsDiscount.mockResolvedValue(1000);

      const positions = [createMockPosition({ symbol: 'BTC' })];
      const priceData = { BTC: { price: '51000' } };

      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({
          feeAmount: 275, // Base total fee (before discount)
          metamaskFeeRate: 0.01, // 1% MetaMask fee rate
          metamaskFeeAmount: 250, // Base MetaMask fee
          protocolFeeRate: 0.001, // Protocol fee rate (not discounted)
          protocolFeeAmount: 25, // Protocol fee (not discounted)
        }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Discount applied: 250 * (1 - 1000/10000) = 250 * 0.9 = 225 (MetaMask fee)
      // Total fee: 225 (discounted MetaMask) + 25 (protocol) = 250
      expect(result.current.totalFees).toBeCloseTo(250, 1);
      expect(result.current.avgFeeDiscountPercentage).toBe(10); // 1000 bips / 100 = 10%
      expect(mockGetPerpsDiscount).toHaveBeenCalledTimes(1);
    });

    it('applies discount to multiple positions', async () => {
      // Arrange: 65% discount (6500 basis points)
      mockGetPerpsDiscount.mockResolvedValue(6500);

      const positions = [
        createMockPosition({ symbol: 'BTC' }),
        createMockPosition({ symbol: 'ETH' }),
      ];
      const priceData = { BTC: { price: '51000' }, ETH: { price: '3000' } };

      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({
          feeAmount: 100,
          metamaskFeeAmount: 50,
          protocolFeeAmount: 50,
        }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Each position: 50 * (1 - 6500/10000) = 50 * 0.35 = 17.5 (MetaMask fee)
      // Per position total: 17.5 + 50 = 67.5
      // Two positions: 67.5 * 2 = 135
      expect(result.current.totalFees).toBeCloseTo(135, 1);
      expect(result.current.avgFeeDiscountPercentage).toBe(65);
    });

    it('handles discount fetch errors gracefully', async () => {
      // Arrange: Discount API fails
      mockGetPerpsDiscount.mockRejectedValue(new Error('API error'));

      const positions = [createMockPosition({ symbol: 'BTC' })];
      const priceData = { BTC: { price: '51000' } };

      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 275 }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should continue with no discount on error (undefined means 0% in this case)
      expect(result.current.totalFees).toBe(275);
      expect(result.current.avgFeeDiscountPercentage).toBeUndefined();
      expect(result.current.hasError).toBe(false); // Don't fail entire calculation
    });

    it('calculates original fee rate correctly with discount', async () => {
      // Arrange: 50% discount (5000 basis points)
      mockGetPerpsDiscount.mockResolvedValue(5000);

      const positions = [createMockPosition({ symbol: 'BTC' })];
      const priceData = { BTC: { price: '51000' } };

      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({
          feeAmount: 275,
          metamaskFeeRate: 0.01, // Base rate
          metamaskFeeAmount: 250,
          protocolFeeRate: 0.001,
          protocolFeeAmount: 25,
        }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Discounted rate: 0.01 * (1 - 5000/10000) = 0.01 * 0.5 = 0.005
      expect(result.current.avgMetamaskFeeRate).toBeCloseTo(0.005, 4);

      // Original rate: 0.005 / (1 - 5000/10000) = 0.005 / 0.5 = 0.01
      expect(result.current.avgOriginalMetamaskFeeRate).toBeCloseTo(0.01, 4);
    });

    it('guards against 100% discount (division by zero)', async () => {
      // Arrange: 100% discount (10000 basis points) - theoretical edge case
      mockGetPerpsDiscount.mockResolvedValue(10000);

      const positions = [createMockPosition({ symbol: 'BTC' })];
      const priceData = { BTC: { price: '51000' } };

      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({
          feeAmount: 275,
          metamaskFeeRate: 0.01,
          metamaskFeeAmount: 250,
        }),
      );

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should not crash with Infinity/NaN
      expect(result.current.avgOriginalMetamaskFeeRate).toBeDefined();
      expect(Number.isFinite(result.current.avgOriginalMetamaskFeeRate)).toBe(
        true,
      );
    });
  });

  describe('Points Estimation', () => {
    it('estimates points for single position with correct coin parameter', async () => {
      // Arrange
      const positions = [createMockPosition({ symbol: 'BTC' })];
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
      // Now uses batch API format (array of positions)
      // Note: EstimatePerpsContextDto uses 'coin' field (external API terminology)
      expect(mockEstimatePoints).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'PERPS',
          activityContext: expect.objectContaining({
            perpsContext: [
              {
                type: 'CLOSE_POSITION',
                coin: 'BTC', // External API uses 'coin'
                usdFeeValue: '275',
              },
            ],
          }),
        }),
      );
      // Batch API returns aggregated total, use directly (not summed)
      expect(result.current.totalEstimatedPoints).toBe(150);
      expect(result.current.avgBonusBips).toBe(1000);
    });

    it('aggregates points across multiple positions with different coins', async () => {
      // Arrange
      const positions = [
        createMockPosition({ symbol: 'BTC' }),
        createMockPosition({ symbol: 'ETH' }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({ feeAmount: 275 }),
      );
      // Batch API returns single aggregated response for all positions
      mockEstimatePoints.mockResolvedValue(
        createMockPointsResult({
          pointsEstimate: 250, // Total for both positions
          bonusBips: 1200, // Average bonus
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
      // Batch API returns aggregated total (not per-position)
      expect(result.current.totalEstimatedPoints).toBe(250);
      expect(result.current.avgBonusBips).toBe(1200);
      expect(mockEstimatePoints).toHaveBeenCalledTimes(1); // Single batch call
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
      expect(result.current.totalEstimatedPoints).toBeUndefined(); // No points when API fails
      expect(result.current.shouldShowRewards).toBe(false);
    });

    it('sets shouldShowRewards to true when at least one position has valid points', async () => {
      // Arrange
      const positions = [
        createMockPosition({ symbol: 'BTC' }),
        createMockPosition({ symbol: 'ETH' }),
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
        createMockPosition({ symbol: 'BTC' }),
        createMockPosition({ symbol: 'ETH' }),
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
            metamaskFeeAmount: 270, // Component for weighting
            protocolFeeRate: 0.001,
            protocolFeeAmount: 30,
          }),
        )
        .mockResolvedValueOnce(
          createMockFeeResult({
            feeAmount: 200,
            metamaskFeeRate: 0.008,
            metamaskFeeAmount: 180, // Component for weighting
            protocolFeeRate: 0.0012,
            protocolFeeAmount: 20,
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

      // Total fees: (270+30) + (180+20) = 500
      // Weighted average MetaMask fee rate uses total fees as weights:
      // (300*0.01 + 200*0.008) / 500 = 0.0092
      expect(result.current.avgMetamaskFeeRate).toBeCloseTo(0.0092, 4);

      // Weighted average protocol fee rate uses total fees as weights:
      // (300*0.001 + 200*0.0012) / 500 = 0.00108
      expect(result.current.avgProtocolFeeRate).toBeCloseTo(0.00108, 5);
    });

    it('returns undefined average rates for empty positions', () => {
      // Arrange
      const positions: Position[] = [];
      const priceData = {};

      // Act
      const { result } = renderHook(() =>
        usePerpsCloseAllCalculations({ positions, priceData }),
      );

      // Assert
      expect(result.current.avgMetamaskFeeRate).toBeUndefined();
      expect(result.current.avgProtocolFeeRate).toBeUndefined();
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
        createMockFeeResult({
          feeAmount: 50,
          metamaskFeeAmount: 25,
          protocolFeeAmount: 25,
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
      // Total fee recalculated: 25 + 25 = 50
      // Receive amount: 1000 (margin only, PnL excluded) - 50 (fees) = 950
      expect(result.current.receiveAmount).toBe(950);
      expect(result.current.totalPnl).toBe(100); // PnL tracked separately
    });

    it('returns zero receive amount when fees equal margin', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          marginUsed: '100',
          unrealizedPnl: '-50',
        }),
      ];
      const priceData = { BTC: { price: '51000' } };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({
          feeAmount: 100,
          metamaskFeeAmount: 75,
          protocolFeeAmount: 25,
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
      // Receive amount: 100 (margin only) - 100 (fees) = 0
      expect(result.current.receiveAmount).toBe(0);
      expect(result.current.totalPnl).toBe(-50); // PnL tracked separately
    });

    it('calculates receive amount excluding P&L for multiple positions', async () => {
      // Arrange
      const positions = [
        createMockPosition({
          symbol: 'BTC',
          marginUsed: '2000',
          unrealizedPnl: '300',
        }),
        createMockPosition({
          symbol: 'ETH',
          marginUsed: '1500',
          unrealizedPnl: '-100',
        }),
      ];
      const priceData = {
        BTC: { price: '51000' },
        ETH: { price: '3000' },
      };
      mockCalculateFees.mockResolvedValue(
        createMockFeeResult({
          feeAmount: 150,
          metamaskFeeAmount: 100,
          protocolFeeAmount: 50,
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
      // Total margin: 2000 + 1500 = 3500 (PnL excluded)
      // Total fees: 150 + 150 = 300 (two positions)
      // Receive amount: 3500 - 300 = 3200
      expect(result.current.totalMargin).toBe(3500);
      expect(result.current.totalPnl).toBe(200); // 300 - 100
      expect(result.current.totalFees).toBe(300);
      expect(result.current.receiveAmount).toBe(3200);
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
        createMockPosition({ symbol: 'BTC' }),
        createMockPosition({ symbol: 'ETH' }),
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
        symbol: 'BTC',
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
        symbol: 'BTC',
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

    it('DOES recalculate when positions array changes (reset freeze)', async () => {
      // Arrange - The freeze mechanism resets when positions change
      // This ensures accurate calculations for new positions
      const initialPositions = [createMockPosition({ symbol: 'BTC' })];
      const updatedPositions = [
        createMockPosition({ symbol: 'BTC' }),
        createMockPosition({ symbol: 'ETH' }),
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

      // Act - Change positions (add ETH position)
      rerender({ positions: updatedPositions });

      await waitFor(() => {
        // Should recalculate with new positions
        expect(mockCalculateFees.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      });

      // Assert - Freeze resets on position change, allowing recalculation
      expect(mockCalculateFees.mock.calls.length).toBe(initialCallCount + 2); // 1 BTC + 1 ETH
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
