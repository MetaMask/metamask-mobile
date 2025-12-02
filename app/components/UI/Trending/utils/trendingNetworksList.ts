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
const TRENDING_NETWORKS_CONFIG: {
  caipChainId: CaipChainId;
  name: string;
}[] = [
  { caipChainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { caipChainId: 'eip155:59144' as CaipChainId, name: 'Linea' },
  { caipChainId: 'eip155:8453' as CaipChainId, name: 'Base' },
  { caipChainId: 'eip155:42161' as CaipChainId, name: 'Arbitrum' },
  { caipChainId: 'eip155:56' as CaipChainId, name: 'BNB Chain' },
  { caipChainId: 'eip155:10' as CaipChainId, name: 'OP' },
  { caipChainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
  { caipChainId: 'eip155:1329' as CaipChainId, name: 'Sei' },
  { caipChainId: 'eip155:43114' as CaipChainId, name: 'Avalanche' },
  { caipChainId: 'eip155:324' as CaipChainId, name: 'zkSync Era' },
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  { caipChainId: SolScope.Mainnet, name: 'Solana' },
  ///: END:ONLY_INCLUDE_IF
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
