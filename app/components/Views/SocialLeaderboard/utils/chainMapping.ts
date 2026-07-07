import type { CaipChainId } from '@metamask/utils';
import type { ImageSourcePropType } from 'react-native';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { getNetworkImageSource } from '../../../../util/networks';

const CHAIN_NAME_TO_ID: Record<string, CaipChainId> = {
  ethereum: 'eip155:1',
  base: 'eip155:8453',
  arbitrum: 'eip155:42161',
  optimism: 'eip155:10',
  polygon: 'eip155:137',
  linea: 'eip155:59144',
  bsc: 'eip155:56',
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export const HYPERLIQUID_CHAIN_NAME = 'hyperliquid';

export const chainNameToId = (chainName: string): CaipChainId | undefined =>
  CHAIN_NAME_TO_ID[chainName.toLowerCase()];

export const isSupportedChain = (chainName: string): boolean =>
  chainName.toLowerCase() in CHAIN_NAME_TO_ID;

export interface PositionNetworkBadge {
  name: string;
  imageSource: ImageSourcePropType;
}

/**
 * Resolves the network badge (name + logo) shown on a position's token avatar.
 *
 * Hyperliquid is handled specially: it isn't part of {@link CHAIN_NAME_TO_ID}
 * (its positions key on a perp symbol rather than a token contract, and we
 * deliberately keep it out of the spot trade/price paths), but it has a
 * network logo we surface via the HyperEVM image source. Other chains resolve
 * through their CAIP id. Returns `undefined` when no badge can be resolved.
 */
export const getPositionNetworkBadge = (
  chainName: string,
): PositionNetworkBadge | undefined => {
  if (chainName.toLowerCase() === HYPERLIQUID_CHAIN_NAME) {
    return {
      name: 'Hyperliquid',
      imageSource: getNetworkImageSource({
        chainId: NETWORKS_CHAIN_ID.HYPER_EVM,
      }),
    };
  }

  const caipChainId = chainNameToId(chainName);
  if (!caipChainId) {
    return undefined;
  }

  return {
    name: chainName,
    imageSource: getNetworkImageSource({ chainId: caipChainId }),
  };
};
