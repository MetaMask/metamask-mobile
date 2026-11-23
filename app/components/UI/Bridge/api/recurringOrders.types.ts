import {
  array,
  boolean,
  enums,
  number,
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
  isCaipAccountId,
} from '@metamask/utils';
import {
  HexStringSchema as LimitOrderHexStringSchema,
  PreparedLimitOrderDelegationSchema,
  LimitOrderDelegationsResponseSchema,
  type LimitOrderDelegationsResponse,
} from './limitOrders/getDelegations/schema';

export const RecurringOrderState = {
  Open: 'OPEN',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
} as const;

export const RecurringSwapStatus = {
  Submitted: 'SUBMITTED',
  Filled: 'FILLED',
  Skipped: 'SKIPPED',
  Failed: 'FAILED',
} as const;

export const RecurringOrderStateSchema = enums([
  RecurringOrderState.Open,
  RecurringOrderState.Completed,
  RecurringOrderState.Cancelled,
]);
export type RecurringOrderState = Infer<typeof RecurringOrderStateSchema>;

export const RecurringSwapStatusSchema = enums([
  RecurringSwapStatus.Submitted,
  RecurringSwapStatus.Filled,
  RecurringSwapStatus.Skipped,
  RecurringSwapStatus.Failed,
]);
export type RecurringSwapStatus = Infer<typeof RecurringSwapStatusSchema>;

export const RecurringSwapSkipReasonSchema = enums([
  'not_enough_gas',
  'out_of_price_range',
  'insufficient_balance',
  'no_quotes_available',
  'needs_smart_account',
  'execution_failed',
]);
export type RecurringSwapSkipReason = Infer<
  typeof RecurringSwapSkipReasonSchema
>;

export const AtomicStringSchema = string();
export type AtomicString = Infer<typeof AtomicStringSchema>;

export const FloatStringSchema = string();
export type FloatString = Infer<typeof FloatStringSchema>;

export const IsoDateTimeSchema = string();
export type IsoDateTime = Infer<typeof IsoDateTimeSchema>;

export const CaipAccountIdSchema = refine(
  string(),
  'CaipAccountId',
  isCaipAccountId,
);
export type CaipAccountId = Infer<typeof CaipAccountIdSchema>;

export const CaipAssetIdSchema = CaipAssetTypeStruct;
export type CaipAssetId = Infer<typeof CaipAssetIdSchema>;

export const HexStringSchema = LimitOrderHexStringSchema;
export type HexString = Infer<typeof HexStringSchema>;

export const RecurringIntervalUnitSchema = enums([
  'minute',
  'hour',
  'day',
  'week',
  'month',
]);
export type RecurringIntervalUnit = Infer<typeof RecurringIntervalUnitSchema>;

export const RecurringScheduleSchema = type({
  every: number(),
  unit: RecurringIntervalUnitSchema,
  repeatCount: number(),
});
export type RecurringSchedule = Infer<typeof RecurringScheduleSchema>;

export const PrepareRecurringDelegationQuerySchema = type({
  clientOrderId: string(),
  accountAddress: CaipAccountIdSchema,
  srcAssetId: CaipAssetIdSchema,
  srcAmount: AtomicStringSchema,
  destAssetId: CaipAssetIdSchema,
  every: number(),
  unit: RecurringIntervalUnitSchema,
  repeatCount: number(),
});
export type PrepareRecurringDelegationQuery = Infer<
  typeof PrepareRecurringDelegationQuerySchema
>;

export const PrepareRecurringDelegationResponseSchema =
  LimitOrderDelegationsResponseSchema;
export type PrepareRecurringDelegationResponse = LimitOrderDelegationsResponse;

export const RecurringOrderPriceRangeSchema = type({
  side: enums(['src', 'dest']),
  currency: enums(['USD']),
  min: optional(FloatStringSchema),
  max: optional(FloatStringSchema),
});
export type RecurringOrderPriceRange = Infer<
  typeof RecurringOrderPriceRangeSchema
>;

export const CreateRecurringOrderRequestSchema = type({
  accountAddress: CaipAccountIdSchema,
  clientOrderId: string(),
  src: type({
    assetId: CaipAssetIdSchema,
    amount: AtomicStringSchema,
  }),
  dest: type({
    assetId: CaipAssetIdSchema,
  }),
  priceTolerance: number(),
  schedule: RecurringScheduleSchema,
  priceRange: optional(RecurringOrderPriceRangeSchema),
  delegations: array(PreparedLimitOrderDelegationSchema),
});
export type CreateRecurringOrderRequest = Infer<
  typeof CreateRecurringOrderRequestSchema
>;

export const RecurringOrderCancelReasonSchema = enums([
  'user',
  'balance_exhausted',
  'delegation_revoked',
  'delegation_expired',
]);
export type RecurringOrderCancelReason = Infer<
  typeof RecurringOrderCancelReasonSchema
>;

export const RecurringOrderWarningSchema = enums([
  'insufficient_balance',
  'expiring_soon',
]);
export type RecurringOrderWarning = Infer<typeof RecurringOrderWarningSchema>;

export const RecurringOrderAssetSchema = type({
  chainId: number(),
  assetId: CaipAssetIdSchema,
  name: string(),
  symbol: string(),
  address: string(),
  decimals: number(),
  iconUrl: optional(string()),
  coingeckoId: optional(string()),
  aggregators: array(string()),
  occurrences: optional(number()),
  fee: optional(number()),
  metadata: optional(record(string(), unknown())),
  price: optional(string()),
});
export type RecurringOrderAsset = Infer<typeof RecurringOrderAssetSchema>;

