import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { packPartnerQueries } from '../../../services/data/packPartnerQueries';
import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import { usePackPartnerAccount } from './usePackPartnerAccount';

/** Refresh the shared owned collection without mounting another query observer. */
export const useRefreshPackPartnerCards = (
  enabled = true,
): (() => Promise<void>) => {
  const queryClient = useQueryClient();
  const networkTier = useNetworkTier();
  const account = usePackPartnerAccount();
  const address = account?.address;

  return useCallback(async (): Promise<void> => {
    if (enabled && networkTier !== 'NONE' && address) {
      await queryClient.invalidateQueries({
        queryKey: packPartnerQueries.getOwnedCards(
          PACK_PARTNER_ENVIRONMENT,
          address,
        ).queryKey,
        exact: true,
      });
    }
  }, [enabled, networkTier, queryClient, address]);
};
