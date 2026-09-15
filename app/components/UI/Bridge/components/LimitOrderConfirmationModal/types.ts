import type { BridgeToken } from '../../types';

/**
 * Market comparison shown under the trigger price, e.g. "(-5% from market)".
 */
export interface LimitOrderConfirmationMarketComparison {
  label: string;
  isNegative: boolean;
}

/**
 * Route params for the limit order confirmation modal. Every value is
 * pre-formatted by the caller so the sheet itself stays stateless.
 */
export interface LimitOrderConfirmationModalParams {
  /**
   * Source token, used for the sheet title and the paying row avatar.
   */
  sourceToken?: BridgeToken;
  /**
   * Destination token, used for the sheet title and the receiving row avatar.
   */
  destToken?: BridgeToken;
  /**
   * Source amount being paid, including its symbol, e.g. "0.1 ETH".
   */
  payingAmount: string;
  /**
   * Limit price the order triggers at, e.g. "$3,412.20".
   */
  triggerPrice: string;
  /**
   * Comparison against the current market price. Omitted while at market.
   */
  triggerComparison?: LimitOrderConfirmationMarketComparison;
  /**
   * Token the trigger price is quoted in, used for the trigger row avatar.
   */
  triggerToken?: BridgeToken;
  /**
   * Expiration label, e.g. "7 days".
   */
  expiry: string;
  /**
   * Estimated network fee, e.g. "$1.69".
   */
  networkFee: string;
  /**
   * Token the network fee is paid in, used for the network fee row avatar.
   */
  feeToken?: BridgeToken;
  /**
   * Fee disclaimer shown under the confirm button, e.g. "Includes 0.875% MetaMask fee".
   */
  feeDisclaimer?: string;
}

export interface LimitOrderConfirmationModalProps
  extends LimitOrderConfirmationModalParams {
  /**
   * Slippage label, e.g. "2%". Read from state by the host screen so edits
   * made in the slippage modal are reflected here.
   */
  slippage: string;
  /**
   * Fired when the user confirms the order.
   */
  onConfirm: () => void;
  /**
   * Fired when the user taps the edit icon on the slippage row.
   */
  onEditSlippagePress: () => void;
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
