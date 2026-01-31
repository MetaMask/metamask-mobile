import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import type { PredictPosition } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { useSelector } from 'react-redux';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { selectPredictClaimablePositionsByAddress } from '../selectors/predictController';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';

interface UsePredictPositionsOptions {
  /**
   * The provider ID to load positions for
   */
  providerId?: string;
  /**
   * Whether to load positions on mount
   * @default true
   */
  loadOnMount?: boolean;
  /**
   * Whether to refresh positions when screen comes into focus
   * @default true
   */
  refreshOnFocus?: boolean;
  /**
   * The market ID to load positions for
   */
  marketId?: string;

  /**
   * Only load claimable positions. When this is set to true, marketId is ignored when fetching positions.
   * However, the positions returned will be filtered to only include the specific market positions.
   */
  claimable?: boolean;
  /**
   * Auto-refresh interval in milliseconds
   * If provided, positions will be automatically refreshed at this interval
   */
  autoRefreshTimeout?: number;
}

interface UsePredictPositionsReturn {
  positions: PredictPosition[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadPositions: (options?: { isRefresh?: boolean }) => Promise<void>;
}

/**
 * Hook for managing Predict positions data with loading states
 * @param options Configuration options for the hook
 * @returns Positions data and loading utilities
 */
export function usePredictPositions(
  options: UsePredictPositionsOptions = {},
): UsePredictPositionsReturn {
  const {
    providerId,
    loadOnMount = true,
    refreshOnFocus = true,
    claimable = false,
    marketId,
    autoRefreshTimeout,
  } = options;

  const { getPositions } = usePredictTrading();
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  // `positions` state only stores active positions
  const [positions, setPositions] = useState<PredictPosition[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoadedForAddress, setDataLoadedForAddress] = useState<
    string | null
  >(null);

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedInternalAccountAddress = evmAccount?.address ?? '0x0';

  const claimablePositions = useSelector(
    selectPredictClaimablePositionsByAddress({
      address: selectedInternalAccountAddress,
    }),
  );

  const filteredClaimablePositions = useMemo(() => {
    if (!marketId) return [...claimablePositions];
    return claimablePositions.filter(
      (position) => position.marketId === marketId,
    );
  }, [claimablePositions, marketId]);

  const loadPositions = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
          setPositions([]);
        }
        setError(null);

        // Ensure Polygon network exists before fetching positions
        try {
          await ensurePolygonNetworkExists();
        } catch (networkError) {
          // Error already logged to Sentry in usePredictNetworkManagement
          DevLogger.log(
            'usePredictPositions: Failed to ensure Polygon network exists',
            networkError,
          );
          // Continue with positions fetch - network might already exist
        }

        // Get positions from Predict controller
        const positionsData = await getPositions({
          address: selectedInternalAccountAddress,
          providerId,
          claimable,
          // Always load ALL positions when claimable is true
          marketId: claimable ? undefined : marketId,
        });
        const validPositions = positionsData ?? [];

        if (!claimable) {
          // `positions` state only stores active positions
          setPositions(validPositions);
        }

        DevLogger.log('usePredictPositions: Loaded positions', {
          originalCount: validPositions.length,
          filteredCount: validPositions.length,
          positions: validPositions.map((p) => ({
            size: p.size,
            outcomeId: p.outcomeId,
            outcomeIndex: p.outcomeIndex,
            price: p.price,
          })),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load positions';
        setError(errorMessage);
        DevLogger.log('usePredictPositions: Error loading positions', err);

        // Log error with positions loading context (no user address)
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictPositions',
          },
          context: {
            name: 'usePredictPositions',
            data: {
              method: 'loadPositions',
              action: 'positions_load',
              operation: 'data_fetching',
              providerId,
              claimable,
              marketId,
            },
          },
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setDataLoadedForAddress(selectedInternalAccountAddress);
      }
    },
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      getPositions,
      selectedInternalAccountAddress,
      providerId,
      claimable,
      marketId,
    ],
  );

  // Load positions on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadPositions();
    }
  }, [loadOnMount, loadPositions]);

  // Refresh positions when screen comes into focus if enabled
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        // Refresh positions data when returning to this screen
        // Use refresh mode to avoid showing loading spinner
        loadPositions({ isRefresh: true });
      }
    }, [refreshOnFocus, loadPositions]),
  );

  // Store loadPositions in a ref for auto-refresh
  const loadPositionsRef = useRef(loadPositions);
  loadPositionsRef.current = loadPositions;

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshTimeout) {
      return;
    }

    const refreshTimer = setInterval(() => {
      loadPositionsRef.current({ isRefresh: true });
    }, autoRefreshTimeout);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [autoRefreshTimeout]);

  const isDataStale = dataLoadedForAddress !== selectedInternalAccountAddress;

  return {
    // Get claimable positions from controller state if claimable is true.
    // This will ensure that we can refresh claimable positions when the user
    // performs a claim operation.
    positions: claimable ? filteredClaimablePositions : positions,
    isLoading: isLoading || isDataStale,
    isRefreshing,
    error,
    loadPositions,
  };
}
