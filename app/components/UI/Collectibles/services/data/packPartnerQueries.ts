import type { PackPartnerOpeningFilters } from '../../providers/pack-partner/types/openings';
import type { PackPartnerEnvironment } from '../../providers/pack-partner/constants/environment';

// Catalogue freshness is checked on each read; concurrent requests still coalesce.
export const PACK_PARTNER_PACKS_STALE_TIME = 0;
export const PACK_PARTNER_INVENTORY_STALE_TIME = 30_000;
export const PACK_PARTNER_GREATEST_HITS_STALE_TIME = 5 * 60_000;
export const PACK_PARTNER_OWNED_CARDS_STALE_TIME = 30_000;
export const PACK_PARTNER_BUYBACK_OFFER_STALE_TIME = 30_000;
/** Always refresh polled snapshots; concurrent identical reads still coalesce. */
export const PACK_PARTNER_RECENT_OPENINGS_STALE_TIME = 0;

/**
 * One PackPartner read, as addressed by the UI query proxy, the background
 * cache and invalidation. `family` is the params-independent key prefix that
 * a write invalidates.
 */
export interface PackPartnerQueryDescriptor<
  Key extends readonly [string, ...unknown[]],
> {
  queryKey: Key;
  family: readonly [string, ...string[]];
  staleTime: number;
}

/**
 * Descriptors of every `PackPartnerDataService` read. Every key is scoped
 * by environment. The owned-cards key carries the public Solana address the
 * PackPartner route requires, never a credential.
 */
export const packPartnerQueries = {
  getPacks: (
    environment: PackPartnerEnvironment,
  ): PackPartnerQueryDescriptor<
    ['PackPartnerDataService:getPacks', PackPartnerEnvironment]
  > => ({
    queryKey: ['PackPartnerDataService:getPacks', environment],
    family: ['PackPartnerDataService:getPacks', environment],
    staleTime: PACK_PARTNER_PACKS_STALE_TIME,
  }),
  getPackInventory: (
    environment: PackPartnerEnvironment,
    packCode: string,
  ): PackPartnerQueryDescriptor<
    ['PackPartnerDataService:getPackInventory', PackPartnerEnvironment, string]
  > => ({
    queryKey: [
      'PackPartnerDataService:getPackInventory',
      environment,
      packCode,
    ],
    family: ['PackPartnerDataService:getPackInventory', environment],
    staleTime: PACK_PARTNER_INVENTORY_STALE_TIME,
  }),
  getGreatestHits: (
    environment: PackPartnerEnvironment,
  ): PackPartnerQueryDescriptor<
    ['PackPartnerDataService:getGreatestHits', PackPartnerEnvironment]
  > => ({
    queryKey: ['PackPartnerDataService:getGreatestHits', environment],
    family: ['PackPartnerDataService:getGreatestHits', environment],
    staleTime: PACK_PARTNER_GREATEST_HITS_STALE_TIME,
  }),
  getOwnedCards: (
    environment: PackPartnerEnvironment,
    address: string,
  ): PackPartnerQueryDescriptor<
    ['PackPartnerDataService:getOwnedCards', PackPartnerEnvironment, string]
  > => ({
    queryKey: ['PackPartnerDataService:getOwnedCards', environment, address],
    family: ['PackPartnerDataService:getOwnedCards', environment, address],
    staleTime: PACK_PARTNER_OWNED_CARDS_STALE_TIME,
  }),
  getBuybackOffer: (
    environment: PackPartnerEnvironment,
    mint: string,
  ): PackPartnerQueryDescriptor<
    ['PackPartnerDataService:getBuybackOffer', PackPartnerEnvironment, string]
  > => ({
    queryKey: ['PackPartnerDataService:getBuybackOffer', environment, mint],
    family: ['PackPartnerDataService:getBuybackOffer', environment, mint],
    staleTime: PACK_PARTNER_BUYBACK_OFFER_STALE_TIME,
  }),
  getRecentOpenings: (
    environment: PackPartnerEnvironment,
    filters: PackPartnerOpeningFilters,
  ): PackPartnerQueryDescriptor<
    [
      'PackPartnerDataService:getRecentOpenings',
      PackPartnerEnvironment,
      PackPartnerOpeningFilters,
    ]
  > => ({
    queryKey: [
      'PackPartnerDataService:getRecentOpenings',
      environment,
      filters,
    ],
    family: ['PackPartnerDataService:getRecentOpenings', environment],
    staleTime: PACK_PARTNER_RECENT_OPENINGS_STALE_TIME,
  }),
};

/**
 * Query families a terminal workflow outcome changes, as key prefixes.
 * Opening a pack adds a card to the wallet; a buyback removes it from the
 * wallet and ends its offer. Public pools only follow their own stale times.
 */
export const packPartnerQueryFamilies = {
  opened: (
    environment: PackPartnerEnvironment,
    address: string,
  ): (readonly [string, ...string[]])[] => [
    packPartnerQueries.getOwnedCards(environment, address).family,
  ],
  sold: (
    environment: PackPartnerEnvironment,
    address: string,
    mint: string,
  ): (readonly [string, ...string[]])[] => [
    packPartnerQueries.getOwnedCards(environment, address).family,
    packPartnerQueries.getBuybackOffer(environment, mint).family,
  ],
  offerChanged: (
    environment: PackPartnerEnvironment,
    mint: string,
  ): (readonly [string, ...string[]])[] => [
    packPartnerQueries.getBuybackOffer(environment, mint).family,
  ],
};
