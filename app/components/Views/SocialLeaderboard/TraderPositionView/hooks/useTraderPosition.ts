import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { Position } from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';
import {
  addSocialBreadcrumb,
  buildSocialErrorExtras,
  categoriseSocialError,
  extractHttpStatus,
} from '../../../../../util/social/socialServiceTelemetry';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';

export interface UseTraderPositionResult {
  position: Position | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Resolves a single canonical Position by its UUID via
 * `SocialService.fetchPositionById`. Used when TraderPositionView is
 * reached without a row-tap snapshot (deep link, push notification).
 */
export const useTraderPosition = (
  positionId: string | undefined,
): UseTraderPositionResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const fetchOptions = { positionId: positionId ?? '' };

  const queryKey: [string, { positionId: string }] = [
    'SocialService:fetchPositionById',
    fetchOptions,
  ];

  const { data, isLoading, error, refetch } = useQuery<Position>({
    queryKey,
    enabled: Boolean(positionId) && isUnlocked,
  });

  const refetchPosition = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      Logger.error(err as Error, 'useTraderPosition: refetch failed');
      throw err;
    }
  }, [refetch]);

  useEffect(() => {
    if (error) {
      Logger.error(
        error as Error,
        buildSocialErrorExtras({
          extraMessage: 'useTraderPosition: fetch failed',
          endpoint: 'position_by_id',
          error,
        }),
      );
      addSocialBreadcrumb({
        endpoint: 'position_by_id',
        errorCategory: categoriseSocialError(error),
        httpStatus: extractHttpStatus(error),
      });
    }
  }, [error]);

  return {
    position: data,
    isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    refetch: refetchPosition,
  };
};

export default useTraderPosition;
