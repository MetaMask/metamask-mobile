import type { BridgeToken } from '../../types';

export interface LimitOrderDetailsProps {
  /**
   * Human-readable expiration, e.g. "1 week".
   */
  expiration: string;
  /**
   * Fired when the expiration row is pressed.
   */
  onExpirationPress: () => void;
  /**
   * Slippage shown on the price row, e.g. "2%".
   */
  slippage: string;
  /**
   * Fired when the price / slippage row is pressed.
   */
  onPricePress: () => void;
  /**
   * Formatted estimated network fee, e.g. "$1.69".
   */
  networkFee: string;
  /**
   * Token whose avatar and network badge are shown on the fee row.
   */
  feeToken?: BridgeToken;
  /**
   * Press handler for the network fee row. When omitted the row is not interactive.
   */
  onNetworkFeePress?: () => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
