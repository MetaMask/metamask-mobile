import AppConstants from '../../../../core/AppConstants';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { Hex } from '@metamask/utils';

const {
  MAINNET,
  OPTIMISM,
  BSC,
  POLYGON,
  ZKSYNC_ERA: ZKSYNC,
  BASE,
  ARBITRUM,
  AVAXCCHAIN: AVALANCHE,
  LINEA_MAINNET: LINEA,
} = NETWORKS_CHAIN_ID;

const allowedChainIds = [
  MAINNET,
  OPTIMISM,
  BSC,
  POLYGON,
  ZKSYNC,
  BASE,
  ARBITRUM,
  AVALANCHE,
  LINEA,
];

/**
 * Returns a boolean for if a bridge is possible on a given chain.
 * @param chainId The chain ID of the source network.
 * @returns `true` if the chain is allowed, otherwise, return `false`.
 */
export default function isBridgeAllowed(chainId: Hex) {
  if (!AppConstants.BRIDGE.ACTIVE) return false;

  return allowedChainIds.includes(chainId);
}
