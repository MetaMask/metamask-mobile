/**
 * Runtime validation of the CollectorCrypt API payloads.
 *
 * Objects use `type()` so unknown fields are tolerated, and every field that
 * is not strictly needed is `optional`/`nullable`. Services validate list items:
 * the catalogue skips malformed machines; holdings reject incomplete lists
 * so reconciliation never removes a card because its metadata was rejected.
 */
import {
  array,
  boolean,
  coerce,
  enums,
  integer,
  min,
  nullable,
  number,
  optional,
  string,
  type,
  union,
  unknown,
  type Describe,
  type Infer,
  type Struct,
} from '@metamask/superstruct';
import type { CollectorCryptRarity } from '../types';
import { COLLECTOR_CRYPT_RARITIES } from '../constants';

/** Optional and nullable, the default for fields we only read. */
const maybe = <T, S>(struct: Struct<T, S>) => optional(nullable(struct));

/** A value sent either as a number or as a numeric string. */
const NumberOrStringStruct = union([number(), string()]);

/** Attribute values are strings, but numbers and booleans are coerced. */
const AttributeValueStruct = coerce(
  string(),
  union([number(), boolean()]),
  (value) => String(value),
);

/** Lower-cased tier name, as used by `/machines`. */
export const TierKeyStruct: Describe<CollectorCryptRarity> = enums(
  COLLECTOR_CRYPT_RARITIES,
);

/** One value per tier, keyed by the lower-cased tier name. */
const tierRecord = <T, S>(struct: Struct<T, S>) =>
  type({
    common: struct,
    uncommon: struct,
    rare: struct,
    epic: struct,
  });

// ---------- GET /machines ----------

export const CcMachineStruct = type({
  /** Machine code, used as `packType`. */
  code: string(),
  name: string(),
  shortName: string(),
  mobile_name: maybe(string()),
  image: maybe(string()),
  /** Can be relative to the gacha host. */
  thumbnailUrl: maybe(string()),
  imageNobg: maybe(string()),
  public: boolean(),
  menuOrder: maybe(number()),
  menuCategory: maybe(string()),
  /** Whole USDC. */
  price: number(),
  contains: maybe(number()),
  /** Percent of the insured value. */
  instantBuyback: number(),
  turboMode: maybe(boolean()),
  odds: tierRecord(number()),
  /** Whole-USD insured value range per tier. */
  tierRanges: tierRecord(type({ start: number(), end: number() })),
  stock: maybe(tierRecord(number())),
  ev: maybe(number()),
});
export type CcMachine = Infer<typeof CcMachineStruct>;

export const CcMachinesResponseStruct = type({ machines: array(unknown()) });

// ---------- GET /status ----------

export const CcGachaStatusStruct = type({
  code: string(),
  /** `open` | `closed`. */
  status: string(),
  name: maybe(string()),
  price: maybe(number()),
  isOpen: maybe(boolean()),
});
export type CcGachaStatus = Infer<typeof CcGachaStatusStruct>;

export const CcStatusStruct = type({
  /** `running` | `stopped`. */
  machineStatus: string(),
  gachas: array(CcGachaStatusStruct),
});
export type CcStatus = Infer<typeof CcStatusStruct>;

// ---------- POST /generatePack ----------

export const CcGeneratePackResponseStruct = type({
  memo: string(),
  /** Base64 wire transaction, partially signed by CollectorCrypt. */
  transaction: string(),
});

// ---------- POST /submitTransaction ----------

export const CcSubmitTransactionResponseStruct = type({
  success: maybe(boolean()),
  signature: string(),
  /** `confirmed` | `finalized` | `submitted`. */
  confirmationStatus: maybe(string()),
});

// ---------- POST /openPack ----------

export const CcAttributeStruct = type({
  trait_type: string(),
  value: maybe(AttributeValueStruct),
});

export const CcNftFileStruct = type({
  uri: maybe(string()),
  cdn_uri: maybe(string()),
  /** Optimized CDN image. `files[0]` is the front; `uri` is the original. */
  cc_cdn: maybe(string()),
  mime: maybe(string()),
});

export const CcNftWonStruct = type({
  id: maybe(string()),
  content: type({
    files: maybe(array(CcNftFileStruct)),
    links: maybe(type({ image: maybe(string()) })),
    json_uri: maybe(string()),
    metadata: type({
      /** Can be truncated; `json_name` holds the full name. */
      name: string(),
      json_name: maybe(string()),
      symbol: maybe(string()),
      description: maybe(string()),
      attributes: maybe(array(CcAttributeStruct)),
      insuredValue: maybe(NumberOrStringStruct),
    }),
  }),
  ownership: maybe(type({ owner: maybe(string()) })),
  nft_standard: maybe(string()),
  image: maybe(string()),
});
export type CcNftWon = Infer<typeof CcNftWonStruct>;

