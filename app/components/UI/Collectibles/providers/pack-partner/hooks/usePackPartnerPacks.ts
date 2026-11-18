import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { useCallback, useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import { packPartnerQueries } from '../../../services/data/packPartnerQueries';
import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import { toErrorState } from '../services/errors';
import type {
  PackPartnerErrorState,
  PackPartnerPack,
} from '../types/packPartner';

const EMPTY_PACKS: PackPartnerPack[] = [];
const OFFLINE_ERROR: PackPartnerErrorState = { code: 'NETWORK_ERROR' };

export interface UsePackPartnerPacksResult {
  packs: PackPartnerPack[];
  isOffline: boolean;
  /** Catalogue refresh; prior packs are not displayed during loading. */
  isLoading: boolean;
  error: PackPartnerErrorState | undefined;
  refetch: () => Promise<void>;
}

/** Open PackPartner packs, read through `PackPartnerDataService`. */
export const usePackPartnerPacks = ({
  enabled = true,
}: { enabled?: boolean } = {}): UsePackPartnerPacksResult => {
  const networkTier = useNetworkTier();
  const queryClient = useQueryClient();
  const query = useQuery<PackPartnerPack[]>({
    queryKey: packPartnerQueries.getPacks(PACK_PARTNER_ENVIRONMENT).queryKey,
    enabled: enabled && networkTier !== 'NONE',
    gcTime: 0,
  });

  const refetch = useCallback(async (): Promise<void> => {
    if (networkTier !== 'NONE')
      await queryClient.invalidateQueries({
        queryKey: packPartnerQueries.getPacks(PACK_PARTNER_ENVIRONMENT)
          .queryKey,
        exact: true,
      });
  }, [queryClient, networkTier]);

  const isOffline = networkTier === 'NONE';
  const error = useMemo(
    () =>
      query.error
        ? toErrorState(query.error)
        : isOffline
          ? OFFLINE_ERROR
          : undefined,
    [query.error, isOffline],
  );

  return {
    packs:
      isOffline || query.isFetching || query.error
        ? EMPTY_PACKS
        : (query.data ?? EMPTY_PACKS),
    isOffline,
    isLoading: enabled && !isOffline && query.isFetching,
    error: enabled ? error : undefined,
    refetch,
  };
};
