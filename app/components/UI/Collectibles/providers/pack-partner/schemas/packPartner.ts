/**
 * Runtime validation of the PackPartner API payloads.
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
  literal,
  refine,
  nullable,
  number,
  optional,
  string,
  type,
  union,
  unknown,
  type Infer,
  type Struct,
} from '@metamask/superstruct';
import { PACK_PARTNER_RARITIES } from '../constants/packPartner';

/** Optional and nullable, the default for fields we only read. */
const maybe = <T, S>(struct: Struct<T, S>) => optional(nullable(struct));

/** A value sent either as a number or as a numeric string. */
const NumberOrStringStruct = union([number(), string()]);

/** Required operation references and transaction bytes must not be blank. */
const NonEmptyStringStruct = refine(
  string(),
  'non-empty string',
  (value) => value.trim().length > 0,
);

/** Attribute values are strings, but numbers and booleans are coerced. */
const AttributeValueStruct = coerce(
  string(),
  union([number(), boolean()]),
  (value) => String(value),
);

/** Lower-cased tier name, as used by `/machines`. */
export const TierKeyStruct = enums(PACK_PARTNER_RARITIES);

/** One value per tier, keyed by the lower-cased tier name. */
const tierRecord = <T, S>(struct: Struct<T, S>) =>
  type({
    common: struct,
    uncommon: struct,
    rare: struct,
    epic: struct,
  });

// ---------- GET /machines ----------

export const PpMachineStruct = type({
  /** Machine code, used as `packType`. */
  code: string(),
  name: string(),
  shortName: string(),
  mobile_name: maybe(string()),
  image: maybe(string()),
  /** Can be relative to the collectibles host. */
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
  /** Probability of each tier, fractions summing to 1. */
  odds: tierRecord(number()),
  /** Whole-USD insured value range per tier. */
  tierRanges: tierRecord(type({ start: number(), end: number() })),
  stock: maybe(tierRecord(number())),
  ev: maybe(number()),
});
export type PpMachine = Infer<typeof PpMachineStruct>;

export const PpMachinesResponseStruct = type({ machines: array(unknown()) });

// ---------- GET /status ----------

export const PpCollectiblesStatusStruct = type({
  code: string(),
  /** `open` | `closed`. */
  status: string(),
  name: maybe(string()),
  price: maybe(number()),
  isOpen: maybe(boolean()),
});
export type PpCollectiblesStatus = Infer<typeof PpCollectiblesStatusStruct>;

export const PpStatusStruct = type({
  /** `running` | `stopped`. */
  machineStatus: string(),
  gachas: array(PpCollectiblesStatusStruct),
});
export type PpStatus = Infer<typeof PpStatusStruct>;

// ---------- POST /generatePack ----------

export const PpGeneratePackResponseStruct = type({
  memo: NonEmptyStringStruct,
  /** Base64 wire transaction, partially signed by PackPartner. */
  transaction: NonEmptyStringStruct,
});

export const PpGeneratePacksResponseStruct = type({
  yoloId: NonEmptyStringStruct,
  count: number(),
  transactions: array(PpGeneratePackResponseStruct),
});

// ---------- POST /submitTransaction ----------

export const PpSubmitTransactionResponseStruct = type({
  success: maybe(boolean()),
  signature: NonEmptyStringStruct,
  /** `confirmed` | `finalized` | `submitted`. */
  confirmationStatus: maybe(string()),
});

// ---------- POST /openPack ----------

export const PpAttributeStruct = type({
  trait_type: string(),
  value: maybe(AttributeValueStruct),
});

export const PpNftFileStruct = type({
  uri: maybe(string()),
  cdn_uri: maybe(string()),
  /** Optimized CDN image. `files[0]` is the front; `uri` is the original. */
  cc_cdn: maybe(string()),
  mime: maybe(string()),
});

export const PpNftWonStruct = type({
  id: maybe(string()),
  content: type({
    files: maybe(array(PpNftFileStruct)),
    links: maybe(type({ image: maybe(string()) })),
    json_uri: maybe(string()),
    metadata: type({
      /** Can be truncated; `json_name` holds the full name. */
      name: string(),
      json_name: maybe(string()),
      symbol: maybe(string()),
      description: maybe(string()),
      attributes: maybe(array(PpAttributeStruct)),
      insuredValue: maybe(NumberOrStringStruct),
    }),
  }),
  ownership: maybe(type({ owner: maybe(string()) })),
  nft_standard: maybe(string()),
  image: maybe(string()),
});
export type PpNftWon = Infer<typeof PpNftWonStruct>;

// ---------- GET /getAllWinners ----------

