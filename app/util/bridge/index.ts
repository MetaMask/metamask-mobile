import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../constants/bridge';

export function isSwapsNativeAsset(token: { address: string } | undefined) {
  return Boolean(token) && token?.address === NATIVE_SWAPS_TOKEN_ADDRESS;
}

/**
 * Converts any chain ID format (hex, decimal string, or CAIP-2) to a hex
 * string, mirroring the extension's `getMaybeHexChainId` utility.
 *
 * @param chainId - The chain ID to normalize.
 * @returns The hex string representation, or `undefined` if the chain ID is
 * absent or non-EVM.
 */
export function getMaybeHexChainId(chainId?: string): Hex | undefined {
  if (!chainId) {
    return undefined;
  }
  return isNonEvmChainId(chainId) ? undefined : formatChainIdToHex(chainId);
}
