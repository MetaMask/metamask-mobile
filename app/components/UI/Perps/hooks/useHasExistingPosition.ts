import { useMemo, useCallback } from 'react';
import { usePerpsLivePositions } from './stream';
import type { Position } from '../controllers/types';

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

  // Check if user has an existing position for this asset
  const existingPosition = useMemo(
    () => (positions || []).find((position) => position.coin === asset) || null,
    [positions, asset],
  );

  const hasPosition = useMemo(
    () => existingPosition !== null,
    [existingPosition],
  );

  // No-op refresh function for compatibility
  // Positions update automatically via WebSocket
  const refreshPosition = useCallback(
    async () =>
      // WebSocket positions update automatically, no manual refresh needed
      Promise.resolve(),
    [],
  );

  return {
    hasPosition,
    isLoading: isInitialLoading,
    error: null, // WebSocket subscriptions handle errors internally
    existingPosition,
    refreshPosition,
  };
}
