import { Hex } from '@metamask/utils';

export interface PayTokenInfo {
  tokenAddress: Hex | undefined;
  chainId: Hex | undefined;
}
