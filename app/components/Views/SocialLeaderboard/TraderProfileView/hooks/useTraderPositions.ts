import { useMemo, useEffect } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type {
  PositionsResponse,
  FetchPositionsOptions,
  Position,
} from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';

export interface UseTraderPositionsResult {
  openPositions: Position[];
  closedPositions: Position[];
  isLoadingOpen: boolean;
  isLoadingClosed: boolean;
  error: string | null;
}

export const useTraderPositions = (
  addressOrId: string,
): UseTraderPositionsResult => {
  const fetchOptions: FetchPositionsOptions = { addressOrId };

  const {
    data: openData,
    isLoading: isLoadingOpen,
    error: openError,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchOpenPositions', fetchOptions],
    enabled: Boolean(addressOrId),
  });

  const {
    data: closedData,
    isLoading: isLoadingClosed,
    error: closedError,
  } = useQuery<PositionsResponse>({
    queryKey: ['SocialService:fetchClosedPositions', fetchOptions],
    enabled: Boolean(addressOrId),
  });

  const openPositions = useMemo(() => openData?.positions ?? [], [openData]);

  const closedPositions = useMemo(
    () => closedData?.positions ?? [],
    [closedData],
  );

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
