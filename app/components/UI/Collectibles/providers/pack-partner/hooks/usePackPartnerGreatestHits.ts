import { packPartnerQueries } from '../../../services/data/packPartnerQueries';
import { useQuery } from '@metamask/react-data-query';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import type { PackPartnerInventoryCard } from '../types/inventory';

/** Highest current insured values in the public pools. Not a historical leaderboard. */
export function usePackPartnerGreatestHits(enabled = true) {
  const networkTier = useNetworkTier();
  const descriptor = packPartnerQueries.getGreatestHits(
    PACK_PARTNER_ENVIRONMENT,
  );
  return useQuery<PackPartnerInventoryCard[]>({
    queryKey: descriptor.queryKey,
    enabled: enabled && networkTier !== 'NONE',
  });
}
