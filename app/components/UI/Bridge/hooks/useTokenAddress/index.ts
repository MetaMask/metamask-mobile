import { BridgeToken } from '../../types';
import { zeroAddress } from 'ethereumjs-util';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { POLYGON_NATIVE_TOKEN } from '../../constants/assets';
import { Hex, CaipChainId } from '@metamask/utils';

/**
 * Normalizes chain-specific native token addresses to the zero address for the bridge flow.
 *
 * Some chains use a non-zero contract address for their native token
 * (e.g. Polygon uses 0x0000000000000000000000000000000000001010), but the bridge API
 * expects the zero address for all native assets.
 */
export const normalizeTokenAddress = (
  address: string,
  chainId: Hex | CaipChainId,
): string => {
  const isPolygonNativeToken =
    chainId === CHAIN_IDS.POLYGON && address === POLYGON_NATIVE_TOKEN;
  return isPolygonNativeToken ? zeroAddress() : address;
};

export const useTokenAddress = (
  token: BridgeToken | undefined,
): string | undefined =>
  token ? normalizeTokenAddress(token.address, token.chainId) : undefined;
