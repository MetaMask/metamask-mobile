import {
  array,
  boolean,
  enums,
  number,
  object,
  optional,
  record,
  refine,
  string,
  unknown,
  type Infer,
} from '@metamask/superstruct';

/**
 * Loose 0x-prefixed hex string (address, hash, or arbitrary bytes). This is
 * intentionally permissive about length/casing since the Bridge API is the
 * source of truth for byte lengths.
 */
export const HexStringSchema = refine(string(), 'HexString', (value) =>
  /^0x[0-9a-fA-F]*$/.test(value),
);

/**
 * Which leg a prepared delegation covers.
 */
export const LimitOrderDelegationPurposeSchema = enums(['approval', 'swap']);

export type LimitOrderDelegationPurpose = Infer<
  typeof LimitOrderDelegationPurposeSchema
>;

/**
 * A single caveat attached to a delegation, as returned by the Bridge API.
 */
export const LimitOrderDelegationCaveatSchema = object({
  enforcer: HexStringSchema,
  terms: HexStringSchema,
  args: HexStringSchema,
});

export type LimitOrderDelegationCaveat = Infer<
  typeof LimitOrderDelegationCaveatSchema
>;

/**
 * The on-chain delegation structure to be signed with `eth_signTypedData_v4`
 * and later redeemed by the Delegation Manager.
 */
export const LimitOrderDelegationStructSchema = object({
  delegate: HexStringSchema,
  delegator: HexStringSchema,
  authority: HexStringSchema,
  caveats: array(LimitOrderDelegationCaveatSchema),
  salt: HexStringSchema,
  signature: HexStringSchema,
});

export type LimitOrderDelegationStruct = Infer<
  typeof LimitOrderDelegationStructSchema
>;

/**
 * A single EIP-712 typed-data field descriptor, e.g. `{ name, type }`.
 */
export const Eip712FieldSchema = object({
  name: string(),
  type: string(),
});

export type Eip712Field = Infer<typeof Eip712FieldSchema>;

/**
 * The EIP-712 payload to sign for a prepared delegation.
 */
export const LimitOrderDelegationTypedDataSchema = object({
  domain: object({
    name: string(),
    version: string(),
    chainId: number(),
    verifyingContract: HexStringSchema,
  }),
  primaryType: string(),
  types: record(string(), array(Eip712FieldSchema)),
  // The message shape mirrors the delegation, but the exact set of fields
  // depends on the EIP-712 `types` above, so it isn't validated further here.
  message: record(string(), unknown()),
});

export type LimitOrderDelegationTypedData = Infer<
  typeof LimitOrderDelegationTypedDataSchema
>;

/**
 * One delegation to sign, alongside the leg it covers and its EIP-712 payload.
 */
export const PreparedLimitOrderDelegationSchema = object({
  purpose: LimitOrderDelegationPurposeSchema,
  delegation: LimitOrderDelegationStructSchema,
  typedData: LimitOrderDelegationTypedDataSchema,
});

export type PreparedLimitOrderDelegation = Infer<
  typeof PreparedLimitOrderDelegationSchema
>;

/**
 * An asset and amount pair, as used for both the `src` and `dest` legs.
 */
export const PreparedLimitOrderAmountAndAssetSchema = object({
  assetId: string(),
  amount: string(),
  minAmount: optional(string()),
});

export type PreparedLimitOrderAmountAndAsset = Infer<
  typeof PreparedLimitOrderAmountAndAssetSchema
>;

/**
 * Echo of the requested order parameters, as resolved by the Bridge API.
 */
export const PreparedLimitOrderMetadataSchema = object({
  clientOrderId: string(),
  account: string(),
  src: PreparedLimitOrderAmountAndAssetSchema,
  dest: PreparedLimitOrderAmountAndAssetSchema,
  priceTolerance: number(),
  expiresAt: number(),
});

export type PreparedLimitOrderMetadata = Infer<
  typeof PreparedLimitOrderMetadataSchema
>;

/**
 * Response body for `GET /v2/limit/orders/delegations`.
 */
export const LimitOrderDelegationsResponseSchema = object({
  chainId: string(),
  delegationManager: HexStringSchema,
  swapRouter: HexStringSchema,
  approvalRequired: boolean(),
  order: PreparedLimitOrderMetadataSchema,
  delegations: array(PreparedLimitOrderDelegationSchema),
});

export type LimitOrderDelegationsResponse = Infer<
  typeof LimitOrderDelegationsResponseSchema
>;
