import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';

/**
 * Route params for the limit order activity page. The page is opened from a
 * row of the limit orders history tab, which is where the order comes from.
 */
export interface SwapsLimitOrderActivityPageRouteParams {
  /**
   * The order the page shows the activity of.
   */
  order: LimitOrder;
}
