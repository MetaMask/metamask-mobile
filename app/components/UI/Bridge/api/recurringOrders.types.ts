import {
  array,
  boolean,
  enums,
  number,
  object,
  optional,
  record,
  string,
  unknown,
  type Infer,
} from '@metamask/superstruct';
import {
  HexStringSchema as LimitOrderHexStringSchema,
  type PreparedLimitOrderDelegation,
} from './limitOrders/getDelegations/schema';
import { LimitOrderAssetSchema } from './limitOrders/create/schema';

export const RecurringOrderState = {
  Open: 'OPEN',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  Expired: 'EXPIRED',
} as const;

export const RecurringSwapStatus = {
  Submitted: 'SUBMITTED',
  Filled: 'FILLED',
  Skipped: 'SKIPPED',
  Failed: 'FAILED',
} as const;

export type RecurringOrderState =
  (typeof RecurringOrderState)[keyof typeof RecurringOrderState];

export type RecurringSwapStatus =
  (typeof RecurringSwapStatus)[keyof typeof RecurringSwapStatus];

export type RecurringSwapSkipReason =
  | 'not_enough_gas'
  | 'out_of_price_range'
  | 'insufficient_balance'
  | 'no_quotes_available'
  | 'needs_smart_account'
  | 'execution_failed';

export type RecurringOrderWarning = 'insufficient_balance' | 'expiring_soon';

export const AtomicStringSchema = string();
export type AtomicString = Infer<typeof AtomicStringSchema>;

export const FloatStringSchema = string();
export type FloatString = Infer<typeof FloatStringSchema>;

export const IsoDateTimeSchema = string();
export type IsoDateTime = Infer<typeof IsoDateTimeSchema>;

export const CaipAccountIdSchema = string();
export type CaipAccountId = Infer<typeof CaipAccountIdSchema>;

export type CaipAssetId = string;

export const RecurringOrderAssetSchema = LimitOrderAssetSchema;

export const HexStringSchema = LimitOrderHexStringSchema;
export type HexString = Infer<typeof HexStringSchema>;

export const RecurringScheduleSchema = object({
  every: number(),
  unit: enums(['minute', 'hour', 'day', 'week', 'month']),
  repeatCount: number(),
});
export type RecurringSchedule = Infer<typeof RecurringScheduleSchema>;

export const RecurringPriceRangeSchema = object({
  side: enums(['src', 'dest']),
  currency: enums(['USD']),
  min: optional(FloatStringSchema),
  max: optional(FloatStringSchema),
});
export type RecurringPriceRange = Infer<typeof RecurringPriceRangeSchema>;

export const RecurringOrderSchema = object({
  id: string(),
  clientOrderId: string(),
  account: CaipAccountIdSchema,
  state: string(),
  src: object({
    asset: RecurringOrderAssetSchema,
    amount: AtomicStringSchema,
  }),
  dest: object({
    asset: RecurringOrderAssetSchema,
  }),
  fillData: object({
    src: object({ amount: AtomicStringSchema }),
    dest: object({ amount: AtomicStringSchema }),
    count: number(),
    averageExecutionPriceUsd: optional(FloatStringSchema),
  }),
  schedule: RecurringScheduleSchema,
  priceRange: optional(RecurringPriceRangeSchema),
  slippage: optional(number()),
  warnings: optional(array(string())),
  timingData: object({
    createdAt: IsoDateTimeSchema,
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
    closedAt: optional(IsoDateTimeSchema),
  }),
});
export type RecurringOrder = Infer<typeof RecurringOrderSchema>;

export const RecurringSwapSchema = object({
  id: string(),
  status: string(),
  skipReason: optional(string()),
  failureReason: optional(string()),
  src: object({ amount: AtomicStringSchema }),
  dest: object({
    amount: AtomicStringSchema,
    minAmount: optional(AtomicStringSchema),
  }),
  quoteId: optional(string()),
  txHash: optional(HexStringSchema),
  feeData: optional(record(string(), unknown())),
  timingData: object({
    scheduledAt: IsoDateTimeSchema,
    executedAt: optional(IsoDateTimeSchema),
  }),
});
export type RecurringSwap = Infer<typeof RecurringSwapSchema>;

export interface CreateRecurringOrderRequest {
  clientOrderId: string;
  accountAddress: CaipAccountId;
  src: {
    asset: { assetId: CaipAssetId };
    amount: AtomicString;
  };
  dest: {
    asset: { assetId: CaipAssetId };
  };
  schedule: RecurringSchedule;
  priceRange?: RecurringPriceRange;
  slippage?: number;
  // Delegation preparation and recurring-specific caveats remain a backend
  // contract TBD. Creation accepts the signed Limit Orders wire shape.
  delegations: PreparedLimitOrderDelegation[];
}

export const CreateRecurringOrderResponseSchema = object({
  order: RecurringOrderSchema,
});
export type CreateRecurringOrderResponse = Infer<
  typeof CreateRecurringOrderResponseSchema
>;

export interface ListRecurringOrdersQuery {
  accountAddress: CaipAccountId;
  states?: RecurringOrderState[];
  chainIds?: string[];
  assetIds?: CaipAssetId[];
  limit?: number;
  after?: string;
}

export const ListRecurringOrdersResponseSchema = object({
  orders: array(RecurringOrderSchema),
  endCursor: optional(string()),
  hasNextPage: boolean(),
});
export type ListRecurringOrdersResponse = Infer<
  typeof ListRecurringOrdersResponseSchema
>;

export interface ListRecurringSwapsQuery {
  limit?: number;
  after?: string;
}

export const ListRecurringSwapsResponseSchema = object({
  swaps: array(RecurringSwapSchema),
  endCursor: optional(string()),
  hasNextPage: boolean(),
});
export type ListRecurringSwapsResponse = Infer<
  typeof ListRecurringSwapsResponseSchema
>;

export const CancelRecurringOrderResponseSchema = object({
  order: RecurringOrderSchema,
});
export type CancelRecurringOrderResponse = Infer<
  typeof CancelRecurringOrderResponseSchema
>;

export const RecurringApiErrorCodeSchema = string();
export type RecurringApiErrorCode = Infer<typeof RecurringApiErrorCodeSchema>;

export const RecurringApiErrorSchema = object({
  code: RecurringApiErrorCodeSchema,
  message: string(),
  details: optional(record(string(), unknown())),
});
export type RecurringApiError = Infer<typeof RecurringApiErrorSchema>;

export interface GetRecurringOrdersQuery {
  walletAddress: string;
  orderStates?: RecurringOrderState[];
  chainId?: string;
  assetId?: CaipAssetId;
  limit?: number;
  cursor?: string;
}

export const GetRecurringOrdersResponseSchema = object({
  orders: array(RecurringOrderSchema),
  nextCursor: optional(string()),
});
export type GetRecurringOrdersResponse = Infer<
  typeof GetRecurringOrdersResponseSchema
>;

export interface GetRecurringOrdersByAssetQuery {
  walletAddress: string;
  assetId: CaipAssetId;
}

export type GetRecurringOrdersByAssetResponse = RecurringOrder[];

export interface GetRecurringSwapsQuery {
  limit?: number;
  cursor?: string;
}

export const GetRecurringSwapsResponseSchema = object({
  swaps: array(RecurringSwapSchema),
  nextCursor: optional(string()),
});
export type GetRecurringSwapsResponse = Infer<
  typeof GetRecurringSwapsResponseSchema
>;
