import type { PackPartnerInventoryCard } from './inventory';

/** Public opening event; never an owned card or an actionable buyback. */
export interface PackPartnerOpening extends PackPartnerInventoryCard {
  id: string;
  openedAt: number;
  /** Public recipient supplied by the provider event, not a Social profile identity. */
  openerAddress?: string;
}

/**
 * GET /getAllWinners options. Results are always newest first; the endpoint
 * exposes no sort parameter. Wallet overrides all filters except count;
 * perTier overrides all other filters and pagination when wallet is absent.
 */
// A type alias preserves implicit JSON compatibility for Messenger query keys.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerOpeningFilters = {
  packType?: string;
  timestamp?: string;
  slug?: string;
  epic?: boolean;
  /** Page size, 1–200. */
  count?: number;
  cursor?: string;
  wallet?: string;
  /** Latest wins per rarity, 1–25, plus latest wins per machine. */
  perTier?: number;
};
