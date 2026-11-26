/**
 * PackPartner execution models, normalized from its API payloads.
 * Keep these names inside this provider and its DataServices. Application code
 * imports the direct Collectibles aliases in ../../../types instead.
 * No separate generic schema or identity mapper is needed for a single provider.
 */

/**
 * State-bearing shapes are type aliases, not interfaces: `BaseController`
 * requires `Json`-compatible state, which needs the implicit index signature
 * that only type aliases get.
 */

import type { PACK_PARTNER_RARITIES } from '../constants/packPartner';
import type { PpMachine } from '../schemas/packPartner';

/** Card rarity tier, lower-cased (PackPartner uses mixed casing). */
export type PackPartnerRarity = (typeof PACK_PARTNER_RARITIES)[number];

/** NFT standard advertised by Pack Partner. */
export type PackPartnerNftStandard =
  | 'core'
  | 'pnft'
  | 'nft'
  | 'cnft-core'
  | 'unknown';

/** Minimal reference to the selected Solana account used for every action. */
export interface PackPartnerAccount {
  /** InternalAccount id (UUID), used by the Solana Snap. */
  id: string;
  /** Base58 address, used by PackPartner and as the state key. */
  address: string;
}

/** A public, currently open PackPartner pack machine. */
export interface PackPartnerPack
  extends Pick<PpMachine, 'code' | 'name' | 'shortName' | 'price' | 'odds'> {
  /** Menu category (e.g. "Pokemon", "One Piece"), null when unknown. */
  category: string | null;
  /** Exact price used for signing, in USDC base units (6 decimals). */
  priceAmount: string;
  /** Instant buyback, in percent of the card insured value (e.g. 85). */
  instantBuybackPercent: number;
  /** Published insured-value bands; absent in older cached pack data. */
  tierRanges?: PpMachine['tierRanges'];
  /** Published expected value in USD, never a guaranteed return. */
  expectedValue?: number;
  /** Highest insured value (USD) a card from this pack can have. */
  maxValue: number;
  /** Sort key provided by PackPartner, lower first. */
  menuOrder: number | null;
}

/** Buyback offer shown for a card, read from PackPartner. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerBuyback = {
  /** `unknown` when PackPartner was not asked or did not answer. */
  status: 'unknown' | 'available' | 'unavailable';
  /** Offer in USDC base units (6 decimals), as a decimal string. */
  amount?: string;
};

/** Options explicitly reviewed in the purchase sheet. */
export interface PackPartnerPurchaseOptions {
  quantity: number;
  turbo: boolean;
}

/**
 * Sale state shown on a card. It is a projection of the account's
 * `PackPartnerBuybackOperation`, or the automatic Turbo payout of an opened pack; it is
 * never stored on owned cards.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerSale = {
  status: 'pending' | 'completed';
  /** Confirmed provider-side Turbo payout, never a client-side inferred sale. */
  automatic?: boolean;
  /** Refund in USDC base units, as a decimal string. */
  amount: string;
  /** Buyback transaction signature, once known. */
  signature?: string;
  /** Epoch ms. */
  updatedAt: number;
};

/** A PackPartner card (NFT). */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerCard = {
  /** NFT/asset address (base58). Primary key. */
  mint: string;
  name: string;
  /** Normalized NFT standard. */
  nftStandard?: PackPartnerNftStandard;
  /** Front image URL. */
  image?: string;
  /** Optimized front image for lists and the initial detail preview. */
  mediumImage?: string;
  /** Back image URL, when provided by PackPartner. */
  backImage?: string;
  /** Optimized back image for the initial detail preview. */
  mediumBackImage?: string;
  /** Grade label, e.g. "GEM-MT 10". */
  grade?: string;
  /** Grading company, e.g. "PSA". */
  gradingCompany?: string;
  /** Certificate identifier issued by the grading company. */
  gradingId?: string;
  /** Insured value in whole USD. */
  insuredValue?: number;
  /** Active listing price in whole USD/USDC, not a market appraisal. */
  listedPriceUsd?: number;
  rarity?: PackPartnerRarity;
  category?: string;
  year?: string;
  set?: string;
  /** Pack memo that produced this card, on an opened pack's result only. */
  memo?: string;
  /** Purchase batch, on an opened pack's result only. */
  batchId?: string;
  /** Pack code that produced this card, on an opened pack's result only. */
  packCode?: string;
  /**
   * Epoch ms of the last transfer to the wallet, as reported by PackPartner,
   * or of the opening for an opened pack's result. Zero when unknown.
   */
  acquiredAt: number;
  buyback: PackPartnerBuyback;
  sale?: PackPartnerSale;
};

