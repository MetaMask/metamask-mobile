/** Runtime validation of MetaMask's Solana NFT API responses. */
import {
  array,
  boolean,
  coerce,
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

const maybe = <T, S>(struct: Struct<T, S>) => optional(nullable(struct));
const AttributeValueStruct = coerce(
  string(),
  union([number(), boolean()]),
  (value) => String(value),
);

export const SolanaNftAttributeStruct = type({
  key: string(),
  value: maybe(AttributeValueStruct),
});

export const SolanaNftItemStruct = type({
  chain: maybe(string()),
  /** Owner address. */
  address: maybe(string()),
  /** Mint. */
  token_address: string(),
  balance: maybe(number()),
  acquired_at: maybe(string()),
  isSpam: maybe(boolean()),
  nft_token: type({
    address: maybe(string()),
    token_standard: maybe(string()),
    name: maybe(string()),
    description: maybe(string()),
    image_url: maybe(string()),
    media_url: maybe(string()),
    external_url: maybe(string()),
    attributes: maybe(array(SolanaNftAttributeStruct)),
    creators: maybe(
      array(
        type({
          address: string(),
          share: maybe(number()),
          verified: maybe(union([number(), boolean()])),
        }),
      ),
    ),
    collection_name: maybe(string()),
    onchain_collection_address: maybe(string()),
  }),
});
export type SolanaNftItem = Infer<typeof SolanaNftItemStruct>;

/**
 * Lenient envelope of an item: the mint and the fields that identify its
 * collection. Lets callers tell which malformed items they depend on.
 */
export const SolanaNftItemRefStruct = type({
  token_address: string(),
  nft_token: maybe(
    type({
      onchain_collection_address: maybe(string()),
      creators: maybe(array(unknown())),
    }),
  ),
});
export type SolanaNftItemRef = Infer<typeof SolanaNftItemRefStruct>;

export const SolanaNftResponseStruct = type({
  items: array(unknown()),
  cursor: maybe(string()),
  error: maybe(unknown()),
});
