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
   * Optional test ID for the root element.
   */
  testID?: string;
}
