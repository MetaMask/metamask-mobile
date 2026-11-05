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
import type { OpenPositionPnl, TraderPosition } from './types';
import { TRADER_POSITION_POLL_INTERVAL_MS } from './useTraderPosition';

export interface UseOpenPositionForAssetResult {
  position: OpenPositionPnl | null;
  /** Full list row, used to attach the position card in the post composer. */
  sharePosition: TraderPosition | null;
  /** Set only when the open route never answered. */
  earliestTradeAt?: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const queryKey = (
  traderId: string | undefined,
  tokenAddress: string | undefined,
  walletAddress: string | undefined,
) =>
  [
    'TraderPositionPnl',
    'open-positions',
    traderId,
    tokenAddress,
    walletAddress,
  ] as const;

const isMissingTrader = (error: unknown): boolean =>
  error instanceof TraderPositionHttpError &&
  (error.status === 404 || error.status === 403);

/**
 * One wallet's open position from `GET /api/v2/traders/{wallet}/{assetId}/open`.
 * `{assetId}` is the CAIP-19 id of the token on screen.
 * Polled on the same interval as `useTraderPosition` while the screen is focused.
 * 404 and 403 are "no ready position" (`null`), not an error. A different
 * wallet is tried once when the first address is not the one the caller holds.
 */
export const useOpenPositionForAsset = (
  traderId: string | undefined,
  tokenAddress: string | undefined,
  walletAddress?: string,
): UseOpenPositionForAssetResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const isFocused = useIsFocused();
  const enabled = Boolean(traderId && tokenAddress) && isUnlocked;

  const query = useQuery({
    queryKey: queryKey(traderId, tokenAddress, walletAddress),
    queryFn: async ({ signal }) => {
      try {
        return await getOpenPositionForAsset(
          traderId ?? '',
          tokenAddress ?? '',
          signal,
        );
      } catch (error) {
        const fallback =
          walletAddress && walletAddress !== traderId
            ? walletAddress
            : undefined;
        if (isMissingTrader(error) && fallback) {
          try {
            return await getOpenPositionForAsset(
              fallback,
              tokenAddress ?? '',
              signal,
            );
          } catch (retryError) {
            if (isMissingTrader(retryError)) {
              return null;
            }
            throw retryError;
          }
        }
        if (isMissingTrader(error)) {
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
    // The trader id is deliberately left out: these extras reach Sentry.
    queryParams: { tokenAddress: tokenAddress ?? '' },
  });

  const refetchPosition = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    position: data?.pnl ?? null,
    sharePosition: data?.position ?? null,
    earliestTradeAt: data?.earliestTradeAt,
    isLoading: enabled && isLoading,
    error: formatSocialQueryErrorMessage(error),
    refetch: refetchPosition,
  };
};
