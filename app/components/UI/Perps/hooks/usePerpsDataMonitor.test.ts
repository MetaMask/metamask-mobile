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

describe('usePerpsDataMonitor (Declarative API)', () => {
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
    symbol: 'BTC',
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
    symbol: 'ETH',
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
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization and basic functionality', () => {
    it('returns undefined when no parameters provided', () => {
      const { result } = renderHook(() => usePerpsDataMonitor());

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when enabled is false', () => {
      const { result } = renderHook(() =>
        usePerpsDataMonitor({ enabled: false }),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined regardless of parameter completeness', () => {
      const onDataDetected = jest.fn();

      // Missing asset
      const { result: result1 } = renderHook(() =>
        usePerpsDataMonitor({
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );
      expect(result1.current).toBeUndefined();

      // Missing monitor
      const { result: result2 } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          onDataDetected,
          enabled: true,
        }),
      );
      expect(result2.current).toBeUndefined();

      // Missing onDataDetected
      const { result: result3 } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          enabled: true,
        }),
      );
      expect(result3.current).toBeUndefined();
    });

    it('starts monitoring when all parameters are provided and enabled is true', () => {
      const onDataDetected = jest.fn();

      const { result } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );

      expect(result.current).toBeUndefined();
      // Verify monitoring started by checking DevLogger was called
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        {
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          timeoutMs: 10000,
        },
      );
    });

    it('starts monitoring with default values when monitorOrders and monitorPositions are undefined', () => {
      const onDataDetected = jest.fn();

      const { result } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          // monitorOrders and monitorPositions are undefined, should default to true
          onDataDetected,
          enabled: true,
        }),
      );

      expect(result.current).toBeUndefined();
      // Verify monitoring started with default values (both true)
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        {
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: true,
          timeoutMs: 10000,
        },
      );
    });
  });

  describe('monitoring lifecycle', () => {
    it('starts monitoring when enabled changes from false to true', () => {
      const onDataDetected = jest.fn();

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          usePerpsDataMonitor({
            asset: 'BTC',
            monitorOrders: true,
            monitorPositions: false,
            onDataDetected,
            enabled,
          }),
        {
          initialProps: { enabled: false },
        },
      );

      expect(result.current).toBeUndefined();

      rerender({ enabled: true });

      expect(result.current).toBeUndefined();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        {
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          timeoutMs: 10000,
        },
      );
    });

    it('stops monitoring when enabled changes from true to false', () => {
      const onDataDetected = jest.fn();

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          usePerpsDataMonitor({
            asset: 'BTC',
            monitorOrders: true,
            monitorPositions: false,
            onDataDetected,
            enabled,
          }),
        {
          initialProps: { enabled: true },
        },
      );

      expect(result.current).toBeUndefined();

      rerender({ enabled: false });

      expect(result.current).toBeUndefined();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Stopping monitoring (disabled)',
      );
    });

    it('restarts monitoring when parameters change while enabled', () => {
      const onDataDetected = jest.fn();

      const { result, rerender } = renderHook(
        ({ asset }: { asset: string }) =>
          usePerpsDataMonitor({
            asset,
            monitorOrders: true,
            monitorPositions: false,
            onDataDetected,
            enabled: true,
          }),
        {
          initialProps: { asset: 'BTC' },
        },
      );

      expect(result.current).toBeUndefined();

      rerender({ asset: 'ETH' });

      expect(result.current).toBeUndefined();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        expect.objectContaining({
          asset: 'ETH',
        }),
      );
    });

    it('does not restart monitoring after successful detection', () => {
      const onDataDetected = jest.fn();

      // Start with no orders
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add new BTC order to trigger detection
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockBTCOrder],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });

      // Clear the mock to check for new calls
      onDataDetected.mockClear();
      (DevLogger.log as jest.Mock).mockClear();

      // Simulate more WebSocket updates (position changes, etc.)
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Should NOT restart monitoring or trigger new detections
      expect(onDataDetected).not.toHaveBeenCalled();
      expect(DevLogger.log).not.toHaveBeenCalledWith(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        expect.any(Object),
      );
    });
  });

  describe('order monitoring', () => {
    it('detects new orders for the monitored asset', () => {
      const onDataDetected = jest.fn();

      // Start with no orders
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add new BTC order
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockBTCOrder],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });

    it('ignores orders for different assets', () => {
      const onDataDetected = jest.fn();

      // Start with no orders
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add ETH order (different asset)
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockETHOrder],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).not.toHaveBeenCalled();
    });

    it('stops monitoring after detecting orders', () => {
      const onDataDetected = jest.fn();

      // Start with no orders
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );

      expect(result.current).toBeUndefined();

      // Add new BTC order
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockBTCOrder],
        isInitialLoading: false,
      });
      rerender({});

      expect(result.current).toBeUndefined();
      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });
  });

  describe('position monitoring', () => {
    it('detects new position creation', () => {
      const onDataDetected = jest.fn();

      // Start with no positions
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: false,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add new BTC position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('detects position closure', () => {
      const onDataDetected = jest.fn();

      // Start with BTC position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: false,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Remove BTC position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('detects position size changes', () => {
      const onDataDetected = jest.fn();

      // Start with BTC position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: false,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Change position size
      const modifiedPosition = { ...mockBTCPosition, size: '2.0' };
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [modifiedPosition],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('ignores positions for different assets', () => {
      const onDataDetected = jest.fn();

      // Start with no positions
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: false,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add ETH position (different asset)
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockETHPosition],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).not.toHaveBeenCalled();
    });
  });

  describe('combined monitoring ("both")', () => {
    it('defaults to monitoring both orders and positions when monitor is undefined', () => {
      const onDataDetected = jest.fn();

      // Start with no data
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          // monitor is undefined, should default to 'both'
          onDataDetected,
          enabled: true,
        }),
      );

      // Add new BTC order - should detect since we're monitoring both
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockBTCOrder],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });

    it('detects orders when monitoring both', () => {
      const onDataDetected = jest.fn();

      // Start with no data
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add new BTC order
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockBTCOrder],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected',
      });
    });

    it('detects positions when monitoring both', () => {
      const onDataDetected = jest.fn();

      // Start with no data
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add new BTC position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });
      rerender({});

      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'positions',
        asset: 'BTC',
        reason: 'position_changed',
      });
    });

    it('returns first detected change type when both are available', () => {
      const onDataDetected = jest.fn();

      // Start with no data
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Add both orders and positions simultaneously
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockBTCOrder],
        isInitialLoading: false,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: false,
      });
      rerender({});

      // Should prioritize orders and indicate both were detected
      expect(onDataDetected).toHaveBeenCalledWith({
        detectedData: 'orders',
        asset: 'BTC',
        reason: 'new_orders_detected_with_position_change',
      });
    });
  });

  describe('timeout handling', () => {
    it('stops monitoring after timeout', () => {
      const onDataDetected = jest.fn();

      const { result } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          timeoutMs: 5000,
          enabled: true,
        }),
      );

      expect(result.current).toBeUndefined();

      // Fast forward past timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current).toBeUndefined();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsDataMonitor: Timeout reached, stopping monitoring',
        {
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          timeoutMs: 5000,
        },
      );
    });

    it('uses default timeout of 10000ms', () => {
      const onDataDetected = jest.fn();

      const { result } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );

      expect(result.current).toBeUndefined();

      // Should still be monitoring at 9999ms
      act(() => {
        jest.advanceTimersByTime(9999);
      });
      expect(result.current).toBeUndefined();

      // Should timeout at 10000ms
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBeUndefined();
    });

    it('does not call onDataDetected on timeout', () => {
      const onDataDetected = jest.fn();

      renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          timeoutMs: 5000,
          enabled: true,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onDataDetected).not.toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('triggers monitoring after loading completes', () => {
      const onDataDetected = jest.fn();

      // Orders are loading (undefined)
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: true,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          enabled: true,
        }),
      );

      // Loading completes with order - should trigger detection
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [mockBTCOrder],
        isInitialLoading: false,
      });
      rerender({});

      // Should detect the order since monitoring was enabled and order appeared
      expect(onDataDetected).toHaveBeenCalledWith({
        asset: 'BTC',
        detectedData: 'orders',
        reason: 'new_orders_detected',
      });
    });

    it('does not trigger monitoring while positions are loading', () => {
      const onDataDetected = jest.fn();

      // Positions are loading
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      const { rerender } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: false,
          monitorPositions: true,
          onDataDetected,
          enabled: true,
        }),
      );

      // Try to add position while loading
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockBTCPosition],
        isInitialLoading: true, // Still loading
      });
      rerender({});

      expect(onDataDetected).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles undefined positions gracefully', () => {
      const onDataDetected = jest.fn();

      mockUsePerpsLivePositions.mockReturnValue({
        positions: undefined,
        isInitialLoading: false,
      });

      expect(() => {
        renderHook(() =>
          usePerpsDataMonitor({
            asset: 'BTC',
            monitorOrders: false,
            monitorPositions: true,
            onDataDetected,
            enabled: true,
          }),
        );
      }).not.toThrow();
    });

    it('handles undefined orders gracefully', () => {
      const onDataDetected = jest.fn();

      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: true,
      });

      expect(() => {
        renderHook(() =>
          usePerpsDataMonitor({
            asset: 'BTC',
            monitorOrders: true,
            monitorPositions: false,
            onDataDetected,
            enabled: true,
          }),
        );
      }).not.toThrow();
    });

    it('clears timeout on unmount', () => {
      const onDataDetected = jest.fn();

      const { unmount } = renderHook(() =>
        usePerpsDataMonitor({
          asset: 'BTC',
          monitorOrders: true,
          monitorPositions: false,
          onDataDetected,
          timeoutMs: 5000,
          enabled: true,
        }),
      );

      unmount();

      // Advance past timeout - should not trigger any logs since component unmounted
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(DevLogger.log).not.toHaveBeenCalledWith(
        'usePerpsDataMonitor: Timeout reached, stopping monitoring',
        expect.any(Object),
      );
    });
  });

  describe('parameters validation', () => {
    it.each([
      [true, false, 'BTC'],
      [false, true, 'ETH'],
      [true, true, 'SOL'],
    ])(
      'handles monitorOrders=%s, monitorPositions=%s for %s asset correctly',
      (monitorOrders, monitorPositions, asset) => {
        const onDataDetected = jest.fn();

        const { result } = renderHook(() =>
          usePerpsDataMonitor({
            asset,
            monitorOrders,
            monitorPositions,
            onDataDetected,
            enabled: true,
          }),
        );

        expect(result.current).toBeUndefined();
        expect(DevLogger.log).toHaveBeenCalledWith(
          'usePerpsDataMonitor: Starting to monitor for data changes',
          expect.objectContaining({
            asset,
            monitorOrders,
            monitorPositions,
          }),
        );
      },
    );
  });
});
