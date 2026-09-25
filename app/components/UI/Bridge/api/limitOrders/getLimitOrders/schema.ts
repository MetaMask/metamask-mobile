import {
  array,
  assign,
  boolean,
  object,
  optional,
  string,
  type Infer,
} from '@metamask/superstruct';
import {
  CreatedLimitOrderSchema,
  LimitOrderTimingDataSchema,
} from '../create/schema';

/**
 * An order as listed by `GET /v2/orders/limit`. It shares its wire shape with
 * the order `POST /v2/orders/limit` returns, except that `expiresAt` is always
 * set: every booked order carries a deadline.
 */
export const LimitOrderSchema = assign(
  CreatedLimitOrderSchema,
  object({
    timingData: assign(
      LimitOrderTimingDataSchema,
      object({ expiresAt: string() }),
    ),
  }),
);

/**
 * Response body for `GET /v2/orders/limit`: one page of orders, newest first.
 */
export const LimitOrderPageResponseSchema = object({
  orders: array(LimitOrderSchema),
  /**
   * Keyset cursor for the end of this page, passed back as `after` to fetch
   * the next one. Absent on the last page.
   */
  endCursor: optional(string()),
  hasNextPage: boolean(),
});

export type LimitOrderPageResponse = Infer<typeof LimitOrderPageResponseSchema>;
