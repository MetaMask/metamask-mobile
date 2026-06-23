/**
 * Renderless bridge between the Predict domain and the unified Activity list.
 *
 * `usePredictActivity` fires a Polygon-network-ensure side effect on mount, so
 * the unified list cannot call it unconditionally — Predict may be disabled.
 * Mount this component only when Predict is enabled; it lifts the normalized
 * items up through `onChange`.
 */
import { useEffect } from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { usePredictActivityItems } from './usePredictActivityItems';

export interface PredictActivitySourceState {
  items: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  refetch?: () => Promise<void>;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  isFetchingMore?: boolean;
}

export const INITIAL_PREDICT_ACTIVITY_SOURCE_STATE: PredictActivitySourceState =
  {
    items: [],
    isLoading: false,
    error: null,
    hasMore: false,
    isFetchingMore: false,
  };

interface PredictActivitySourceProps {
  onChange: (state: PredictActivitySourceState) => void;
}

export function PredictActivitySource({
  onChange,
}: PredictActivitySourceProps) {
  const {
    items,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    isFetchingMore,
  } = usePredictActivityItems();

  useEffect(() => {
    onChange({
      items,
      isLoading,
      error,
      refetch,
      loadMore,
      hasMore,
      isFetchingMore,
    });
  }, [
    items,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    isFetchingMore,
    onChange,
  ]);

  return null;
}

export default PredictActivitySource;
