import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import { UnrealizedPnL } from '../types';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictPositions } from './usePredictPositions';

export interface UseUnrealizedPnLOptions {
  /**
   * The address to fetch unrealized P&L for
   */
  address?: string;
  /**
   * Whether to load unrealized P&L on mount
   * @default true
   */
  loadOnMount?: boolean;
  /**
   * Whether to refresh unrealized P&L when screen comes into focus
   * @default true
   */
  refreshOnFocus?: boolean;
}

export interface UseUnrealizedPnLResult {
  unrealizedPnL: UnrealizedPnL | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadUnrealizedPnL: (options?: { isRefresh?: boolean }) => Promise<void>;
}

/**
 * Hook for managing unrealized P&L data with loading states
 * @param options Configuration options for the hook
 * @returns Unrealized P&L data and loading utilities
 */
export const useUnrealizedPnL = (
  options: UseUnrealizedPnLOptions = {},
): UseUnrealizedPnLResult => {
  const { address, loadOnMount = true, refreshOnFocus = true } = options;

  const [pnlData, setPnlData] = useState<UnrealizedPnL | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedInternalAccountAddress = evmAccount?.address ?? '0x0';

  const { data: activePositions } = usePredictPositions({ claimable: false });
  const hasPositions = (activePositions?.length ?? 0) > 0;

  const loadUnrealizedPnL = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const unrealizedPnLResult =
          await Engine.context.PredictController.getUnrealizedPnL({
            address: address ?? selectedInternalAccountAddress,
          });

        setPnlData(unrealizedPnLResult ?? null);

        DevLogger.log('useUnrealizedPnL: Loaded unrealized P&L', {
          unrealizedPnL: unrealizedPnLResult,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch unrealized P&L';
        setError(errorMessage);
        setPnlData(null);
        DevLogger.log('useUnrealizedPnL: Error loading unrealized P&L', err);

        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'useUnrealizedPnL',
          },
          context: {
            name: 'useUnrealizedPnL',
            data: {
              method: 'loadUnrealizedPnL',
              action: 'unrealized_pnl_load',
              operation: 'data_fetching',
            },
          },
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [address, selectedInternalAccountAddress],
  );

  // Load unrealized P&L on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadUnrealizedPnL();
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOnMount]);

  // Refresh unrealized P&L when screen comes into focus if enabled
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        loadUnrealizedPnL({ isRefresh: true });
      }
    }, [refreshOnFocus, loadUnrealizedPnL]),
  );

  // Reset and reload data when address changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setPnlData(null);
    setError(null);
    loadUnrealizedPnL();
  }, [address, loadUnrealizedPnL]);

  const unrealizedPnL = useMemo(
    () => (hasPositions ? pnlData : null),
    [hasPositions, pnlData],
  );

  return {
    unrealizedPnL,
    isLoading,
    isRefreshing,
    error,
    loadUnrealizedPnL,
  };
};
