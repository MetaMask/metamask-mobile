import { renderHook, act } from '@testing-library/react-native';
import { usePerpsDataMonitor } from './usePerpsDataMonitor';
import type { Order, Position } from '../controllers/types';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

// Mock stream hooks
const mockUsePerpsLiveOrders = jest.fn();
const mockUsePerpsLivePositions = jest.fn();

jest.mock('./stream', () => ({
  usePerpsLiveOrders: () => mockUsePerpsLiveOrders(),
  usePerpsLivePositions: () => mockUsePerpsLivePositions(),
}));

describe('usePerpsDataMonitor', () => {
  // Test data
  const mockBTCOrder: Order = {
    orderId: 'order-1',
    symbol: 'BTC',
    side: 'buy',
    orderType: 'market',
    size: '1.0',
    originalSize: '1.0',
    filledSize: '0.0',
    remainingSize: '1.0',
    price: '50000',
    status: 'open',
    timestamp: Date.now(),
    reduceOnly: false,
  };

  const mockETHOrder: Order = {
    orderId: 'order-2',
    symbol: 'ETH',
    side: 'sell',
    orderType: 'limit',
    size: '2.0',
    originalSize: '2.0',
    filledSize: '0.0',
    remainingSize: '2.0',
    price: '3000',
    status: 'open',
    timestamp: Date.now(),
    reduceOnly: false,
  };

  const mockBTCPosition: Position = {
    coin: 'BTC',
    size: '1.5',
    entryPrice: '49000',
    positionValue: '73500',
    unrealizedPnl: '1500',
    leverage: { type: 'isolated', value: 10 },
    marginUsed: '7350',
    liquidationPrice: '44100',
    maxLeverage: 40,
    returnOnEquity: '2.04',
    cumulativeFunding: {
      allTime: '0.05',
      sinceOpen: '0.02',
      sinceChange: '0.01',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  const mockETHPosition: Position = {
    coin: 'ETH',
    size: '-0.8',
    entryPrice: '3100',
    positionValue: '2480',
    unrealizedPnl: '-80',
    leverage: { type: 'cross', value: 5 },
    marginUsed: '496',
    liquidationPrice: '3410',
    maxLeverage: 25,
    returnOnEquity: '-3.23',
    cumulativeFunding: {
      allTime: '-0.12',
      sinceOpen: '-0.08',
      sinceChange: '-0.03',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockUsePerpsLiveOrders.mockReturnValue([]);
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => usePerpsDataMonitor());

      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.startMonitoring).toBeInstanceOf(Function);
      expect(result.current.cancelMonitoring).toBeInstanceOf(Function);
    });

    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePerpsDataMonitor());

      const firstStartMonitoring = result.current.startMonitoring;
      const firstCancelMonitoring = result.current.cancelMonitoring;

      rerender({});

      expect(result.current.startMonitoring).toBe(firstStartMonitoring);
      expect(result.current.cancelMonitoring).toBe(firstCancelMonitoring);
    });
  });

  describe('startMonitoring functionality', () => {
    it('sets isMonitoring to true when called', () => {
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      expect(result.current.isMonitoring).toBe(true);
    });

    it('logs monitoring start with DevLogger', () => {
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 5000,
          onDataDetected: mockCallback,
        });
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        {
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 5000,
        },
      );
    });

    it('uses default timeout of 10000ms when not specified', () => {
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        expect.objectContaining({
          timeoutMs: 10000,
        }),
      );
    });

    it('captures initial positions and order count', () => {
      // Arrange
      mockUsePerpsLiveOrders.mockReturnValue([mockBTCOrder]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'both',
          onDataDetected: mockCallback,
        });
      });

      // Assert - verify initial state is captured (implicit through behavior)
      expect(result.current.isMonitoring).toBe(true);
    });

    it('clears previous timeout when called multiple times', () => {
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Start first monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      // Start second monitoring (should clear first timeout)
      act(() => {
        result.current.startMonitoring({
          asset: 'ETH',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      expect(result.current.isMonitoring).toBe(true);
    });
  });

  describe('data detection - orders', () => {
    it('detects new orders for specific asset', () => {
      // Arrange - start with no orders
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate new order arrival
      mockUsePerpsLiveOrders.mockReturnValue([mockBTCOrder]);
      rerender({});

      // Assert
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
      expect(result.current.isMonitoring).toBe(false);
    });

    it('ignores orders for different assets', () => {
      // Arrange - start with no orders
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring for BTC
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate ETH order arrival (different asset)
      mockUsePerpsLiveOrders.mockReturnValue([mockETHOrder]);
      rerender({});

      // Assert - should not trigger callback
      expect(mockCallback).not.toHaveBeenCalled();
      expect(result.current.isMonitoring).toBe(true);
    });

    it('handles empty initial order state', () => {
      // Arrange - start with undefined orders (loading state)
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      // Orders still empty - should not trigger
      rerender({});
      expect(mockCallback).not.toHaveBeenCalled();

      // Now add order - should trigger
      mockUsePerpsLiveOrders.mockReturnValue([mockBTCOrder]);
      rerender({});

      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });

    it('logs detected data changes', () => {
      // Arrange
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring and detect change
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      mockUsePerpsLiveOrders.mockReturnValue([mockBTCOrder]);
      rerender({});

      // Assert
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: new_orders_detected, detected orders',
        {
          asset: 'BTC',
          monitor: 'orders',
          reason: 'new_orders_detected',
        },
      );
    });
  });

  describe('data detection - positions', () => {
    it('detects new position creation (none → position)', () => {
      // Arrange - start with no positions
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate new position creation
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Assert
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
      expect(result.current.isMonitoring).toBe(false);
    });

    it('detects position closure (position → none)', () => {
      // Arrange - start with existing position
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring (captures initial position)
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate position closure
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });
      rerender({});

      // Assert
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('detects position size changes', () => {
      // Arrange - start with existing position
      const initialPosition = { ...mockBTCPosition, size: '1.0' };
      const modifiedPosition = { ...mockBTCPosition, size: '2.0' };

      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [initialPosition],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate position size change
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [modifiedPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Assert
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('detects entry price changes', () => {
      // Arrange - start with existing position
      const initialPosition = { ...mockBTCPosition, entryPrice: '49000' };
      const modifiedPosition = { ...mockBTCPosition, entryPrice: '51000' };

      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [initialPosition],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate entry price change
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [modifiedPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Assert
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('ignores positions for different assets', () => {
      // Arrange - start with no positions
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring for BTC
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate ETH position creation (different asset)
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockETHPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Assert - should not trigger callback
      expect(mockCallback).not.toHaveBeenCalled();
      expect(result.current.isMonitoring).toBe(true);
    });
  });

  describe('combined monitoring (monitor: "both")', () => {
    it('detects orders changes when monitoring both', () => {
      // Arrange
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring both
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'both',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate order change
      mockUsePerpsLiveOrders.mockReturnValue([mockBTCOrder]);
      rerender({});

      // Assert
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });

    it('detects position changes when monitoring both', () => {
      // Arrange
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring both
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'both',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate position change
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Assert
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('calls back with first detected change type', () => {
      // Arrange - setup to detect both simultaneously
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring both
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'both',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate both changes at once (orders first in logic)
      mockUsePerpsLiveOrders.mockReturnValue([mockBTCOrder]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Assert - should call back with orders (first in detection logic)
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });
  });

  describe('timeout behavior', () => {
    it('clears monitoring state after timeout', () => {
      // Arrange
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring with custom timeout
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 5000,
          onDataDetected: mockCallback,
        });
      });

      expect(result.current.isMonitoring).toBe(true);

      // Act - advance time past timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Assert
      expect(result.current.isMonitoring).toBe(false);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('logs timeout event with DevLogger', () => {
      // Arrange
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring and trigger timeout
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 3000,
          onDataDetected: mockCallback,
        });
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Assert
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Timeout reached, stopping monitoring',
        {
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 3000,
        },
      );
    });

    it('does not call onDataDetected on timeout', () => {
      // Arrange
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring and timeout
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 1000,
          onDataDetected: mockCallback,
        });
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Assert
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('cancelMonitoring functionality', () => {
    it('resets all monitoring state', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      expect(result.current.isMonitoring).toBe(true);

      // Act - cancel monitoring
      act(() => {
        result.current.cancelMonitoring();
      });

      // Assert
      expect(result.current.isMonitoring).toBe(false);
    });

    it('clears timeout when called', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring with timeout
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 5000,
          onDataDetected: mockCallback,
        });
      });

      // Act - cancel before timeout
      act(() => {
        result.current.cancelMonitoring();
      });

      // Act - advance past original timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Assert - timeout should not have fired
      expect(DevLogger.log).not.toHaveBeenCalledWith(
        'usePerpsDataMonitor: Timeout reached, stopping monitoring',
        expect.any(Object),
      );
    });

    it('logs cancellation event', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start and cancel monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      act(() => {
        result.current.cancelMonitoring();
      });

      // Assert
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Cancelling data monitoring',
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('handles undefined positions gracefully', () => {
      // Arrange - undefined positions
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: undefined as Position[] | undefined,
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Should not crash
      rerender({});
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('prevents monitoring when orders are loading', () => {
      // Arrange - orders loaded as empty array initially
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring with loaded empty orders
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate orders becoming undefined (loading state)
      mockUsePerpsLiveOrders.mockReturnValue(undefined);
      rerender({});

      // Assert - should not detect changes while loading (undefined orders)
      expect(mockCallback).not.toHaveBeenCalled();

      // Act - orders become available again
      mockUsePerpsLiveOrders.mockReturnValue([mockBTCOrder]);
      rerender({});

      // Should now detect the new order
      expect(mockCallback).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });

    it('prevents monitoring when positions are loading', () => {
      // Arrange - positions loading
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Act - simulate position change while still loading
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: true,
      });
      rerender({});

      // Assert - should not detect changes while loading
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('handles position arrays with missing assets', () => {
      // Arrange - start with no positions
      mockUsePerpsLiveOrders.mockReturnValue([]);
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring for BTC
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'positions',
          onDataDetected: mockCallback,
        });
      });

      // Act - add positions for different assets only
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockETHPosition], // Only ETH, no BTC
        isInitialLoading: false,
      });
      rerender({});

      // Assert - should not trigger for different assets
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('cleanup and memory management', () => {
    it('clears timeout on unmount', () => {
      // Arrange
      const { result, unmount } = renderHook(() => usePerpsDataMonitor());
      const mockCallback = jest.fn();

      // Act - start monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 5000,
          onDataDetected: mockCallback,
        });
      });

      // Act - unmount component
      unmount();

      // Act - advance time past timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Assert - timeout should not fire after unmount
      expect(DevLogger.log).not.toHaveBeenCalledWith(
        'usePerpsDataMonitor: Timeout reached, stopping monitoring',
        expect.any(Object),
      );
    });

    it('handles multiple startMonitoring calls correctly', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDataMonitor());
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      // Act - start first monitoring
      act(() => {
        result.current.startMonitoring({
          asset: 'BTC',
          monitor: 'orders',
          timeoutMs: 3000,
          onDataDetected: mockCallback1,
        });
      });

      // Act - start second monitoring (should clear first)
      act(() => {
        result.current.startMonitoring({
          asset: 'ETH',
          monitor: 'positions',
          timeoutMs: 5000,
          onDataDetected: mockCallback2,
        });
      });

      // Act - advance past first timeout
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Assert - first timeout should not fire, monitoring should continue
      expect(result.current.isMonitoring).toBe(true);

      // Act - advance to second timeout
      act(() => {
        jest.advanceTimersByTime(2000); // total 5000ms
      });

      // Assert - second timeout should fire
      expect(result.current.isMonitoring).toBe(false);
    });
  });

  describe('parameterized tests', () => {
    it.each(['orders', 'positions', 'both'] as const)(
      'handles %s monitoring type correctly',
      (monitorType) => {
        // Arrange
        mockUsePerpsLiveOrders.mockReturnValue([]);
        mockUsePerpsLivePositions.mockReturnValue({
          positions: [],
          isInitialLoading: false,
        });

        const { result } = renderHook(() => usePerpsDataMonitor());
        const mockCallback = jest.fn();

        // Act - start monitoring
        act(() => {
          result.current.startMonitoring({
            asset: 'BTC',
            monitor: monitorType,
            onDataDetected: mockCallback,
          });
        });

        // Assert
        expect(result.current.isMonitoring).toBe(true);
        expect(DevLogger.log).toHaveBeenCalledWith(
          'usePerpsDataMonitor: Starting to monitor for data changes',
          expect.objectContaining({
            monitor: monitorType,
          }),
        );
      },
    );

    it.each(['BTC', 'ETH', 'SOL'] as const)(
      'monitors %s asset correctly',
      (asset) => {
        // Arrange
        mockUsePerpsLiveOrders.mockReturnValue([]);
        mockUsePerpsLivePositions.mockReturnValue({
          positions: [],
          isInitialLoading: false,
        });

        const { result } = renderHook(() => usePerpsDataMonitor());
        const mockCallback = jest.fn();

        // Act
        act(() => {
          result.current.startMonitoring({
            asset,
            monitor: 'orders',
            onDataDetected: mockCallback,
          });
        });

        // Assert
        expect(DevLogger.log).toHaveBeenCalledWith(
          'usePerpsDataMonitor: Starting to monitor for data changes',
          expect.objectContaining({
            asset,
          }),
        );
      },
    );
  });
});
