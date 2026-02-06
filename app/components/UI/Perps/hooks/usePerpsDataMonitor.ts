import { useCallback, useEffect, useRef, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position } from '../controllers/types';
import { usePerpsLiveOrders, usePerpsLivePositions } from './stream';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

export interface DataMonitorParams {
  /** Asset symbol */
  asset: string;
  /** Whether to monitor for order changes (default: true) */
  monitorOrders?: boolean;
  /** Whether to monitor for position changes (default: true) */
  monitorPositions?: boolean;
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
  /** Whether to monitor for order changes (default: true) */
  monitorOrders?: boolean;
  /** Whether to monitor for position changes (default: true) */
  monitorPositions?: boolean;
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
 * @param params.monitorOrders - Whether to monitor order changes (default: true)
 * @param params.monitorPositions - Whether to monitor position changes (default: true)
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
    monitorOrders = true,
    monitorPositions = true,
    timeoutMs = PERPS_CONSTANTS.DefaultMonitoringTimeoutMs,
    onDataDetected,
    enabled = false,
  } = params;

  // State to track if monitoring is currently active
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if monitoring has completed successfully to prevent restart loops
  const hasCompletedRef = useRef<boolean>(false);

  // State to track positions and orders before order placement (for change detection)
  const [initialPositions, setInitialPositions] = useState<Position[] | null>(
    null,
  );
  const [initialOrderCount, setInitialOrderCount] = useState<number>(0);

  // Get orders data (real-time WebSocket)
  const { orders } = usePerpsLiveOrders({});
  const isLoadingOrders = !orders; // Simple loading check - orders is undefined until loaded

  // Get all positions data (real-time WebSocket)
  const { positions, isInitialLoading: isLoadingPositions } =
    usePerpsLivePositions();

  // Helper function to clean up monitoring state - DRY utility
  const cleanupMonitoring = useCallback((resetCompletion: boolean = false) => {
    setIsMonitoring(false);
    setInitialPositions(null);
    setInitialOrderCount(0);
    if (resetCompletion) {
      hasCompletedRef.current = false;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

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
        (p) => p.symbol === targetAsset,
      );
      const currentPosition = positions.find((p) => p.symbol === targetAsset);

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

  // Reset completion flag when key parameters change
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [
    asset,
    onDataDetected,
    enabled,
    monitorOrders,
    monitorPositions,
    timeoutMs,
  ]);

  // Auto-start monitoring when enabled becomes true with valid parameters
  useEffect(() => {
    const shouldStartMonitoring =
      enabled &&
      asset &&
      onDataDetected &&
      !isLoadingOrders &&
      !isLoadingPositions &&
      !hasCompletedRef.current; // Don't restart if already completed

    if (shouldStartMonitoring) {
      // If already monitoring, restart with new parameters
      if (isMonitoring) {
        DevLogger.log(
          'usePerpsDataMonitor: Restarting monitoring with new parameters',
        );
        cleanupMonitoring();
      }

      DevLogger.log(
        'usePerpsDataMonitor: Starting to monitor for data changes',
        {
          asset,
          monitorOrders,
          monitorPositions,
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
            monitorOrders,
            monitorPositions,
            timeoutMs,
          },
        );

        // Clean up on timeout - no callback since no data was detected
        cleanupMonitoring(true); // Reset completion flag on timeout
      }, timeoutMs);
    } else if (!enabled && isMonitoring) {
      // Stop monitoring when enabled becomes false
      DevLogger.log('usePerpsDataMonitor: Stopping monitoring (disabled)');
      cleanupMonitoring(true); // Reset completion flag when disabled
    }
    // NOTE: 'orders' and 'positions' are intentionally excluded from dependencies
    // to prevent restart loops. We capture their initial state when monitoring starts,
    // but don't restart monitoring when they change (that would defeat the purpose).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    asset,
    monitorOrders,
    monitorPositions,
    onDataDetected,
    timeoutMs,
    isLoadingOrders,
    isLoadingPositions,
    isMonitoring,
    cleanupMonitoring,
  ]);

  // Watch for data updates and trigger callback when monitoring is active
  useEffect(() => {
    // Don't trigger if monitoring has already completed successfully
    if (hasCompletedRef.current) {
      return;
    }

    if (
      !isMonitoring ||
      !asset ||
      !onDataDetected ||
      isLoadingOrders ||
      isLoadingPositions
    ) {
      return;
    }

    // Check BOTH conditions before deciding what to report
    let hasNewOrders = false;
    let hasPositionChanged = false;

    // Check for new orders if monitoring orders
    if (monitorOrders && orders) {
      const currentAssetOrders = orders.filter(
        (order) => order.symbol === asset,
      );
      hasNewOrders = currentAssetOrders.length > initialOrderCount;
    }

    // Check for position changes if monitoring positions
    if (monitorPositions) {
      hasPositionChanged = hasPositionChangedForAsset(asset);
    }

    // Determine what to report based on priority:
    // - If orders detected, prioritize orders (more relevant for limit orders)
    // - Otherwise, report positions if changed
    // - Only notify once per monitoring session
    let shouldNotify = false;
    let detectedData: 'orders' | 'positions' | undefined;
    let reason = '';

    if (hasNewOrders) {
      shouldNotify = true;
      detectedData = 'orders';
      reason = hasPositionChanged
        ? 'new_orders_detected_with_position_change'
        : 'new_orders_detected';
    } else if (hasPositionChanged) {
      shouldNotify = true;
      detectedData = 'positions';
      reason = 'position_changed';
    }

    // Handle data detection - only fires ONCE
    if (shouldNotify && detectedData) {
      // Mark as completed FIRST to prevent race conditions
      hasCompletedRef.current = true;

      DevLogger.log(
        `usePerpsDataMonitor: ${reason}, detected ${detectedData}`,
        {
          asset,
          monitorOrders,
          monitorPositions,
          reason,
          hasNewOrders,
          hasPositionChanged,
        },
      );

      // Always use callback - no fallback navigation
      onDataDetected({ detectedData, asset, reason });

      // Clear monitoring state
      cleanupMonitoring();
      return;
    }

    // Continue waiting for data changes...
    DevLogger.log('usePerpsDataMonitor: Still waiting for data changes', {
      asset,
      monitorOrders,
      monitorPositions,
      hasOrders: orders ? orders.length > 0 : false,
      hasPositions: positions?.length > 0,
      hasInitialPositions: !!initialPositions,
    });
  }, [
    isMonitoring,
    asset,
    monitorOrders,
    monitorPositions,
    onDataDetected,
    orders,
    positions,
    initialPositions,
    initialOrderCount,
    isLoadingOrders,
    isLoadingPositions,
    hasPositionChangedForAsset,
    cleanupMonitoring,
  ]);
}
