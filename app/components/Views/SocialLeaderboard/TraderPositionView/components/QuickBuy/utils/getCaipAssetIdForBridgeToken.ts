import { isNativeAddress } from '@metamask/bridge-controller';
import { isCaipAssetType, type CaipAssetType } from '@metamask/utils';

import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { TokenI } from '../../../../../../UI/Tokens/types';
import { getCaipAssetIdForToken } from '../../../../../../UI/Tokens/util/getCaipAssetIdForToken';

const isBridgeTokenNative = (token: BridgeToken): boolean => {
  if (isNativeAddress(token.address)) {
    return true;
  }
  return isCaipAssetType(token.address) && token.address.includes('/slip44:');
};

const bridgeTokenToTokenI = (token: BridgeToken): TokenI => {
  const isNative = isBridgeTokenNative(token);
  return {
    address: token.address,
    chainId: token.chainId,
    isNative,
    isETH: false,
    decimals: token.decimals,
    image: token.image ?? '',
    name: token.name ?? token.symbol,
    symbol: token.symbol,
    balance: token.balance ?? '0',
    logo: undefined,
  };
};

/**
 * Resolves a CAIP-19 asset id for QuickBuy picker security badges.
 * Delegates to the token-list helper after adapting {@link BridgeToken} shape.
 */
export async function getCaipAssetIdForBridgeToken(
  token: BridgeToken,
): Promise<CaipAssetType | null> {
  if (!token.chainId) {
    return null;
  }
  return getCaipAssetIdForToken(bridgeTokenToTokenI(token));
}

export { isBridgeTokenNative };
