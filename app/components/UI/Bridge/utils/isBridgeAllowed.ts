import AppConstants from '../../../../core/AppConstants';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  BtcScope,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  SolScope,
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
} from '@metamask/keyring-api';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { isBridgeUiEnabled } from './';
///: END:ONLY_INCLUDE_IF(keyring-snaps)

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
  SEI,
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
  SEI,
];

/**
 * Returns a boolean for if a bridge is possible on a given chain.
 * @param chainId The chain ID of the source network.
 * @returns `true` if the chain is allowed, otherwise, return `false`.
 */
export default function isBridgeAllowed(chainId: Hex | CaipChainId) {
  if (!AppConstants.BRIDGE.ACTIVE) return false;

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (chainId === SolScope.Mainnet && isBridgeUiEnabled()) {
    return true;
  }
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  if (chainId === BtcScope.Mainnet) {
    return false;
  }

  return allowedChainIds.includes(chainId as Hex);
}
