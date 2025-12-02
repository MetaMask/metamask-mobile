import { CaipChainId } from '@metamask/utils';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  SolScope,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import { ProcessedNetwork } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { getNetworkImageSource } from '../../../../util/networks';

/**
 * Helper function to create a ProcessedNetwork object
 */
const createNetworkEntry = (
  caipChainId: CaipChainId,
  name: string,
): ProcessedNetwork => ({
  id: caipChainId,
  name,
  caipChainId,
  isSelected: false,
  imageSource: getNetworkImageSource({ chainId: caipChainId }),
});

/**
 * Network configurations for trending features
 */
// Before adding a network, you MUST make sure it is supported on both `searchAPI` and `trendingAPI`
const TRENDING_NETWORKS_CONFIG: {
  caipChainId: CaipChainId;
  name: string;
}[] = [
  { caipChainId: 'eip155:1', name: 'Ethereum' },
  { caipChainId: 'eip155:59144', name: 'Linea' },
  { caipChainId: 'eip155:8453', name: 'Base' },
  { caipChainId: 'eip155:42161', name: 'Arbitrum' },
  { caipChainId: 'eip155:56', name: 'BNB Chain' },
  { caipChainId: 'eip155:10', name: 'OP' },
  { caipChainId: 'eip155:137', name: 'Polygon' },
  { caipChainId: 'eip155:1329', name: 'Sei' },
  { caipChainId: 'eip155:43114', name: 'Avalanche' },
  { caipChainId: 'eip155:324', name: 'zkSync Era' },
  { caipChainId: SolScope.Mainnet, name: 'Solana' },
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  { caipChainId: TrxScope.Mainnet, name: 'Tron' },
  ///: END:ONLY_INCLUDE_IF
];

/**
 * Static list of popular networks for trending features
 * Returns ProcessedNetwork objects similar to usePopularNetworks hook
 * This is a static constant that doesn't depend on Redux state
 */
export const TRENDING_NETWORKS_LIST: ProcessedNetwork[] =
  TRENDING_NETWORKS_CONFIG.map(({ caipChainId, name }) =>
    createNetworkEntry(caipChainId, name),
  );
