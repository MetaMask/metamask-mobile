import { useCallback, useState } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import Engine from '../../../../../../core/Engine';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { packPartnerQueries } from '../../../services/data/packPartnerQueries';
import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import type {
  PackPartnerBuyback,
  PackPartnerAccount,
} from '../types/packPartner';

export type BuybackDisplay =
  | { status: 'checking' }
  | { status: 'available'; amount: string }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'pending'; hasFailed: boolean };

/** What the buyback offer box shows for an offer and its read state. */
export const getBuybackDisplay = (
  buyback: PackPartnerBuyback | undefined,
  {
    hasFailed,
    isChecking = false,
    isSalePending = false,
  }: { hasFailed: boolean; isChecking?: boolean; isSalePending?: boolean },
): BuybackDisplay => {
  if (isSalePending) {
    return { status: 'pending', hasFailed };
  }
  if (isChecking) {
    return { status: 'checking' };
  }
  if (hasFailed) {
    return { status: 'error' };
  }
  if (buyback?.status === 'available' && buyback.amount) {
    return { status: 'available', amount: buyback.amount };
  }
  if (buyback?.status === 'unavailable') {
    return { status: 'unavailable' };
  }
  return { status: 'checking' };
};

export interface UseBuybackOfferResult {
  /** PackPartner's current offer, once read. */
  offer: PackPartnerBuyback | undefined;
  isChecking: boolean;
  /**
   * The offer read failed. A failed read never means the card has no offer.
   * A pending sale is not a failure: its outcome is checked on demand.
   */
  hasFailed: boolean;
  /** Reads the offer again, or checks the pending sale without signing. */
  retry: () => Promise<void>;
}

/**
 * PackPartner's buyback offer for a card, read through
 * `PackPartnerDataService`. A pending sale is not read as an offer: its
 * retry checks the account's pending sales by memo (`checkSales`).
 *
 * @param params - Parameters.
 * @param params.account - Account owning the card.
 * @param params.mint - Card mint.
 * @param params.enabled - Whether the offer is shown.
 * @param params.isSalePending - Whether a sale of the card is pending.
 * @returns The offer and its read state.
 */
export const useBuybackOffer = ({
  account,
  mint,
  enabled,
  isSalePending = false,
}: {
  account: PackPartnerAccount | undefined;
  mint: string | undefined;
  enabled: boolean;
  isSalePending?: boolean;
}): UseBuybackOfferResult => {
  const networkTier = useNetworkTier();
  const isEnabled =
    enabled && Boolean(account && mint) && networkTier !== 'NONE';
  const descriptor = packPartnerQueries.getBuybackOffer(
    PACK_PARTNER_ENVIRONMENT,
    mint ?? '',
  );
  const { data, isFetching, isError, refetch } = useQuery<PackPartnerBuyback>({
    queryKey: descriptor.queryKey,
    enabled: isEnabled && !isSalePending,
  });
  const address = account?.address;
  const [isCheckingSale, setIsCheckingSale] = useState(false);
  const retry = useCallback(async (): Promise<void> => {
    if (!isEnabled || !address) return;
    if (isSalePending) {
      setIsCheckingSale(true);
      try {
        // Never throws: an unresolved sale simply stays pending.
        await Engine.context.CollectiblesController.checkSales({ address });
      } finally {
        setIsCheckingSale(false);
      }
      return;
    }
    await refetch();
  }, [isEnabled, isSalePending, address, refetch]);

  return {
    offer: isEnabled ? data : undefined,
    isChecking: isEnabled && (isSalePending ? isCheckingSale : isFetching),
    hasFailed: isEnabled && !isSalePending && isError,
    retry,
  };
};

/**
 * Current buyback offers of several cards, by mint, read through the same
 * `PackPartnerDataService` entries as `useBuybackOffer`. A mint whose
 * offer is not read yet, or failed, is absent.
 *
 * @param mints - Card mints, a stable array.
 * @param enabled - Whether the offers are shown.
 * @returns The offers read so far, by mint.
 */
export const useBuybackOffers = (
  mints: readonly string[],
  enabled: boolean,
): Record<string, PackPartnerBuyback> => {
  const networkTier = useNetworkTier();
  const isEnabled = enabled && networkTier !== 'NONE';
  const combine = useCallback(
    (results: UseQueryResult[]) =>
      Object.fromEntries(
        mints.flatMap((mint, index) => {
          // Typed by the data service action the key addresses.
          const offer = results[index]?.data as PackPartnerBuyback | undefined;
          return offer ? [[mint, offer] as const] : [];
        }),
      ),
    [mints],
  );
  return useQueries({
    queries: mints.map((mint) => {
      const descriptor = packPartnerQueries.getBuybackOffer(
        PACK_PARTNER_ENVIRONMENT,
        mint,
      );
      // Same defaults as react-data-query: freshness and retries belong to
      // the data service.
      return {
        queryKey: descriptor.queryKey,
        staleTime: 0,
        retry: false,
        enabled: isEnabled,
      };
    }),
    combine,
  });
};
