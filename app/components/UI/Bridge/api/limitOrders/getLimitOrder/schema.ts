import { array, optional, type, type Infer } from '@metamask/superstruct';
import { CreatedLimitOrderTransactionSchema } from '../create/schema';
import { LimitOrderSchema } from '../getLimitOrders/schema';

export const GetLimitOrderResponseSchema = type({
  order: LimitOrderSchema,
  transactions: optional(array(CreatedLimitOrderTransactionSchema)),
});

export type GetLimitOrderResponse = Infer<typeof GetLimitOrderResponseSchema>;
