import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collectorCryptPacksOptions } from '../queries/packs';
import { toErrorState } from '../services/errors';
import type { CollectorCryptErrorState, CollectorCryptPack } from '../types';

const EMPTY_PACKS: CollectorCryptPack[] = [];

export interface UseCollectorCryptPacksResult {
  packs: CollectorCryptPack[];
  /** First load, no data yet. */
  isLoading: boolean;
  error: CollectorCryptErrorState | undefined;
  refetch: () => Promise<void>;
}

/** Open CollectorCrypt packs (react-query, cached for a minute). */
export const useCollectorCryptPacks = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseCollectorCryptPacksResult => {
  const query = useQuery({ ...collectorCryptPacksOptions(), enabled });
  const { refetch: refetchQuery } = query;

  const refetch = useCallback(async (): Promise<void> => {
    await refetchQuery();
  }, [refetchQuery]);

  const error = useMemo(
    () => (query.error ? toErrorState(query.error) : undefined),
    [query.error],
  );

  return {
    packs: query.data ?? EMPTY_PACKS,
    isLoading: enabled && query.isPending && query.isFetching,
    error: query.data ? undefined : error,
    refetch,
  };
};
