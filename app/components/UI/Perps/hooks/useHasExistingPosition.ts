import { useMemo, useCallback } from 'react';
import { usePerpsPositions } from './usePerpsPositions';
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
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** The existing position if found */
  existingPosition: Position | null;
  /** Function to refresh positions data */
  refreshPosition: () => Promise<void>;
}

/**
 * Hook to check if user has an existing position for a specific asset
 * @param params Parameters for position checking
 * @returns Object containing position existence info and related states
 */
export function useHasExistingPosition(
  params: UseHasExistingPositionParams,
): UseHasExistingPositionReturn {
  const { asset, loadOnMount = true } = params;

  // Use the existing positions hook to get all positions
  const { positions, isLoading, error, loadPositions } = usePerpsPositions({
    loadOnMount,
    refreshOnFocus: true,
  });

  // Check if user has an existing position for this asset
  const existingPosition = useMemo(
    () => positions.find((position) => position.coin === asset) || null,
    [positions, asset],
  );

  const hasPosition = useMemo(
    () => existingPosition !== null,
    [existingPosition],
  );

  // Wrapper function to refresh positions
  const refreshPosition = useCallback(async () => {
    await loadPositions({ isRefresh: true });
  }, [loadPositions]);

  return {
    hasPosition,
    isLoading,
    error,
    existingPosition,
    refreshPosition,
  };
}
