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
} from './limitOrders/getDelegations/schema';
import { LimitOrderAssetSchema } from './limitOrders/create/schema';

export const RecurringOrderState = {
  Open: 'OPEN',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  Expired: 'EXPIRED',
} as const;

export const RecurringSwapState = {
  Submitted: 'SUBMITTED',
  Filled: 'FILLED',
  Skipped: 'SKIPPED',
  Failed: 'FAILED',
} as const;

export const RecurringOrderStateSchema = enums([
  RecurringOrderState.Open,
  RecurringOrderState.Completed,
  RecurringOrderState.Cancelled,
  RecurringOrderState.Expired,
]);
export type RecurringOrderState = Infer<typeof RecurringOrderStateSchema>;

export const RecurringSwapStateSchema = enums([
  RecurringSwapState.Submitted,
  RecurringSwapState.Filled,
  RecurringSwapState.Skipped,
  RecurringSwapState.Failed,
]);
export type RecurringSwapState = Infer<typeof RecurringSwapStateSchema>;

export const RecurringSwapSkipReasonSchema = enums([
  'out_of_price_range',
  'insufficient_balance',
  'no_quotes_available',
  'needs_smart_account',
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

export const RecurringOrderAssetSchema = LimitOrderAssetSchema;

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

export const RecurringPriceRangeSchema = type({
  side: enums(['src', 'dest']),
  currency: enums(['usd']),
  min: optional(FloatStringSchema),
  max: optional(FloatStringSchema),
});
export type RecurringPriceRange = Infer<typeof RecurringPriceRangeSchema>;

export const RecurringTimingDataSchema = type({
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema,
  startedAt: optional(IsoDateTimeSchema),
  closedAt: optional(IsoDateTimeSchema),
});
export type RecurringTimingData = Infer<typeof RecurringTimingDataSchema>;

export const RecurringFillDataSchema = type({
  src: type({ amount: AtomicStringSchema }),
  dest: type({ amount: AtomicStringSchema }),
  count: number(),
  averageExecutionPriceUsd: optional(FloatStringSchema),
});
export type RecurringFillData = Infer<typeof RecurringFillDataSchema>;

export const RecurringOrderSchema = type({
  id: string(),
  clientOrderId: string(),
  profileId: string(),
  accountAddress: CaipAccountIdSchema,
  state: RecurringOrderStateSchema,
  src: type({
    asset: RecurringOrderAssetSchema,
    amount: AtomicStringSchema,
  }),
  dest: type({
    asset: RecurringOrderAssetSchema,
  }),
  schedule: RecurringScheduleSchema,
  priceRange: optional(RecurringPriceRangeSchema),
  slippage: number(),
  fillData: RecurringFillDataSchema,
  hasAttemptIssue: boolean(),
  timingData: RecurringTimingDataSchema,
  isCancellable: boolean(),
});
export type RecurringOrder = Infer<typeof RecurringOrderSchema>;

export const RecurringSwapSchema = type({
  id: string(),
  state: RecurringSwapStateSchema,
  skipReason: optional(RecurringSwapSkipReasonSchema),
  failureReason: optional(string()),
  src: type({
    asset: RecurringOrderAssetSchema,
    amount: AtomicStringSchema,
  }),
  dest: type({
    asset: RecurringOrderAssetSchema,
    amount: AtomicStringSchema,
    minAmount: optional(AtomicStringSchema),
  }),
  quoteId: optional(string()),
  txHash: optional(HexStringSchema),
  feeData: optional(record(string(), unknown())),
  timingData: type({
    scheduledAt: IsoDateTimeSchema,
    executedAt: optional(IsoDateTimeSchema),
  }),
});
export type RecurringSwap = Infer<typeof RecurringSwapSchema>;

export const PrepareRecurringDelegationQuerySchema = type({
  clientOrderId: string(),
  accountAddress: CaipAccountIdSchema,
  srcAssetId: CaipAssetIdSchema,
  srcAmount: AtomicStringSchema,
  destAssetId: CaipAssetIdSchema,
  slippage: number(),
  every: number(),
  unit: RecurringIntervalUnitSchema,
  repeatCount: number(),
});
export type PrepareRecurringDelegationQuery = Infer<
  typeof PrepareRecurringDelegationQuerySchema
>;

export const PreparedRecurringOrderSchema = type({
  clientOrderId: string(),
  accountAddress: CaipAccountIdSchema,
  srcAssetId: CaipAssetIdSchema,
  srcAmount: AtomicStringSchema,
  destAssetId: CaipAssetIdSchema,
  slippage: number(),
  every: number(),
  unit: RecurringIntervalUnitSchema,
  repeatCount: number(),
  expiresAt: number(),
});
export type PreparedRecurringOrder = Infer<typeof PreparedRecurringOrderSchema>;

export const PrepareRecurringDelegationResponseSchema = type({
  chainId: CaipChainIdStruct,
  delegationManager: HexStringSchema,
  swapRouter: HexStringSchema,
  approvalRequired: boolean(),
  order: PreparedRecurringOrderSchema,
  delegations: array(PreparedLimitOrderDelegationSchema),
});
export type PrepareRecurringDelegationResponse = Infer<
  typeof PrepareRecurringDelegationResponseSchema
>;

export const CreateRecurringOrderRequestSchema = type({
  clientOrderId: string(),
  chainId: number(),
  slippage: number(),
  schedule: RecurringScheduleSchema,
  priceRange: optional(RecurringPriceRangeSchema),
  delegations: array(PreparedLimitOrderDelegationSchema),
});
export type CreateRecurringOrderRequest = Infer<
  typeof CreateRecurringOrderRequestSchema
>;

export const CreateRecurringOrderResponseSchema = type({
  order: RecurringOrderSchema,
});
export type CreateRecurringOrderResponse = Infer<
  typeof CreateRecurringOrderResponseSchema
>;

export const ListRecurringOrdersQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
  states: optional(array(RecurringOrderStateSchema)),
  chainIds: optional(array(CaipChainIdStruct)),
  asset: optional(CaipAssetIdSchema),
  limit: optional(number()),
  after: optional(string()),
});
export type ListRecurringOrdersQuery = Infer<
  typeof ListRecurringOrdersQuerySchema
