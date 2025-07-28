import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';

export const getNativeTokenAddress = (chainId: Hex) => {
  switch (chainId) {
    case CHAIN_IDS.POLYGON:
      return '0x0000000000000000000000000000000000001010';
    default:
      return NATIVE_TOKEN_ADDRESS;
  }
};
