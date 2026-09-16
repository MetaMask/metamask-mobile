import type { BridgeToken } from '../../../types';

export interface NetworkFeeRowProps {
  /**
   * Formatted estimated network fee, e.g. "$1.69".
   */
  amount: string;
  /**
   * Token whose avatar and network badge are shown beside the fee.
   */
  token?: BridgeToken;
  /**
   * Press handler. When omitted the row is not interactive.
   */
  onPress?: () => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