export const PpWinnerStruct = type({
  winner: string(),
  nft_address: string(),
  nft: PpNftWonStruct,
  insuredValue: maybe(NumberOrStringStruct),
  created_at: refine(string(), 'timestamp', (value) =>
    Number.isFinite(Date.parse(value)),
  ),
  pack_type: string(),
  prize_tier: maybe(enums([1, 2, 3, 4])),
});
export type PpWinner = Infer<typeof PpWinnerStruct>;

export const PpWinnersResponseStruct = type({
  success: literal(true),
  data: array(PpWinnerStruct),
});

// ---------- GET /getNfts ----------

export const PpInventoryNftStruct = type({
  ...PpNftWonStruct.schema,
  nft_address: string(),
  name: maybe(string()),
  description: maybe(string()),
  rarity: maybe(string()),
  insured_value: maybe(NumberOrStringStruct),
});
export type PpInventoryNft = Infer<typeof PpInventoryNftStruct>;

export const PpInventoryResponseStruct = type({
  nfts: array(PpInventoryNftStruct),
  hasMore: boolean(),
  nextCursor: maybe(string()),
});

export const PpOpenPackAwardedStruct = type({
  success: maybe(literal(true)),
  transactionSignature: NonEmptyStringStruct,
  nft_address: NonEmptyStringStruct,
  nftWon: PpNftWonStruct,
  points: maybe(number()),
  /** Capitalised: `Epic` | `Rare` | `Uncommon` | `Common`. */
  rarity: maybe(string()),
  roll: maybe(number()),
  code: maybe(string()),
  /** Base units: number on first open, string on re-open. */
  buybackAmount: maybe(NumberOrStringStruct),
});

export const PpOpenPackPendingStruct = type({
  success: maybe(boolean()),
  code: enums(['WAITING_FOR_WEBHOOK', 'SEND_PENDING']),
  memo: maybe(string()),
});

/** Awarded or pending. The pending struct is tried first. */
export const PpOpenPackResponseStruct = union([
  PpOpenPackPendingStruct,
  PpOpenPackAwardedStruct,
]);
export type PpOpenPackResponse = Infer<typeof PpOpenPackResponseStruct>;

// ---------- GET /pack/status ----------

export const PpPackRowStruct = type({
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

export const PpSendRowStruct = type({
  nft_address: maybe(NonEmptyStringStruct),
  /** Base58, `turbomode` or null. */
  transaction_signature: maybe(string()),
  status: maybe(string()),
  webhook_sent: maybe(boolean()),
  insured_value: maybe(NumberOrStringStruct),
  /** 1 Epic, 2 Rare, 3 Uncommon, 4 Common. */
  prize_tier: maybe(number()),
});

export const PpBuybackRowStruct = type({
  refund_amount: maybe(NumberOrStringStruct),
  transaction_signature: maybe(string()),
  status: maybe(string()),
  webhook_confirmed: maybe(boolean()),
  created_at: maybe(string()),
});

export const PpPackStatusStruct = type({
  /** Null when queried by an unknown signature. */
  memo: maybe(string()),
  pack: maybe(PpPackRowStruct),
  send: maybe(PpSendRowStruct),
  buyback: maybe(array(PpBuybackRowStruct)),
});
export type PpPackStatus = Infer<typeof PpPackStatusStruct>;

// ---------- Buyback ----------

export const PpBuybackAvailableStruct = type({
  available: boolean(),
  /** Base units. */
  amount: maybe(NumberOrStringStruct),
});

export const PpBuybackResponseStruct = type({
  success: maybe(literal(true)),
  /** Base64 wire transaction, partially signed by PackPartner. */
  serializedTransaction: NonEmptyStringStruct,
  /** Base units. */
  refundAmount: NumberOrStringStruct,
  /** Original pack memo. */
  memo: NonEmptyStringStruct,
});

export const PpBuybackCheckStruct = type({
  exists: boolean(),
  /** `complete` | '' (pending). */
  status: maybe(string()),
  transactionSignature: maybe(string()),
  /** Base units. */
  buybackAmount: maybe(NumberOrStringStruct),
  nft: maybe(NonEmptyStringStruct),
  playerWallet: maybe(NonEmptyStringStruct),
  message: maybe(string()),
});

// ---------- GET {cards API}/cards/{wallet}/ ----------

export const PpWalletCardStruct = type({
  /** PackPartner card id. */
  id: maybe(string()),
  nftAddress: NonEmptyStringStruct,
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
export type PpWalletCard = Infer<typeof PpWalletCardStruct>;

export const PpWalletCardsResponseStruct = type({
  filterNFtCard: array(unknown()),
  /** Only an explicit null marks a complete inventory. */
  nextCursor: nullable(NonEmptyStringStruct),
});
