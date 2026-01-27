import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Position } from '../controllers/types';
import { usePerpsLivePositions, usePerpsLiveFills } from './stream';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

interface UseHasExistingPositionParams {
  /** Asset symbol to check for existing position */
  asset: string;
  /** Whether to load positions on mount */
  loadOnMount?: boolean;
}

interface UseHasExistingPositionReturn {
  /** Whether user has an existing position for the asset */
  hasPosition: boolean;
  /** Loading state - always false since WebSocket data loads from cache */
  isLoading: boolean;
  /** Error state - always null for WebSocket subscriptions */
  error: string | null;
  /** The existing position if found */
  existingPosition: Position | null;
  /** Function to refresh positions data - no-op for WebSocket */
  refreshPosition: () => Promise<void>;
  /** Timestamp when the position was opened (from order fills) */
  positionOpenedTimestamp: number | undefined;
}

/**
 * Hook to check if user has an existing position for a specific asset
 * Uses WebSocket subscription for real-time position updates
 * @param params Parameters for position checking
 * @returns Object containing position existence info and related states
 */
export function useHasExistingPosition(
  params: UseHasExistingPositionParams,
): UseHasExistingPositionReturn {
  const { asset } = params;
  // loadOnMount is ignored since WebSocket subscriptions load from cache immediately

  // Get real-time positions via WebSocket
  const { positions, isInitialLoading } = usePerpsLivePositions();

  // Get real-time fills via WebSocket for position opened timestamp
  const { fills: orderFills } = usePerpsLiveFills();

  // State for REST-fetched position opened timestamp (fallback when WebSocket doesn't have the fill)
  const [restPositionTimestamp, setRestPositionTimestamp] = useState<
    number | undefined
  >(undefined);
  // Track which position symbol we've already fetched REST data for to avoid duplicate calls
  const restFetchedForSymbolRef = useRef<string | null>(null);

  // Check if user has an existing position for this asset
  const existingPosition = useMemo(
    () =>
      (positions || []).find((position) => position.symbol === asset) || null,
    [positions, asset],
  );

  const hasPosition = existingPosition !== null;

  // Get position opened timestamp from WebSocket fills data
  // This is used by useStopLossPrompt to bypass client-side debounce timers
  const wsPositionOpenedTimestamp = useMemo(() => {
    if (!existingPosition || !orderFills) return undefined;

    // Find the most recent "Open" fill for this position's symbol
    const openFill = orderFills
      .filter((fill) => {
        const isMatchingAsset = fill.symbol === existingPosition.symbol;
        const isOpenDirection = fill.direction?.startsWith('Open');
        return isMatchingAsset && isOpenDirection;
      })
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return openFill?.timestamp;
  }, [existingPosition, orderFills]);

  // Fallback: Fetch historical fills via REST when WebSocket doesn't have the position-opening fill
  // This handles older positions where the "Open" fill is no longer in the WebSocket snapshot
  useEffect(() => {
    // Skip if no position or if WebSocket already has the timestamp
    if (!existingPosition || wsPositionOpenedTimestamp) {
      return;
    }

    // Check if this is a new symbol (different from what we last fetched)
    const isNewSymbol =
      restFetchedForSymbolRef.current !== existingPosition.symbol;

    // Skip if we've already fetched for this position symbol
    if (!isNewSymbol) {
      return;
    }

    // IMPORTANT: Clear stale timestamp BEFORE updating ref to prevent race condition
    // This ensures the old position's timestamp doesn't leak to the new position
    setRestPositionTimestamp(undefined);

    // Mark that we're fetching for this symbol to prevent duplicate calls
    restFetchedForSymbolRef.current = existingPosition.symbol;

    // Track if this effect is still current to prevent stale updates
    // This prevents race conditions when users rapidly switch markets
    let isCurrent = true;

    const fetchHistoricalFills = async () => {
      // Capture symbol at fetch start for validation and logging
      const symbolAtFetchStart = existingPosition.symbol;

      try {
        // Fetch fills from the last 90 days to find position-opening fill
        const startTime = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const controller = Engine.context.PerpsController;
        const fills = await controller.getOrderFills({ startTime });

        if (!fills || fills.length === 0) {
          return;
        }

        // Find the most recent "Open" fill for this position's symbol
        const openFill = fills
          .filter((fill) => {
            // Use captured symbol to ensure consistency
            const isMatchingAsset = fill.symbol === symbolAtFetchStart;
            const isOpenDirection = fill.direction?.startsWith('Open');
            return isMatchingAsset && isOpenDirection;
          })
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        // Only set state if this effect is still current (not cleaned up due to market switch)
        if (openFill?.timestamp && isCurrent) {
          setRestPositionTimestamp(openFill.timestamp);
        }
      } catch (error) {
        // Don't log for cancelled operations
        if (!isCurrent) return;

        // Non-critical error - fall back to debounce timer if REST fails
        Logger.log('Failed to fetch historical fills for position timestamp', {
          error,
          symbol: symbolAtFetchStart,
        });
      }
    };

    fetchHistoricalFills();

    // Cleanup: mark this effect as no longer current when market changes
    return () => {
      isCurrent = false;
    };
  }, [existingPosition, wsPositionOpenedTimestamp]);

  // Combine WebSocket and REST timestamps - prefer WebSocket (faster), fall back to REST
  const positionOpenedTimestamp =
    wsPositionOpenedTimestamp ?? restPositionTimestamp;

  // No-op refresh function for compatibility
  // Positions update automatically via WebSocket
  // WebSocket positions update automatically, no manual refresh needed
  const refreshPosition = useCallback(async () => undefined, []);
  // WebSocket positions update automatically, no manual refresh needed

  return {
    hasPosition,
    isLoading: isInitialLoading,
    error: null, // WebSocket subscriptions handle errors internally
    existingPosition,
    refreshPosition,
    positionOpenedTimestamp,
  };
}
