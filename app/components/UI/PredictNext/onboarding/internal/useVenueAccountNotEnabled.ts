import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { PredictError, PredictErrorCode } from '../../errors';
import { portfolioQueryFamilies } from '../../queries/portfolioQueries';
import type { PredictVenueId } from '../../types';

/**
 * True while any cached portfolio read of the venue failed because the user
 * has no enabled venue account. Reads the query cache only, so it never
 * starts a request of its own.
 */
export const useVenueAccountNotEnabled = (venueId: PredictVenueId): boolean => {
  const queryClient = useQueryClient();
  const subscribe = useCallback(
    (listener: () => void) => queryClient.getQueryCache().subscribe(listener),
    [queryClient],
  );
  const getSnapshot = useCallback(
    () =>
      portfolioQueryFamilies(venueId).some((queryKey) =>
        queryClient
          .getQueryCache()
          .findAll({ queryKey })
          .some(
            ({ state }) =>
              state.error instanceof PredictError &&
              state.error.code === PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED,
          ),
      ),
    [queryClient, venueId],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
};
