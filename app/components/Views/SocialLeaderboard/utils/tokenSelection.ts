import type { CaipChainId, Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../UI/Bridge/types';

const EVM_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

export const isNativeToken = (token: BridgeToken): boolean =>
  token.address.toLowerCase() === EVM_NATIVE_ADDRESS ||
  token.address.includes('slip44:501');

/**
 * Picks the best default "Pay with" token from the available options:
 * 1. Native token on the destination chain (e.g. ETH on Base when buying on Base)
 * 2. Any token on the destination chain with the highest balance
 * 3. Native token on any other chain with the highest balance
 * 4. Fallback: first option (highest overall fiat balance)
 */
export const selectDefaultSourceToken = (
  options: BridgeToken[],
  destChainId: Hex | CaipChainId | undefined,
): BridgeToken | undefined => {
  if (options.length === 0) return undefined;

  if (destChainId) {
    const nativeOnDest = options.find(
      (t) => t.chainId === destChainId && isNativeToken(t),
    );
    if (nativeOnDest) return nativeOnDest;

    const tokenOnDest = options.find((t) => t.chainId === destChainId);
    if (tokenOnDest) return tokenOnDest;
  }

  return options.find(isNativeToken) ?? options[0];
};