export const CcOpenPackAwardedStruct = type({
  success: maybe(boolean()),
  transactionSignature: string(),
  nft_address: string(),
  nftWon: CcNftWonStruct,
  points: maybe(number()),
  /** Capitalised: `Epic` | `Rare` | `Uncommon` | `Common`. */
  rarity: maybe(string()),
  roll: maybe(number()),
  code: maybe(string()),
  /** Base units: number on first open, string on re-open. */
  buybackAmount: maybe(NumberOrStringStruct),
});

export const CcOpenPackPendingStruct = type({
  success: maybe(boolean()),
  code: enums(['WAITING_FOR_WEBHOOK', 'SEND_PENDING']),
  memo: maybe(string()),
});

/** Awarded or pending. The pending struct is tried first. */
export const CcOpenPackResponseStruct = union([
  CcOpenPackPendingStruct,
  CcOpenPackAwardedStruct,
]);
export type CcOpenPackResponse = Infer<typeof CcOpenPackResponseStruct>;

// ---------- GET /pack/status ----------

export const CcPackRowStruct = type({
  wallet: maybe(string()),
  transaction_signature: maybe(string()),
  created_at: maybe(string()),
  /** `confirmed` | null. */
  status: maybe(string()),
  webhook_received: maybe(boolean()),
  refunded: maybe(boolean()),
  pack_type: maybe(string()),
  turbo_mode: maybe(boolean()),
});

export const CcSendRowStruct = type({
  nft_address: maybe(string()),
  /** Base58, `turbomode` or null. */
  transaction_signature: maybe(string()),
  status: maybe(string()),
  webhook_sent: maybe(boolean()),
  insured_value: maybe(NumberOrStringStruct),
  /** 1 Epic, 2 Rare, 3 Uncommon, 4 Common. */
  prize_tier: maybe(number()),
});

export const CcBuybackRowStruct = type({
  refund_amount: maybe(NumberOrStringStruct),
  transaction_signature: maybe(string()),
  status: maybe(string()),
  webhook_confirmed: maybe(boolean()),
  created_at: maybe(string()),
});

export const CcPackStatusStruct = type({
  /** Null when queried by an unknown signature. */
  memo: maybe(string()),
  pack: maybe(CcPackRowStruct),
  send: maybe(CcSendRowStruct),
  buyback: maybe(array(CcBuybackRowStruct)),
});
export type CcPackStatus = Infer<typeof CcPackStatusStruct>;

// ---------- Buyback ----------

export const CcBuybackAvailableStruct = type({
  available: boolean(),
  /** Base units. */
  amount: maybe(NumberOrStringStruct),
});

export const CcBuybackResponseStruct = type({
  success: maybe(boolean()),
  /** Base64 wire transaction, partially signed by CollectorCrypt. */
  serializedTransaction: string(),
  /** Base units. */
  refundAmount: NumberOrStringStruct,
  /** Original pack memo. */
  memo: string(),
});

export const CcBuybackCheckStruct = type({
  exists: boolean(),
  /** `complete` | '' (pending). */
  status: maybe(string()),
  transactionSignature: maybe(string()),
  /** Base units. */
  buybackAmount: maybe(NumberOrStringStruct),
  nft: maybe(string()),
  playerWallet: maybe(string()),
  message: maybe(string()),
});

// ---------- GET {cards API}/cards/{wallet}/ ----------

export const CcWalletCardStruct = type({
  /** CollectorCrypt card id. */
  id: maybe(string()),
  nftAddress: string(),
  itemName: maybe(string()),
  blockchain: maybe(string()),
  nftStandard: maybe(string()),
  status: maybe(string()),
  nftStatus: maybe(string()),
  /** Whole USD, usually a string. */
  insuredValue: maybe(NumberOrStringStruct),
  listing: maybe(
    type({
      price: maybe(NumberOrStringStruct),
      currency: maybe(string()),
      status: maybe(string()),
    }),
  ),
  grade: maybe(string()),
  gradeNum: maybe(NumberOrStringStruct),
  gradingCompany: maybe(string()),
  category: maybe(string()),
  year: maybe(NumberOrStringStruct),
  set: maybe(string()),
  serial: maybe(string()),
  parallel: maybe(string()),
  frontImage: maybe(string()),
  backImage: maybe(string()),
  images: maybe(
    type({
      front: maybe(string()),
      frontM: maybe(string()),
      frontS: maybe(string()),
      back: maybe(string()),
      backM: maybe(string()),
      backS: maybe(string()),
    }),
  ),
  getBuybackOffer: maybe(boolean()),
  lastTransferredAt: maybe(string()),
  owner: maybe(type({ wallet: maybe(string()), name: maybe(string()) })),
});
export type CcWalletCard = Infer<typeof CcWalletCardStruct>;

export const CcWalletCardsResponseStruct = type({
  filterNFtCard: array(unknown()),
  totalPages: maybe(min(integer(), 0)),
});