>;

export const ListRecurringOrdersResponseSchema = type({
  orders: array(RecurringOrderSchema),
  endCursor: optional(string()),
  hasNextPage: boolean(),
});
export type ListRecurringOrdersResponse = Infer<
  typeof ListRecurringOrdersResponseSchema
>;

export const GetRecurringOrderQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
});
export type GetRecurringOrderQuery = Infer<typeof GetRecurringOrderQuerySchema>;

export const GetRecurringOrderResponseSchema = RecurringOrderSchema;
export type GetRecurringOrderResponse = Infer<
  typeof GetRecurringOrderResponseSchema
>;

export const ListRecurringSwapsQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
  limit: optional(number()),
  after: optional(string()),
});
export type ListRecurringSwapsQuery = Infer<
  typeof ListRecurringSwapsQuerySchema
>;

export const ListRecurringSwapsResponseSchema = type({
  swaps: array(RecurringSwapSchema),
  endCursor: optional(string()),
  hasNextPage: boolean(),
});
export type ListRecurringSwapsResponse = Infer<
  typeof ListRecurringSwapsResponseSchema
>;

export const CancelRecurringOrderQuerySchema = type({
  accountAddress: CaipAccountIdSchema,
});
export type CancelRecurringOrderQuery = Infer<
  typeof CancelRecurringOrderQuerySchema
>;

export const CancelRecurringOrderResponseSchema = type({
  order: RecurringOrderSchema,
});
export type CancelRecurringOrderResponse = Infer<
  typeof CancelRecurringOrderResponseSchema
>;

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
