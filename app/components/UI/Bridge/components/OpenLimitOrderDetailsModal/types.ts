import type { BridgeToken } from '../../types';
import type { LimitOrderConfirmationMarketComparison } from '../LimitOrderConfirmationModal/types';

export interface OpenLimitOrderDetailsModalParams {
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
   * Limit price the order triggers at, e.g. "@ $3,412.20".
   */
  triggerPrice: string;
  /**
   * Token the trigger price is quoted in, used for the trigger row avatar.
   */
  triggerToken?: BridgeToken;
  /**
   * Expiration label, e.g. "7 days".
   */
  expiry: string;
}

export interface OpenLimitOrderDetailsModalProps
  extends OpenLimitOrderDetailsModalParams {
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
