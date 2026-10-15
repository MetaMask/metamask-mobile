import type { BridgeToken } from '../../../types';

export interface TokenAmountValueProps {
  amount: string;
  prefix?: string;
  token?: BridgeToken;
  withNetworkBadge?: boolean;
  error?: boolean;
  showTokenSymbol?: boolean;
}
