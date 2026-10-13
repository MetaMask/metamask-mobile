import { array, object, optional, type Infer } from '@metamask/superstruct';
import { CreatedLimitOrderTransactionSchema } from '../create/schema';
import { LimitOrderSchema } from '../getLimitOrders/schema';

export const CancelLimitOrderResponseSchema = object({
  order: LimitOrderSchema,
  transactions: optional(array(CreatedLimitOrderTransactionSchema)),
});

export type CancelLimitOrderResponse = Infer<
  typeof CancelLimitOrderResponseSchema
>;
