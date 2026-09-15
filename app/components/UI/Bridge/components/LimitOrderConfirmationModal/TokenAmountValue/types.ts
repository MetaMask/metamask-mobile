import type { BridgeToken } from '../../../types';

export interface TokenAmountValueProps {
  amount: string;
  token?: BridgeToken;
  withNetworkBadge?: boolean;
}
