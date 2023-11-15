import AppConstants from '../../../../core/AppConstants';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';

const {
  MAINNET,
  OPTIMISM,
  BSC,
  POLYGON,
  ZKSYNC,
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

export default function isBridgeAllowed(chainId: string) {
  if (!AppConstants.BRIDGE.ACTIVE) return false;

  return allowedChainIds.includes(chainId);
}
