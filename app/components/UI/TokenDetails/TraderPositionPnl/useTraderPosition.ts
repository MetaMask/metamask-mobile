import { useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  formatSocialQueryErrorMessage,
  useLogSocialQueryError,
} from '../../../../util/social/socialServiceTelemetry';
import {
  getTraderPosition,
  TraderPositionHttpError,
} from './traderPositionService';
import type { TraderPosition } from './types';

/**
 * How often to refresh an open position while the screen is focused.
 * currentValueUSD is live. The interval is provisional until product agrees one.
 */
export const TRADER_POSITION_POLL_INTERVAL_MS = 30_000;

export interface UseTraderPositionResult {
  position: TraderPosition | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const queryKey = (positionId: string | undefined) =>
  ['TraderPositionPnl', 'position', positionId] as const;

/**
 * One social position, polled only while this screen is focused.
 * A 404 is "no position" (`null`), not an error.
 */
export const useTraderPosition = (
  positionId: string | undefined,
): UseTraderPositionResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const isFocused = useIsFocused();
  const enabled = Boolean(positionId) && isUnlocked;

  const query = useQuery({
    queryKey: queryKey(positionId),
    queryFn: async ({ signal }) => {
      try {
        return await getTraderPosition(positionId ?? '', signal);
      } catch (error) {
        if (error instanceof TraderPositionHttpError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    refetchInterval: isFocused ? TRADER_POSITION_POLL_INTERVAL_MS : false,
  });

  const { data, isLoading, error, refetch } = query;

  useLogSocialQueryError(error, {
    surface: 'trader_position',
    operation: 'fetch_position_by_id',
    extraMessage: 'Trader position fetch failed',
    source: 'useTraderPosition',
    endpoint: 'position_by_id',
    queryParams: { positionId: positionId ?? '' },
  });

  const refetchPosition = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    position: data ?? null,
    isLoading: enabled && isLoading,
    error: formatSocialQueryErrorMessage(error),
    refetch: refetchPosition,
  };
};