/**
 * Lifecycle of one pack purchase:
 *
 * generated -> submitted -> paid -> opened
 *
 * `submitted` is recorded right after signing, before the payment is sent:
 * it includes attempted submissions whose response was lost. `expired`
 * (never paid) and `failed` (refund confirmed) are terminal. A `submitted` or
 * `paid` pack stays recoverable until PackPartner's pack status confirms
 * delivery, a refund, or no payment after the opening window.
 */
export type PackPartnerPackOperationStatus =
  | 'generated'
  | 'submitted'
  | 'paid'
  | 'opened'
  | 'expired'
  | 'failed';

/** Error codes surfaced to the UI. See `services/errors.ts`. */
export type PackPartnerErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'READ_CANCELLED'
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
  | 'OFFER_CHANGED'
  | 'SALE_PENDING'
  | 'NOT_FOUND'
  | 'UNKNOWN';

/** Serializable error stored in controller state. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerErrorState = {
  code: PackPartnerErrorCode;
};

/**
 * One pack purchase, persisted for recovery. Keyed by memo. Only safe
 * references are persisted: the memo is enough to resume it through
 * PackPartner's pack status. Signed bytes are never stored.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerPackOperation = {
  memo: string;
  /** Ordered memos of the purchase; also present for a single reviewed pack. */
  batchMemos?: string[];
  /** PackPartner yoloId, or the single-pack memo. */
  batchId?: string;
  /** Presentation progress; opening and Turbo never wait for it. */
  revealed?: boolean;
  revealCompleted?: boolean;
  turbo?: boolean;
  /**
   * The awarded card, once `opened`. It is the opening's receipt, shown by the
   * reveal and the batch summary; owned cards always come from PackPartner.
   */
  result?: PackPartnerCard;
  packCode: string;
  packName: string;
  /** Catalogue price in whole USDC, for display. */
  price: number;
  /** Price the user confirmed, in USDC base units: the amount signed. */
  priceAmount: string;
  status: PackPartnerPackOperationStatus;
  /** Epoch ms of `generatePack`. */
  createdAt: number;
  /** Epoch ms of the last transition. */
  updatedAt: number;
  /**
   * Base64 partially signed tx from `generatePack`. In memory only, while
   * `generated`; never persisted.
   */
  transaction?: string;
  /**
   * Mint of the awarded card, once `opened`. An `opened` operation stays in
   * state until the user dismisses the reveal, which is how the UI knows a
   * card still has to be revealed (for example after a recovery).
   */
  mint?: string;
  /** Last error. The operation stays resumable unless the status is terminal. */
  error?: PackPartnerErrorState;
};

/**
 * One manual buyback of a card, persisted for recovery. Keyed by mint. The
 * buyback memo returned by `POST /buyback` is enough to resolve it through
 * `/buyback/check`; signed bytes are never stored.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerBuybackOperation = {
  mint: string;
  /** Memo returned by `POST /buyback`, used by `/buyback/check`. */
  memo: string;
  /**
   * `pending`: prepared, signing or submitted, outcome unknown.
   * `completed`: PackPartner confirmed the buyback.
   */
  status: 'pending' | 'completed';
  /** Refund in USDC base units, as a decimal string. */
  amount: string;
  /** False until the signed transaction is handed to `/submitTransaction`. */
  submissionAttempted: boolean;
  /** Buyback transaction signature, once known. */
  signature?: string;
  /** Epoch ms of `POST /buyback`. */
  createdAt: number;
  /** Epoch ms of the last transition. */
  updatedAt: number;
};

/** Pack fields needed to start a purchase. */
export type PackPartnerPackRef = Pick<
  PackPartnerPack,
  'code' | 'name' | 'price' | 'priceAmount'
>;

/** Result of a successful buyback. */
export interface PackPartnerSaleResult {
  mint: string;
  /** Refund in USDC base units, as a decimal string. */
  amount: string;
  signature: string;
}
