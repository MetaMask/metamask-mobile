import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { Position } from '@metamask/social-controllers';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';

export interface UseTraderPositionResult {
  position: Position | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TRADER_POSITION_SOURCE = 'useTraderPosition';

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

  const positionQueryParams = useMemo(
    () => ({ positionId: positionId ?? '' }),
    [positionId],
  );

  const queryKey: [string, { positionId: string }] = [
    'SocialService:fetchPositionById',
    fetchOptions,
  ];

  const { data, isLoading, error, refetch } = useQuery<Position>({
    queryKey,
    enabled: Boolean(positionId) && isUnlocked,
  });

  useLogSocialQueryError(error, {
    surface: 'trader_position',
    operation: 'fetch_position_by_id',
    extraMessage: 'Trader position fetch failed',
    source: TRADER_POSITION_SOURCE,
    endpoint: 'position_by_id',
    queryParams: positionQueryParams,
  });

  const refetchPosition = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      reportSocialServiceFailure(
        err,
        {
          surface: 'trader_position',
          operation: 'refresh',
          extraMessage: 'Trader position refresh failed',
          source: TRADER_POSITION_SOURCE,
          endpoint: 'position_by_id',
          queryParams: positionQueryParams,
        },
        { breadcrumb: false },
      );
      throw err;
    }
  }, [refetch, positionQueryParams]);

  return {
    position: data,
    isLoading,
    error: formatSocialQueryErrorMessage(error),
    refetch: refetchPosition,
  };
};

export default useTraderPosition;
