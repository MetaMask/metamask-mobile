import type { ActivityListItem } from '../../../../util/activity-adapters';
import { usePredictImplementation } from '../implementation';
import { usePredictActivityItems as useLegacyPredictActivityItems } from './internal/legacy/usePredictActivityItems';

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
}

const settled = async () => undefined;

const NO_ACTIVITY: PredictActivityItemsResult = {
  items: [],
  isLoading: false,
  error: null,
  refetch: settled,
  loadMore: settled,
  hasMore: false,
  isFetchingMore: false,
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
 * through `mapPredictActivity` unchanged and is the only branch that runs
 * while legacy is active. The next branch returns no items until E5
 * (PRED-1410).
 */
export const usePredictActivityItems = ({
  enabled = true,
}: UsePredictActivityItemsOptions = {}): PredictActivityItemsResult => {
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';
  const legacy = useLegacyPredictActivityItems({
    enabled: enabled && isLegacy,
  });

  if (resolution.status === 'resolving') {
    return enabled ? RESOLVING_ACTIVITY : NO_ACTIVITY;
  }
  return isLegacy ? legacy : NO_ACTIVITY;
};