export const RecurringAmountAndAssetSchema = type({
  asset: RecurringOrderAssetSchema,
  amount: AtomicStringSchema,
  usd: optional(FloatStringSchema),
});

export const RecurringOrderSchema = type({
  id: string(),
  clientOrderId: string(),
  profileId: string(),
  account: CaipAccountIdSchema,
  src: RecurringAmountAndAssetSchema,
  dest: type({
    asset: RecurringOrderAssetSchema,
  }),
  totalAmount: AtomicStringSchema,
  schedule: RecurringScheduleSchema,
  priceRange: optional(RecurringOrderPriceRangeSchema),
  priceTolerance: number(),
  fillData: type({
    src: type({
      amount: AtomicStringSchema,
      usd: optional(FloatStringSchema),
    }),
    dest: type({
      amount: AtomicStringSchema,
      usd: optional(FloatStringSchema),
    }),
    count: number(),
    skippedCount: number(),
    failedCount: number(),
    averageExecutionPriceUsd: optional(FloatStringSchema),
  }),
  state: RecurringOrderStateSchema,
  timingData: type({
    createdAt: IsoDateTimeSchema,
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
    nextSwapAt: optional(IsoDateTimeSchema),
    closedAt: optional(IsoDateTimeSchema),
  }),
  warnings: array(RecurringOrderWarningSchema),
  isCancellable: boolean(),
  cancelReason: optional(RecurringOrderCancelReasonSchema),
});
export type RecurringOrder = Infer<typeof RecurringOrderSchema>;

export const RecurringOrderEnvelopeSchema = type({
  order: RecurringOrderSchema,
});
export type RecurringOrderEnvelope = Infer<typeof RecurringOrderEnvelopeSchema>;

export const RecurringOrderPageResponseSchema = type({
  orders: array(RecurringOrderSchema),
  endCursor: optional(string()),
  hasNextPage: boolean(),
  total: number(),
});
export type RecurringOrderPageResponse = Infer<
  typeof RecurringOrderPageResponseSchema
>;

export const RecurringSwapSchema = type({
  id: string(),
  slotNumber: number(),
  status: RecurringSwapStatusSchema,
  skipReason: optional(RecurringSwapSkipReasonSchema),
  failureReason: optional(string()),
  src: RecurringAmountAndAssetSchema,
  dest: RecurringAmountAndAssetSchema,
  txHash: optional(HexStringSchema),
  quoteId: optional(string()),
  timingData: type({
    scheduledAt: IsoDateTimeSchema,
    executedAt: IsoDateTimeSchema,
  }),
  feeData: optional(record(string(), unknown())),
});
export type RecurringSwap = Infer<typeof RecurringSwapSchema>;

export const RecurringSwapPageResponseSchema = type({
  swaps: array(RecurringSwapSchema),
  endCursor: optional(string()),
  hasNextPage: boolean(),
  total: number(),
});
export type RecurringSwapPageResponse = Infer<
  typeof RecurringSwapPageResponseSchema
>;

export const CreateRecurringOrderResponseSchema = RecurringOrderEnvelopeSchema;
export type CreateRecurringOrderResponse = RecurringOrderEnvelope;

export const ListRecurringOrdersQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
  states: optional(array(RecurringOrderStateSchema)),
  chainIds: optional(array(CaipChainIdStruct)),
  assetId: optional(CaipAssetIdSchema),
  limit: optional(number()),
  after: optional(string()),
});
export type ListRecurringOrdersQuery = Infer<
  typeof ListRecurringOrdersQuerySchema
>;

export const ListRecurringOrdersResponseSchema =
  RecurringOrderPageResponseSchema;
export type ListRecurringOrdersResponse = RecurringOrderPageResponse;

export const GetRecurringOrderQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
});
export type GetRecurringOrderQuery = Infer<typeof GetRecurringOrderQuerySchema>;

export const GetRecurringOrderResponseSchema = RecurringOrderEnvelopeSchema;
export type GetRecurringOrderResponse = RecurringOrderEnvelope;

export const ListRecurringSwapsQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
  limit: optional(number()),
  after: optional(string()),
});
export type ListRecurringSwapsQuery = Infer<
  typeof ListRecurringSwapsQuerySchema
>;

export const ListRecurringSwapsResponseSchema = RecurringSwapPageResponseSchema;
export type ListRecurringSwapsResponse = RecurringSwapPageResponse;

export const CancelRecurringOrderQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
});
export type CancelRecurringOrderQuery = Infer<
  typeof CancelRecurringOrderQuerySchema
>;

export const CancelRecurringOrderResponseSchema = RecurringOrderEnvelopeSchema;
export type CancelRecurringOrderResponse = RecurringOrderEnvelope;

export const RecurringApiErrorCodeSchema = string();
export type RecurringApiErrorCode = Infer<typeof RecurringApiErrorCodeSchema>;

export const RecurringApiErrorSchema = type({
  code: RecurringApiErrorCodeSchema,
  message: string(),
  details: optional(record(string(), unknown())),
});
export type RecurringApiError = Infer<typeof RecurringApiErrorSchema>;

export interface RecurringOrdersQueryParams {
  walletAddress: string;
  orderStates?: RecurringOrderState[];
  chainId?: Infer<typeof CaipChainIdStruct>;
  assetId?: CaipAssetId;
  limit?: number;
}

export interface GetRecurringOrdersByAssetQuery {
  walletAddress: string;
  assetId: CaipAssetId;
}

export type GetRecurringOrdersByAssetResponse = RecurringOrder[];

export interface RecurringSwapsQueryParams {
  accountAddress: CaipAccountId;
  limit?: number;
}
