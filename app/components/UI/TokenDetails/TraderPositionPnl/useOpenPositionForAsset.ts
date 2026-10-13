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
  getOpenPositionForAsset,
  TraderPositionHttpError,
} from './traderPositionService';
import type { OpenPositionPnl } from './types';
import { TRADER_POSITION_POLL_INTERVAL_MS } from './useTraderPosition';

export interface UseOpenPositionForAssetResult {
  position: OpenPositionPnl | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const queryKey = (address: string | undefined, assetId: string | undefined) =>
  ['TraderPositionPnl', 'open-position', address, assetId] as const;

/**
 * This wallet's open position in one CAIP-19 asset.
 * Polled on the same interval as `useTraderPosition` while the screen is focused.
 * 404 and 403 are "no ready position" (`null`), not an error.
 */
export const useOpenPositionForAsset = (
  address: string | undefined,
  assetId: string | undefined,
): UseOpenPositionForAssetResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const isFocused = useIsFocused();
  const enabled = Boolean(address && assetId) && isUnlocked;

  const query = useQuery({
    queryKey: queryKey(address, assetId),
    queryFn: async ({ signal }) => {
      try {
        return await getOpenPositionForAsset(
          address ?? '',
          assetId ?? '',
          signal,
        );
      } catch (error) {
        if (
          error instanceof TraderPositionHttpError &&
          (error.status === 404 || error.status === 403)
        ) {
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
    operation: 'fetch_open_position',
    extraMessage: 'Open position PnL fetch failed',
    source: 'useOpenPositionForAsset',
    endpoint: 'open_positions',
    // The wallet address is deliberately left out: these extras reach Sentry,
    // and the asset id is enough to locate a failing route.
    queryParams: { assetId: assetId ?? '' },
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
