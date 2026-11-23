import type { ActivityListItem } from '../../../../util/activity-adapters';
import { usePredictImplementation } from '../implementation';
import { usePredictActivityItems as useLegacyPredictActivityItems } from './internal/legacy/usePredictActivityItems';
import { useNextActivityItems } from './internal/next/useNextActivityItems';

export interface PredictActivityItemsResult {
  items: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Loads the next page of Predict Activity. */
  loadMore: () => Promise<void>;
  /** Whether more Predict Activity is available to load. */
  hasMore: boolean;
  /** Whether a load-more request is currently in flight. */
  isFetchingMore: boolean;
  /**
   * Whether a Predictions row from another source, such as a funding
   * transaction, belongs to a Venue other than the Active Venue. Predictions
   * views hide those rows; generic wallet history keeps them.
   */
  isInactiveVenueItem: (item: ActivityListItem) => boolean;
}

const settled = () => Promise.resolve();
const noInactiveVenueItems = () => false;

const NO_ACTIVITY: PredictActivityItemsResult = {
  items: [],
  isLoading: false,
  error: null,
  refetch: settled,
  loadMore: settled,
  hasMore: false,
  isFetchingMore: false,
  isInactiveVenueItem: noInactiveVenueItems,
};

const RESOLVING_ACTIVITY: PredictActivityItemsResult = {
  ...NO_ACTIVITY,
  isLoading: true,
};

export interface UsePredictActivityItemsOptions {
  /**
   * Whether to load Activity. The legacy branch ensures the Polygon network
   * while enabled, so keep it `false` until the caller needs the items.
   */
  enabled?: boolean;
}

/**
 * The Active Venue's Predict Activity as shared {@link ActivityListItem}s for
 * the unified Activity list. The legacy branch passes `usePredictActivity`
 * through `mapPredictActivity` unchanged. The next branch maps the Venue's
 * canonical Trades and Settlements. Only the active branch reads.
 */
export const usePredictActivityItems = ({
  enabled = true,
}: UsePredictActivityItemsOptions = {}): PredictActivityItemsResult => {
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';
  const nextVenueId =
    resolution.status === 'ready' && resolution.implementation === 'next'
      ? resolution.venueId
      : undefined;
  const legacy = useLegacyPredictActivityItems({
    enabled: enabled && isLegacy,
  });
  const next = useNextActivityItems({ venueId: nextVenueId, enabled });

  if (resolution.status === 'resolving') {
    return enabled ? RESOLVING_ACTIVITY : NO_ACTIVITY;
  }
  return isLegacy
    ? { ...legacy, isInactiveVenueItem: noInactiveVenueItems }
    : next;
};
