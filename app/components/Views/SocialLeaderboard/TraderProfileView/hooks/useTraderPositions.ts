import { useEffect } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type {
  PositionsResponse,
  FetchPositionsOptions,
  Position,
} from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';

const EMPTY_POSITIONS: Position[] = [];

export interface UseTraderPositionsOptions {
  refetchInterval?: number;
}

export interface UseTraderPositionsResult {
  openPositions: Position[];
  closedPositions: Position[];
  isLoadingOpen: boolean;
  isLoadingClosed: boolean;
  /** Combined error (first non-null wins). Kept for backward-compat with TraderProfileView. */
  error: string | null;
  /** Raw error from the open-positions query, or null. */
  openError: string | null;
  /** Raw error from the closed-positions query, or null. */
  closedError: string | null;
}

const toErrorString = (err: unknown): string | null => {
  if (!err) return null;
  return err instanceof Error ? err.message : String(err);
};

export const useTraderPositions = (
  addressOrId: string,
  options?: UseTraderPositionsOptions,
): UseTraderPositionsResult => {
  const fetchOptions: FetchPositionsOptions = { addressOrId };

  const {
    data: openData,
    isLoading: isLoadingOpen,
    error: rawOpenError,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchOpenPositions', fetchOptions],
    enabled: Boolean(addressOrId),
    refetchInterval: options?.refetchInterval,
  });

  const {
    data: closedData,
    isLoading: isLoadingClosed,
    error: rawClosedError,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchClosedPositions', fetchOptions],
    enabled: Boolean(addressOrId),
    refetchInterval: options?.refetchInterval,
  });

  const openPositions = openData?.positions ?? EMPTY_POSITIONS;
  const closedPositions = closedData?.positions ?? EMPTY_POSITIONS;

  const combinedError = rawOpenError ?? rawClosedError;

  useEffect(() => {
    if (combinedError) {
      Logger.error(
        combinedError as Error,
        'useTraderPositions: positions fetch failed',
      );
    }
  }, [combinedError]);

  return {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    error: toErrorString(combinedError),
    openError: toErrorString(rawOpenError),
    closedError: toErrorString(rawClosedError),
  };
};

export default useTraderPositions;
