import { useMemo } from 'react';
import { usePositions } from '../../../hooks/usePositions';
import {
  portfolioQueries,
  type PositionsPageParams,
} from '../../../queries/portfolioQueries';
import type { PredictPosition, PredictVenueId } from '../../../types';
import { dedupeLatestPositions } from '../../../utils/positions';

/** As many Positions as the Polymarket Homepage section shows. */
export const MAX_HOME_POSITIONS = 5;

/** The contract's Home read: the top open Positions by current value, one
 * unpaginated page computed over the same traversal as the Summary. */
export const HOME_POSITIONS_PARAMS: PositionsPageParams = {
  status: ['open'],
  sort: 'value',
  limit: MAX_HOME_POSITIONS,
};

export const homePositionsQueryKey = (venueId: PredictVenueId) =>
  portfolioQueries.getPositions(venueId, HOME_POSITIONS_PARAMS).queryKey;

export type HomePositionsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; positions: PredictPosition[] };

const LOADING: HomePositionsState = { status: 'loading' };
const ERROR: HomePositionsState = { status: 'error' };

/**
 * The Homepage rows. A failed read, including a failed refresh, is an
 * `error`: rows cached from before it are stale and are not shown. A read
 * without data, including one paused offline, is `loading`.
 */
export const useHomePositions = (
  venueId: PredictVenueId,
): HomePositionsState => {
  const { data, isError } = usePositions(venueId, HOME_POSITIONS_PARAMS);

  return useMemo(() => {
    if (isError) return ERROR;
    if (!data) return LOADING;
    return {
      status: 'ready',
      positions: dedupeLatestPositions(data.pages)
        .filter(
          (position) =>
            position.venueId === venueId && position.status === 'open',
        )
        .slice(0, MAX_HOME_POSITIONS),
    };
  }, [data, isError, venueId]);
};
