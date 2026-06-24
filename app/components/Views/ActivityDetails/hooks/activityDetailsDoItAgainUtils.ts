import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../constants/bridge';
import type { BridgeToken } from '../../../UI/Bridge/types';
import type { TokenAmount } from '../../../../util/activity-adapters';

export function getActivityTokenChainId(
  token: TokenAmount | undefined,
  fallbackChainId: string,
) {
  return token?.assetId?.split('/')[0] ?? fallbackChainId;
}

export function getActivityTokenAddress(token: TokenAmount | undefined) {
  const assetNamespace = token?.assetId?.split('/')[1];
  const [, address] = assetNamespace?.split(':') ?? [];

  return address ?? undefined;
}

export function toBridgeToken(
  token: TokenAmount | undefined,
  fallbackChainId: string,
): BridgeToken | undefined {
  const symbol = token?.symbol;
  const decimals = token?.decimals;
  const address = getActivityTokenAddress(token);

  if (!symbol || decimals === undefined) {
    return undefined;
  }

  return {
    address: address ?? NATIVE_SWAPS_TOKEN_ADDRESS,
    symbol,
    decimals,
    chainId: getActivityTokenChainId(
      token,
      fallbackChainId,
    ) as BridgeToken['chainId'],
  };
}
