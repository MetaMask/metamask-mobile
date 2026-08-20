/**
 * Renderless bridge between the perps domain and the unified Activity list.
 *
 * `usePerpsActivityItems` (via `usePerpsTransactionHistory`) requires
 * `PerpsConnectionProvider` + `PerpsStreamProvider` and throws without them,
 * so the unified list cannot call it directly — the perps feature flag may be
 * off. Mount this component only when perps is enabled; it wraps the
 * providers itself and lifts the normalized items up through `onChange`.
 */
import React, { useEffect } from 'react';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { PerpsConnectionProvider } from '../../../UI/Perps/providers/PerpsConnectionProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { PerpsStreamProvider } from '../../../UI/Perps/providers/PerpsStreamManager';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { usePerpsActivityItems } from './usePerpsActivityItems';

export interface PerpsActivitySourceState {
  items: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  refetch?: () => Promise<void>;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  isFetchingMore?: boolean;
}

export const INITIAL_PERPS_ACTIVITY_SOURCE_STATE: PerpsActivitySourceState = {
  items: [],
  isLoading: false,
  error: null,
  hasMore: false,
  isFetchingMore: false,
};

interface PerpsActivitySourceProps {
  onChange: (state: PerpsActivitySourceState) => void;
}

function PerpsActivitySourceInner({ onChange }: PerpsActivitySourceProps) {
  const {
    items,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    isFetchingMore,
  } = usePerpsActivityItems();

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

export function PerpsActivitySource({ onChange }: PerpsActivitySourceProps) {
  return (
    <PerpsConnectionProvider suppressErrorView>
      <PerpsStreamProvider>
        <PerpsActivitySourceInner onChange={onChange} />
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
}

export default PerpsActivitySource;
