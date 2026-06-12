import { useCallback, useMemo } from 'react';
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { SPOT_CHAINS } from '../../../Homepage/Sections/TopTraders/constants';

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
  const FETCH_LIMIT = 100;
  const openFetchOptions: FetchPositionsOptions = {
    addressOrId,
    limit: FETCH_LIMIT,
  };
  // Clicker's default closed-positions sort is value-desc, which buries
  // smaller recent closes; ask for recency instead.
  const closedFetchOptions: FetchPositionsOptions = {
    addressOrId,
    sort: 'latest',
    limit: FETCH_LIMIT,
  };

  const {
    data: openData,
    isLoading: isLoadingOpen,
    error: openError,
    refetch: refetchOpen,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchOpenPositions', openFetchOptions],
    enabled: Boolean(addressOrId) && isUnlocked,
    refetchInterval: options?.refetchInterval,
  });

  const {
    data: closedData,
    isLoading: isLoadingClosed,
    error: closedError,
    refetch: refetchClosed,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchClosedPositions', closedFetchOptions],
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

  // Defensive spot-only filter: Clicker's `/positions` endpoint currently
  // excludes Hyperliquid by default, but that default is being flipped to
  // "all chains." Filter client-side until perps surfacing lands.
  const openPositions = useMemo(
    () =>
      (openData?.positions ?? EMPTY_POSITIONS).filter((p) =>
        SPOT_CHAINS.includes(p.chain),
      ),
    [openData?.positions],
  );
  const closedPositions = useMemo(
    () =>
      (closedData?.positions ?? EMPTY_POSITIONS).filter((p) =>
        SPOT_CHAINS.includes(p.chain),
      ),
    [closedData?.positions],
  );
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
