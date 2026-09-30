/**
 * Domain types for the Gacha module.
 *
 * These types are app-facing: they are produced by the pure mappers in
 * `utils/` from the raw CollectorCrypt / MetaMask NFT API payloads described in
 * `schemas/`. UI and controller code only depend on these.
 */

/**
 * State-bearing shapes are type aliases, not interfaces: `BaseController`
 * requires `Json`-compatible state, which needs the implicit index signature
 * that only type aliases get.
 */

import type { COLLECTOR_CRYPT_RARITIES } from '../constants';

/** Card rarity tier, lower-cased (CollectorCrypt uses mixed casing). */
export type CollectorCryptRarity = (typeof COLLECTOR_CRYPT_RARITIES)[number];

/** Minimal reference to the selected Solana account used for every action. */
export interface SolanaAccountRef {
  /** InternalAccount id (UUID), used by the Solana Snap. */
  id: string;
  /** Base58 address, used by CollectorCrypt and as the state key. */
  address: string;
}

/** A public, currently open CollectorCrypt pack machine. */
export interface CollectorCryptPack {
  /** Machine code, used as `packType` by the API (e.g. `pokemon_50`). */
  code: string;
  /** Display name (e.g. "Elite Pokémon Gacha Pack"). */
  name: string;
  /** Short name (e.g. "PKMN 50"). */
  shortName: string;
  /** Menu category (e.g. "Pokemon", "One Piece"), null when unknown. */
  category: string | null;
  /** Price in whole USDC (e.g. 50 means 50 USDC). */
  price: number;
  /** Instant buyback, in percent of the card insured value (e.g. 85). */
  instantBuybackPercent: number;
  /** Probability of each tier, fractions summing to 1. */
  odds: Record<CollectorCryptRarity, number>;
  /** Highest insured value (USD) a card from this pack can have. */
  maxValue: number;
  /** Sort key provided by CollectorCrypt, lower first. */
  menuOrder: number | null;
}

/** Buyback eligibility cached for a card. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectorCryptBuyback = {
  status: 'unknown' | 'available' | 'unavailable';
  /** Offer in USDC base units (6 decimals), as a decimal string. */
  amount?: string;
  /** Epoch ms of the last `buyback/available` check. */
  checkedAt?: number;
};

/** Local sale (buyback) state attached to a card. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectorCryptSale = {
  /**
   * `pending`: the buyback transaction was signed and may have been submitted.
   * `completed`: CollectorCrypt accepted the buyback. The card is hidden and
   * kept as a tombstone until the indexers stop returning it.
   */
  status: 'pending' | 'completed';
  /** Refund in USDC base units, as a decimal string. */
  amount: string;
  /** Buyback transaction signature, once known. */
  signature?: string;
  /** Pack memo returned by `POST /buyback`. */
  memo?: string;
  /** Epoch ms. */
  updatedAt: number;
};

/** A CollectorCrypt card (NFT) owned by the account. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectorCryptCard = {
  /** NFT mint address (base58). Primary key. */
  mint: string;
  name: string;
  /** Front image URL. */
  image?: string;
  /** Grade label, e.g. "GEM-MT 10". */
  grade?: string;
  /** Grading company, e.g. "PSA". */
  gradingCompany?: string;
  /** Insured value in whole USD. */
  insuredValue?: number;
  rarity?: CollectorCryptRarity;
  category?: string;
  year?: string;
  set?: string;
  /** Pack memo that produced this card, when known locally. */
  memo?: string;
  /** Pack code that produced this card, when known locally. */
  packCode?: string;
  /** Where the latest metadata comes from. */
  source: 'openPack' | 'nftApi' | 'collectorCryptApi';
  /** Epoch ms when the card was first seen by this device. */
  acquiredAt: number;
  buyback: CollectorCryptBuyback;
  sale?: CollectorCryptSale;
};

/**
 * Lifecycle of one pack purchase. Transitions only move forward:
 *
 * generated -> signed -> submitted -> paid -> opened
 *
 * `expired` (never paid) and `failed` (paid but cannot be opened; CollectorCrypt
 * refunds automatically) are terminal.
 */
export type PackOperationStatus =
  | 'generated'
  | 'signed'
  | 'submitted'
  | 'paid'
  | 'opened'
  | 'expired'
  | 'failed';

/** Error codes surfaced to the UI. See `services/errors.ts`. */
export type CollectorCryptErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'MACHINE_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'SIGNING_REJECTED'
  | 'SNAP_UNSUPPORTED'
  | 'SUBMIT_FAILED'
  | 'PACK_EXPIRED'
  | 'PACK_FAILED'
  | 'OPEN_PENDING'
  | 'BUYBACK_UNAVAILABLE'
  | 'SALE_PENDING'
  | 'NOT_FOUND'
  | 'UNKNOWN';

/** Serializable error stored in controller state. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectorCryptErrorState = {
  code: CollectorCryptErrorCode;
  message?: string;
};

/** One pack purchase, persisted for recovery. Keyed by memo. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackOperation = {
  memo: string;
  packCode: string;
  packName: string;
  /** Whole USDC. */
  price: number;
  status: PackOperationStatus;
  /** Epoch ms of `generatePack`. */
  createdAt: number;
  /** Epoch ms of the last transition. */
  updatedAt: number;
  /** Base64 partially signed tx from `generatePack`. Only while `generated`. */
  transaction?: string;
  /** Base64 fully signed tx. Kept until `paid` so resubmission is idempotent. */
  signedTransaction?: string;
  /** Purchase transaction signature (base58). */
  signature?: string;
  /**
   * Mint of the awarded card, once `opened`. An `opened` operation stays in
   * state until the user dismisses the reveal, which is how the UI knows a
   * card still has to be revealed (for example after a recovery).
   */
  mint?: string;
  /** Last error. The operation stays resumable unless the status is terminal. */
  error?: CollectorCryptErrorState;
};

/** Pack fields needed to start a purchase. */
export type CollectorCryptPackRef = Pick<
  CollectorCryptPack,
  'code' | 'name' | 'price'
>;

/** Result of a successful buyback. */
export interface CollectorCryptSaleResult {
  mint: string;
  /** Refund in USDC base units, as a decimal string. */
  amount: string;
  signature: string;
}
