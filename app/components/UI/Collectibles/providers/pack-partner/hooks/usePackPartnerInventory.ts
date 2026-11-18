import { packPartnerQueries } from '../../../services/data/packPartnerQueries';
import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { useMemo } from 'react';
import { useInfiniteQuery } from '@metamask/react-data-query';
import type { PackPartnerInventoryPage } from '../types/inventory';

/** Public inventory is transient, paginated, and isolated by pack code. */
export const usePackPartnerInventory = (packCode: string, enabled: boolean) => {
  const networkTier = useNetworkTier();
  const descriptor = packPartnerQueries.getPackInventory(
    PACK_PARTNER_ENVIRONMENT,
    packCode,
  );
  const query = useInfiniteQuery<PackPartnerInventoryPage>({
    queryKey: descriptor.queryKey,
    initialPageParam: null,
    maxPages: 10,
    getNextPageParam: (lastPage, _pages, _lastParam, pageParams) =>
      lastPage.nextCursor && !pageParams.includes(lastPage.nextCursor)
        ? lastPage.nextCursor
        : undefined,
    enabled: enabled && networkTier !== 'NONE',
  });
  // A changing live pool can repeat a mint between cursor pages.
  const cards = useMemo(
    () => [
      ...new Map(
        query.data?.pages
          .flatMap((page) => page.cards)
          .map((card) => [card.mint, card]),
      ).values(),
    ],
    [query.data],
  );
  return { ...query, cards };
};
