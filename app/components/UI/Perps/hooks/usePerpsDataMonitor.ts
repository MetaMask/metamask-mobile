import { useCallback, useEffect, useRef, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position } from '../controllers/types';
import { usePerpsLiveOrders, usePerpsLivePositions } from './stream';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

export interface DataMonitorParams {
  /** Asset symbol */
  asset: string;
  /** What to monitor for changes (default: 'both') */
  monitor?: 'orders' | 'positions' | 'both';
  /** How long to monitor in milliseconds (default: DEFAULT_MONITORING_TIMEOUT_MS) */
  timeoutMs?: number;
  /** Callback when monitoring detects data changes */
  onDataDetected: (params: {
    detectedData: 'positions' | 'orders';
    asset: string;
    reason: string;
  }) => void;
}

export interface UsePerpsDataMonitorParams {
  /** Asset symbol (required when enabled) */
  asset?: string;
  /** What to monitor for changes (default: 'both') */
  monitor?: 'orders' | 'positions' | 'both';
  /** How long to monitor in milliseconds (default: DEFAULT_MONITORING_TIMEOUT_MS) */
  timeoutMs?: number;
  /** Callback when monitoring detects data changes */
  onDataDetected?: (params: {
    detectedData: 'positions' | 'orders';
    asset: string;
    reason: string;
  }) => void;
  /** Whether monitoring is enabled - when false, no monitoring occurs */
  enabled?: boolean;
}

/**
 * Hook to monitor Perps data changes (orders/positions) for a specific asset
 *
 * This hook solves the race condition where actions happen immediately but
 * before the orders/positions data has been updated from the server.
 *
 * Uses a declarative API - monitoring starts automatically when enabled=true
 * with valid parameters, and stops when enabled=false or params change.
 *
 * @param params - Monitoring parameters
 * @param params.asset - Asset symbol to monitor (required when enabled)
 * @param params.monitor - What to monitor: 'orders' | 'positions' | 'both' (default: 'both')
 * @param params.timeoutMs - Timeout in milliseconds (default: DEFAULT_MONITORING_TIMEOUT_MS)
 * @param params.onDataDetected - Callback when changes are detected
 * @param params.enabled - Whether monitoring is active
 * @returns void - this hook manages side effects declaratively
 */
export function usePerpsDataMonitor(
  params: UsePerpsDataMonitorParams = {},
): void {
  const {
    asset,
    monitor = 'both',
    timeoutMs = PERPS_CONSTANTS.DEFAULT_MONITORING_TIMEOUT_MS,
    onDataDetected,
    enabled = false,
  } = params;

  // State to track if monitoring is currently active
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
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
    (targetAsset: string): boolean => {
      if (!initialPositions || !positions) return false;

      const initialPosition = initialPositions.find(
        (p) => p.coin === targetAsset,
      );
      const currentPosition = positions.find((p) => p.coin === targetAsset);

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

  // Auto-start monitoring when enabled becomes true with valid parameters
  useEffect(() => {
    const shouldStartMonitoring =
      enabled &&
      asset &&
      onDataDetected &&
      !isLoadingOrders &&
      !isLoadingPositions;

    if (shouldStartMonitoring) {
      // If already monitoring, restart with new parameters
      if (isMonitoring) {
        DevLogger.log(
          'usePerpsDataMonitor: Restarting monitoring with new parameters',
        );
        setIsMonitoring(false);
        setInitialPositions(null);
        setInitialOrderCount(0);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }

      DevLogger.log(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        {
          asset,
          monitor,
          timeoutMs,
        },
      );

      // Capture current positions and order count as initial state for change detection
      setInitialPositions(positions || []);
      const currentAssetOrders = (orders || []).filter(
        (order) => order.symbol === asset,
      );
      setInitialOrderCount(currentAssetOrders.length);
      setIsMonitoring(true);

      // Set a timeout fallback in case data never loads
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        DevLogger.log(
          'usePerpsDataMonitor: Timeout reached, stopping monitoring',
          {
            asset,
            monitor,
            timeoutMs,
          },
        );

        // Clean up on timeout - no callback since no data was detected
        setIsMonitoring(false);
        setInitialPositions(null);
        setInitialOrderCount(0);
        timeoutRef.current = null;
      }, timeoutMs);
    } else if (!enabled && isMonitoring) {
      // Stop monitoring when enabled becomes false
      DevLogger.log('usePerpsDataMonitor: Stopping monitoring (disabled)');
      setIsMonitoring(false);
      setInitialPositions(null);
      setInitialOrderCount(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [
    enabled,
    asset,
    monitor,
    onDataDetected,
    timeoutMs,
    isLoadingOrders,
    isLoadingPositions,
    isMonitoring,
    orders,
    positions,
  ]);

  // Watch for data updates and trigger callback when monitoring is active
  useEffect(() => {
    if (
      !isMonitoring ||
      !asset ||
      !monitor ||
      !onDataDetected ||
      isLoadingOrders ||
      isLoadingPositions
    ) {
      return;
    }

    let shouldNotify = false;
    let detectedData: 'orders' | 'positions' | undefined;
    let reason = '';

    // Check for new orders if monitoring orders or both
    if (
      (monitor === 'orders' || monitor === 'both') &&
      !shouldNotify &&
      orders
    ) {
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

      // Clear monitoring state
      setIsMonitoring(false);
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
      hasOrders: orders ? orders.length > 0 : false,
      hasPositions: positions?.length > 0,
      hasInitialPositions: !!initialPositions,
    });
  }, [
    isMonitoring,
    asset,
    monitor,
    onDataDetected,
    orders,
    positions,
    initialPositions,
    initialOrderCount,
    isLoadingOrders,
    isLoadingPositions,
    hasPositionChangedForAsset,
  ]);

  // Hook returns void - all side effects are managed internally
}
