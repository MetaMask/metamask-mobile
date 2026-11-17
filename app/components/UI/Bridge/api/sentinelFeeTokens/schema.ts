import {
  array,
  integer,
  intersection,
  min,
  optional,
  record,
  refine,
  string,
  type,
  unknown,
  type Infer,
} from '@metamask/superstruct';
import {
  CaipAssetTypeStruct,
  CaipChainIdStruct,
  parseCaipAssetType,
} from '@metamask/utils';

/**
 * A required string that is present and not empty. Sentinel uses these for the
 * token address and symbol.
 */
const NonEmptyStringSchema = refine(
  string(),
  'NonEmptyString',
  (value) => value.length > 0 || 'Expected a non-empty string',
);

/**
 * One Sentinel fee token. Unknown fields are allowed so additive API metadata
 * does not invalidate the entire response.
 */
export const SentinelFeeTokenSchema = type({
  assetId: CaipAssetTypeStruct,
  address: NonEmptyStringSchema,
  symbol: NonEmptyStringSchema,
  name: optional(string()),
  decimals: min(integer(), 0),
  iconUrl: optional(string()),
  aliasAddress: optional(string()),
});

export type SentinelFeeToken = Infer<typeof SentinelFeeTokenSchema>;

/**
 * `record()` treats an array as an object, so an empty array would otherwise
 * validate. Require a plain object before checking the chain keys.
 */
const PlainObjectSchema = refine(
  unknown(),
  'PlainObject',
  (value) =>
    (typeof value === 'object' && value !== null && !Array.isArray(value)) ||
    'Expected an object',
);

const SentinelFeeTokensByChainSchema = intersection([
  PlainObjectSchema,
  record(CaipChainIdStruct, array(SentinelFeeTokenSchema)),
]);

/**
 * Sentinel fee tokens grouped by CAIP-2 chain ID.
 *
 * A token's asset id carries its own chain, and `record()` checks keys and
 * values separately, so this refine rejects a token filed under another chain.
 */
export const SentinelFeeTokensResponseSchema = refine(
  SentinelFeeTokensByChainSchema,
  'SentinelFeeTokensResponse',
  (tokensByChain) => {
    for (const [chainId, tokens] of Object.entries(tokensByChain)) {
      for (const token of tokens) {
        if (parseCaipAssetType(token.assetId).chainId !== chainId) {
          return `asset ${token.assetId} does not belong to ${chainId}`;
        }
      }
    }

    return true;
  },
);

export type SentinelFeeTokensByChain = Infer<
  typeof SentinelFeeTokensResponseSchema
>;
