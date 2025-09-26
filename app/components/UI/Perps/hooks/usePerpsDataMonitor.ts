import { useCallback, useEffect, useRef, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position } from '../controllers/types';
import { usePerpsLiveOrders, usePerpsLivePositions } from './stream';

export interface DataMonitorParams {
  /** Asset symbol */
  asset: string;
  /** What to monitor for changes */
  monitor: 'orders' | 'positions' | 'both';
  /** How long to monitor in milliseconds (default: 10000ms) */
  timeoutMs?: number;
  /** Callback when monitoring detects data changes */
  onDataDetected: (params: {
    detectedData: 'positions' | 'orders';
    asset: string;
    reason: string;
  }) => void;
}

interface PendingMonitorParams extends DataMonitorParams {}

interface UsePerpsDataMonitorReturn {
  /** Function to start monitoring for data changes */
  startMonitoring: (params: DataMonitorParams) => void;
  /** Whether we're currently monitoring for data changes */
  isMonitoring: boolean;
  /** Cancel any pending monitoring */
  cancelMonitoring: () => void;
}

/**
 * Hook to monitor Perps data changes (orders/positions) for a specific asset
 *
 * This hook solves the race condition where actions happen immediately but
 * before the orders/positions data has been updated from the server.
 *
 * Monitors specified data type for changes, then calls back with results:
 * - monitor: 'orders' → waits for new orders
 * - monitor: 'positions' → waits for position changes
 * - monitor: 'both' → waits for either, calls back with whichever changes first
 */
export function usePerpsDataMonitor(): UsePerpsDataMonitorReturn {
  // State to track pending monitoring
  const [pendingMonitor, setPendingMonitor] =
    useState<PendingMonitorParams | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State to track positions and orders before order placement (for change detection)
  const [initialPositions, setInitialPositions] = useState<Position[] | null>(
    null,
  );
  const [initialOrderCount, setInitialOrderCount] = useState<number>(0);

  // Get orders data (real-time WebSocket)
  const orders = usePerpsLiveOrders({});
  const isLoadingOrders = !orders; // Simple loading check - orders is undefined until loaded

  // Get all positions data (real-time WebSocket)
  const { positions, isInitialLoading: isLoadingPositions } =
    usePerpsLivePositions();

  // Clear timeout on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  // Helper function to detect position changes for the specific asset
  const hasPositionChangedForAsset = useCallback(
    (asset: string): boolean => {
      if (!initialPositions || !positions) return false;

      const initialPosition = initialPositions.find((p) => p.coin === asset);
      const currentPosition = positions.find((p) => p.coin === asset);

      // New position created (no position before, now has position)
      if (!initialPosition && currentPosition) return true;

      // Position closed (had position before, now no position)
      if (initialPosition && !currentPosition) return true;

      // Position size changed (existing position modified)
      if (initialPosition && currentPosition) {
        const sizeChanged = initialPosition.size !== currentPosition.size;
        const entryPriceChanged =
          initialPosition.entryPrice !== currentPosition.entryPrice;

        // Position was modified if size or entry price changed
        return sizeChanged || entryPriceChanged;
      }

      return false;
    },
    [initialPositions, positions],
  );

  // Watch for data updates and trigger callback when ready
  useEffect(() => {
    if (!pendingMonitor || isLoadingOrders || isLoadingPositions) {
      return;
    }

    const { asset, monitor, onDataDetected } = pendingMonitor;

    let shouldNotify = false;
    let detectedData: 'orders' | 'positions' | undefined;
    let reason = '';

    // Check for new orders if monitoring orders or both
    if ((monitor === 'orders' || monitor === 'both') && !shouldNotify) {
      const currentAssetOrders = orders.filter(
        (order) => order.symbol === asset,
      );
      const hasNewOrders = currentAssetOrders.length > initialOrderCount;

      if (hasNewOrders) {
        shouldNotify = true;
        detectedData = 'orders';
        reason = 'new_orders_detected';
      }
    }

    // Check for position changes if monitoring positions or both
    if ((monitor === 'positions' || monitor === 'both') && !shouldNotify) {
      if (hasPositionChangedForAsset(asset)) {
        shouldNotify = true;
        detectedData = 'positions';
        reason = 'position_changed';
      }
    }

    // Handle data detection
    if (shouldNotify && detectedData) {
      DevLogger.log(
        `usePerpsDataMonitor: ${reason}, detected ${detectedData}`,
        {
          asset,
          monitor,
          reason,
        },
      );

      // Always use callback - no fallback navigation
      onDataDetected({ detectedData, asset, reason });

      // Clear pending monitoring
      setPendingMonitor(null);
      setInitialPositions(null);
      setInitialOrderCount(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Continue waiting for data changes...
    DevLogger.log('usePerpsDataMonitor: Still waiting for data changes', {
      asset,
      monitor,
      hasOrders: orders.length > 0,
      hasPositions: positions?.length > 0,
      hasInitialPositions: !!initialPositions,
    });
  }, [
    pendingMonitor,
    orders,
    positions,
    initialPositions,
    initialOrderCount,
    isLoadingOrders,
    isLoadingPositions,
    hasPositionChangedForAsset,
  ]);

  const startMonitoring = useCallback((params: DataMonitorParams) => {
    const timeoutMs = params.timeoutMs ?? 10000; // Default 10 seconds

    DevLogger.log('usePerpsDataMonitor: Starting to monitor for data changes', {
      asset: params.asset,
      monitor: params.monitor,
      timeoutMs,
    });

    // Capture current positions and order count as initial state for change detection
    setInitialPositions(positions || []);
    const currentAssetOrders = orders.filter(
      (order) => order.symbol === params.asset,
    );
    setInitialOrderCount(currentAssetOrders.length);
    setPendingMonitor(params);

    // Set a timeout fallback (10 seconds) in case data never loads
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      DevLogger.log(
        'usePerpsDataMonitor: Timeout reached, stopping monitoring',
        {
          asset: params.asset,
          monitor: params.monitor,
          timeoutMs,
        },
      );

      // Clean up on timeout - no callback since no data was detected
      setPendingMonitor(null);
      setInitialPositions(null);
      setInitialOrderCount(0);
      timeoutRef.current = null;
    }, timeoutMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelMonitoring = useCallback(() => {
    DevLogger.log('usePerpsDataMonitor: Cancelling data monitoring');
    setPendingMonitor(null);
    setInitialPositions(null);
    setInitialOrderCount(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    startMonitoring,
    isMonitoring: pendingMonitor !== null,
    cancelMonitoring,
  };
}
