import type { LimitOrderDelegationsParams } from '../../api/limitOrders/getDelegations';
import type { EIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import type { BridgeToken } from '../../types';
import type { LimitOrderTriggerInput } from '../../utils/limitOrders/getLimitOrderTriggerParams';
import type { LimitOrderUsdExchangeRate } from '../../utils/limitOrders/getLimitOrderUsdExchangeRate';

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
  /**
   * Unformatted order parameters used to request the delegations to sign.
   * Built by the caller, which is the only place holding the raw asset ids and
   * minimal-unit amounts. `costTolerance` is excluded on purpose: this screen
   * reads the live value from state, since it can still be edited while the
   * sheet is open.
   */
  order: Omit<LimitOrderDelegationsParams, 'costTolerance'>;
  /**
   * The limit price exactly as entered, with the side it is quoted on. The
   * caller is the only place holding it. This screen turns it into the
   * `POST /v2/limit-orders` trigger itself, converting a price in another
   * display currency to USD with the live rate, so the order is placed at the
   * rate shown in the notice at the time it is created.
   */
  triggerInput: LimitOrderTriggerInput;
}

export interface LimitOrderConfirmationModalProps
  extends Omit<LimitOrderConfirmationModalParams, 'order' | 'triggerInput'> {
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
  /**
   * Rate of one US dollar in the display currency the trigger is converted
   * at, e.g. `{ rate: '85.05', currency: 'RUB' }`. Set only for a price
   * entered in fiat while the display currency is not USD, since the order is
   * placed at the USD equivalent of the price on screen.
   */
  usdExchangeRate?: LimitOrderUsdExchangeRate;
  primaryButton: {
    onPress: () => void;
    label: string;
    isLoading?: boolean;
    isDisabled?: boolean;
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
