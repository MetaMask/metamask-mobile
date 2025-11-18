import { BridgeToken } from '../../types';
import { zeroAddress } from 'ethereumjs-util';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { POLYGON_NATIVE_TOKEN } from '../../constants/assets';

export const useTokenAddress = (token: BridgeToken | undefined) => {
  // Polygon native token address can be 0x0000000000000000000000000000000000001010
  // so we need to use the zero address for the token address
  const tokenAddress =
    token?.chainId === CHAIN_IDS.POLYGON &&
    token?.address === POLYGON_NATIVE_TOKEN
      ? zeroAddress()
      : token?.address;

  return tokenAddress;
};
