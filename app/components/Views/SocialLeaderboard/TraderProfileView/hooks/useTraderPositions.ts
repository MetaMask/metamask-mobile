import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  PositionsResponse,
  FetchPositionsOptions,
  Position,
} from '@metamask/social-controllers';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';

const EMPTY_POSITIONS: Position[] = [];
const TRADER_POSITIONS_SOURCE = 'useTraderPositions';

export interface UseTraderPositionsOptions {
  refetchInterval?: number;
}

export interface UseTraderPositionsResult {
  openPositions: Position[];
  closedPositions: Position[];
  isLoadingOpen: boolean;
  isLoadingClosed: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTraderPositions = (
  addressOrId: string,
  options?: UseTraderPositionsOptions,
): UseTraderPositionsResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const fetchOptions: FetchPositionsOptions = { addressOrId };

  const {
    data: openData,
    isLoading: isLoadingOpen,
    error: openError,
    refetch: refetchOpen,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchOpenPositions', fetchOptions],
    enabled: Boolean(addressOrId) && isUnlocked,
    refetchInterval: options?.refetchInterval,
  });

  const {
    data: closedData,
    isLoading: isLoadingClosed,
    error: closedError,
    refetch: refetchClosed,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchClosedPositions', fetchOptions],
    enabled: Boolean(addressOrId) && isUnlocked,
  });

  useLogSocialQueryError(openError, {
    surface: 'trader_profile',
    operation: 'fetch_open_positions',
    extraMessage: 'Trader open positions fetch failed',
    source: TRADER_POSITIONS_SOURCE,
    endpoint: 'open_positions',
  });

  useLogSocialQueryError(closedError, {
    surface: 'trader_profile',
    operation: 'fetch_closed_positions',
    extraMessage: 'Trader closed positions fetch failed',
    source: TRADER_POSITIONS_SOURCE,
    endpoint: 'closed_positions',
  });

  const openPositions = openData?.positions ?? EMPTY_POSITIONS;
  const closedPositions = closedData?.positions ?? EMPTY_POSITIONS;
  const combinedError = openError ?? closedError;

  const refetch = useCallback(async () => {
    const results = await Promise.allSettled([refetchOpen(), refetchClosed()]);
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (failures.length > 0) {
      failures.forEach(({ reason }) => {
        reportSocialServiceFailure(
          reason,
          {
            surface: 'trader_profile',
            operation: 'refetch_positions',
            extraMessage: 'Trader positions refetch failed',
            source: TRADER_POSITIONS_SOURCE,
          },
          { breadcrumb: false },
        );
      });
      throw failures[0].reason;
    }
  }, [refetchOpen, refetchClosed]);

  return {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    error: formatSocialQueryErrorMessage(combinedError),
    refetch,
  };
};

export default useTraderPositions;
