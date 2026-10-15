import type { FontWeight } from '@metamask/design-system-react-native';
import type { BridgeToken } from '../../../types';

export interface TokenAmountValueProps {
  amount: string;
  token?: BridgeToken;
  withNetworkBadge?: boolean;
  error?: boolean;
  showTokenSymbol?: boolean;
  /**
   * Matches surrounding row text. Defaults to the body style's regular weight.
   */
  fontWeight?: FontWeight;
}
