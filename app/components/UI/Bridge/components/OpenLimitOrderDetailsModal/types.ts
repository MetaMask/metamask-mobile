import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import type { BridgeToken } from '../../types';
import type { LimitOrderConfirmationMarketComparison } from '../LimitOrderConfirmationModal/types';

/**
 * Route params for the open limit order details modal. The sheet is opened
 * from a row of the limit orders tab, which is where the order comes from:
 * every value shown is derived from it by the host screen.
 */
export interface OpenLimitOrderDetailsModalParams {
  /**
   * The order the sheet shows the details of.
   */
  order: LimitOrder;
}

export interface OpenLimitOrderDetailsModalProps {
  /**
   * Source token, used for the sheet title and the submitted row avatar.
   */
  sourceToken?: BridgeToken;
  /**
   * Destination token, used for the sheet title.
   */
  destToken?: BridgeToken;
  /**
   * Current order status label, e.g. "In progress".
   */
  status: string;
  /**
   * Source amount the order was submitted with, including its symbol, e.g.
   * "0.1 ETH".
   */
  submittedAmount: string;
  /**
   * Limit price the order triggers at, e.g. "2200 USDC", or "€1800" for a
   * fiat price shown in the user's display currency.
   */
  triggerPrice: string;
  /**
   * Token the trigger price is quoted in, used for the trigger row avatar.
   */
  triggerToken?: BridgeToken;
  /**
   * USD price the order is placed at, e.g. "$2200". When set, a notice
   * explains that the trigger price is shown in the display currency but the
   * order was placed at this USD price.
   */
  usdTriggerPrice?: string;
  /**
   * Expiration label, e.g. "Sep 27".
   */
  expiry: string;
  /**
   * Comparison of the trigger price against the current market price, shown
   * under the trigger price the same way the confirmation modal shows it.
   */
  triggerComparison?: LimitOrderConfirmationMarketComparison;
  /**
   * Fired when the cancel order button is pressed. The host opens the cancel
   * order sheet from here.
   */
  onCancelOrder: () => void;
  /**
   * Fired when the sheet is dismissed. Used by tests and non-navigation hosts.
   */
  onClose?: () => void;
  /**
   * Pops the Bridge modal route when the sheet closes.
   */
  goBack?: () => void;
  /**
   * Optional test ID for the sheet container.
   */
  testID?: string;
}

export interface TriggerPriceDisplay {
  triggerPrice: string;
  triggerToken: BridgeToken;
  /**
   * The USD price the order is placed at, set only when the trigger row shows
   * it converted to another currency.
   */
  usdTriggerPrice?: string;
}
