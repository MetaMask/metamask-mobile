import {
  array,
  boolean,
  number,
  object,
  optional,
  record,
  string,
  unknown,
  type Infer,
} from '@metamask/superstruct';
import {
  HexStringSchema,
  PreparedLimitOrderDelegationSchema,
} from '../getDelegations/schema';

/**
 * A delegation returned by `GET /v2/limit-orders/delegations`, passed back with
 * `delegation.signature` replaced by the delegator's EIP-712 signature. The
 * shape is otherwise identical, `typedData` included, since the API verifies
 * the signature against exactly what it issued.
 */
export const SignedLimitOrderDelegationSchema =
  PreparedLimitOrderDelegationSchema;

export type SignedLimitOrderDelegation = Infer<
  typeof SignedLimitOrderDelegationSchema
>;

/**
 * The condition that fills the order. `kind` and `threshold` are left as plain
 * strings so a value the API adds later doesn't fail validation; the request
 * side narrows them (see `LimitOrderTriggerKind`).
 */
export const LimitOrderTriggerSchema = object({
  kind: string(),
  threshold: string(),
  price: string(),
});

export type LimitOrderTrigger = Infer<typeof LimitOrderTriggerSchema>;

/**
 * An asset as described by the Bridge API. Only the fields the client relies on
 * are required; the rest are optional so extra or omitted metadata doesn't
 * fail validation.
 */
export const LimitOrderAssetSchema = object({
  assetId: string(),
  symbol: string(),
  decimals: number(),
  chainId: optional(number()),
  name: optional(string()),
  address: optional(string()),
  iconUrl: optional(string()),
  coingeckoId: optional(string()),
  aggregators: optional(array(string())),
  occurrences: optional(number()),
  fee: optional(number()),
  metadata: optional(record(string(), unknown())),
  price: optional(string()),
});

export type LimitOrderAsset = Infer<typeof LimitOrderAssetSchema>;

/**
 * One leg of an order or of a fill, as an asset plus the amount moved.
 */
export const LimitOrderLegSchema = object({
  asset: LimitOrderAssetSchema,
  amount: string(),
  usd: optional(string()),
  /**
   * The enforceable floor on the receiving leg, i.e. `destAmount` less the
   * price tolerance. Absent on the paying leg and on fills.
   */
  minAmount: optional(string()),
});

export type LimitOrderLeg = Infer<typeof LimitOrderLegSchema>;

/**
 * Lifecycle timestamps, as ISO-8601 strings. `closedAt` is only set once the
 * order or transaction has reached a terminal state.
 */
export const LimitOrderTimingDataSchema = object({
  createdAt: string(),
  expiresAt: optional(string()),
  closedAt: optional(string()),
});

export type LimitOrderTimingData = Infer<typeof LimitOrderTimingDataSchema>;

/**
 * The created order. `state` and `failureReason` stay plain strings so new
 * server-side states don't fail validation.
 */
export const CreatedLimitOrderSchema = object({
  id: string(),
  clientOrderId: string(),
  profileId: optional(string()),
  /** CAIP-10 account id of the delegator. */
  account: string(),
  src: LimitOrderLegSchema,
  dest: LimitOrderLegSchema,
  trigger: LimitOrderTriggerSchema,
  state: string(),
  timingData: LimitOrderTimingDataSchema,
  isCancellable: optional(boolean()),
  failureReason: optional(string()),
});

export type CreatedLimitOrder = Infer<typeof CreatedLimitOrderSchema>;

/**
 * A fill attempt against the order. Present from the first response for an
 * order that filled immediately, otherwise an empty list.
 */
export const CreatedLimitOrderTransactionSchema = object({
  status: string(),
  txHash: optional(HexStringSchema),
  quoteId: optional(string()),
  src: LimitOrderLegSchema,
  dest: LimitOrderLegSchema,
  timingData: LimitOrderTimingDataSchema,
  // Fee shapes vary by chain and quote provider, so this is carried through
  // rather than validated further.
  feeData: optional(record(string(), unknown())),
});

export type CreatedLimitOrderTransaction = Infer<
  typeof CreatedLimitOrderTransactionSchema
>;

/**
 * Response body for `POST /v2/limit-orders`.
 */
export const CreateLimitOrderResponseSchema = object({
  order: CreatedLimitOrderSchema,
  transactions: optional(array(CreatedLimitOrderTransactionSchema)),
});

export type CreateLimitOrderResponse = Infer<
  typeof CreateLimitOrderResponseSchema
>;
