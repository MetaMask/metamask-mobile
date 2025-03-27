import { CaipChainId } from '@metamask/utils';

export interface BridgeToken {
  address: string;
  symbol: string;
  image: string;
  decimals: number;
  chainId: CaipChainId;
}
