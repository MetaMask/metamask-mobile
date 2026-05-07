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
  error: string | null;
}

export const useTraderPositions = (
  addressOrId: string,
  options?: UseTraderPositionsOptions,
): UseTraderPositionsResult => {
  const fetchOptions: FetchPositionsOptions = { addressOrId };

  const {
    data: openData,
    isLoading: isLoadingOpen,
    error: openError,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchOpenPositions', fetchOptions],
    enabled: Boolean(addressOrId),
    refetchInterval: options?.refetchInterval,
  });

  const {
    data: closedData,
    isLoading: isLoadingClosed,
    error: closedError,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchClosedPositions', fetchOptions],
    enabled: Boolean(addressOrId),
  });

  const openPositions = openData?.positions ?? EMPTY_POSITIONS;
  const closedPositions = closedData?.positions ?? EMPTY_POSITIONS;

  const combinedError = openError ?? closedError;

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
    error:
      combinedError instanceof Error
        ? combinedError.message
        : combinedError
          ? String(combinedError)
          : null,
  };
};

export default useTraderPositions;
