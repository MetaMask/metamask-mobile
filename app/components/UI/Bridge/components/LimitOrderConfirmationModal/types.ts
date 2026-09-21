import type { EIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
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
   * Token the trigger price is quoted in, used for the trigger row avatar.
   */
  triggerToken?: BridgeToken;
  /**
   * Expiration label, e.g. "7 days".
   */
  expiry: string;
}

export interface LimitOrderConfirmationModalProps
  extends LimitOrderConfirmationModalParams {
  /**
   * Cost tolerance label, e.g. "2%". Read from state by the host screen so
   * edits made in the cost tolerance modal are reflected here.
   */
  costTolerance: string;
  /**
   * Comparison against the current market price.
   */
  triggerComparison?: LimitOrderConfirmationMarketComparison;
  /**
   * One-time EIP-7702 account upgrade fee, which is the only network cost of
   * placing the order. The row is hidden entirely once the account is already
   * delegated, since there is nothing left to pay for.
   */
  delegationFee: EIP7702UpgradeFee;
  /**
   * Token the network fee is paid in, used for the network fee row avatar.
   */
  feeToken?: BridgeToken;
  primaryButton: {
    onPress: () => void;
    label: string;
    isLoading?: boolean;
  };
  error?: string;
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
