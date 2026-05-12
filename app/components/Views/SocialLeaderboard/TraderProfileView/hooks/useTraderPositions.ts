import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  PositionsResponse,
  FetchPositionsOptions,
  Position,
} from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';
import {
  addSocialBreadcrumb,
  buildSocialErrorExtras,
  categoriseSocialError,
  extractHttpStatus,
} from '../../../../../util/social/socialServiceTelemetry';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';

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

  const openPositions = openData?.positions ?? EMPTY_POSITIONS;
  const closedPositions = closedData?.positions ?? EMPTY_POSITIONS;

  useEffect(() => {
    if (openError) {
      Logger.error(
        openError as Error,
        buildSocialErrorExtras({
          legacyMessage: 'useTraderPositions: positions fetch failed',
          endpoint: 'open_positions',
          error: openError,
        }),
      );
      addSocialBreadcrumb({
        endpoint: 'open_positions',
        errorCategory: categoriseSocialError(openError),
        httpStatus: extractHttpStatus(openError),
      });
    }
  }, [openError]);

  useEffect(() => {
    if (closedError) {
      Logger.error(
        closedError as Error,
        buildSocialErrorExtras({
          legacyMessage: 'useTraderPositions: positions fetch failed',
          endpoint: 'closed_positions',
          error: closedError,
        }),
      );
      addSocialBreadcrumb({
        endpoint: 'closed_positions',
        errorCategory: categoriseSocialError(closedError),
        httpStatus: extractHttpStatus(closedError),
      });
    }
  }, [closedError]);

  const combinedError = openError ?? closedError;

  const refetch = useCallback(async () => {
    try {
      await Promise.all([refetchOpen(), refetchClosed()]);
    } catch (err) {
      Logger.error(err as Error, 'useTraderPositions: refetch failed');
      throw err;
    }
  }, [refetchOpen, refetchClosed]);

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
    refetch,
  };
};

export default useTraderPositions;
