import {
  array,
  assign,
  boolean,
  number,
  optional,
  string,
  type,
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
  type({
    timingData: assign(
      LimitOrderTimingDataSchema,
      type({ expiresAt: string() }),
    ),
  }),
);

/**
 * Response body for `GET /v2/orders/limit`: one page of orders, newest first.
 */
export const LimitOrderPageResponseSchema = type({
  orders: array(LimitOrderSchema),
  /**
   * Keyset cursor for the end of this page, passed back as `after` to fetch
   * the next one. Absent on the last page.
   */
  endCursor: optional(string()),
  hasNextPage: boolean(),
  /**
   * How many orders match the query across every page, not just this one.
   */
  total: number(),
});

export type LimitOrderPageResponse = Infer<typeof LimitOrderPageResponseSchema>;
