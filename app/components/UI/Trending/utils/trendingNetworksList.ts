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
 * Static list of popular networks for trending features
 * Returns ProcessedNetwork objects similar to usePopularNetworks hook
 * This is a static constant that doesn't depend on Redux state
 */
export const TRENDING_NETWORKS_LIST: ProcessedNetwork[] = [
  {
    id: 'eip155:1',
    name: 'Ethereum',
    caipChainId: 'eip155:1' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:1' }),
  },
  {
    id: 'eip155:59144',
    name: 'Linea',
    caipChainId: 'eip155:59144' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:59144' }),
  },
  {
    id: 'eip155:8453',
    name: 'Base',
    caipChainId: 'eip155:8453' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:8453' }),
  },
  {
    id: 'eip155:42161',
    name: 'Arbitrum',
    caipChainId: 'eip155:42161' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:42161' }),
  },
  {
    id: 'eip155:56',
    name: 'BNB Chain',
    caipChainId: 'eip155:56' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:56' }),
  },
  {
    id: 'eip155:10',
    name: 'OP',
    caipChainId: 'eip155:10' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:10' }),
  },
  {
    id: 'eip155:137',
    name: 'Polygon',
    caipChainId: 'eip155:137' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:137' }),
  },
  {
    id: 'eip155:1329',
    name: 'Sei',
    caipChainId: 'eip155:1329' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:1329' }),
  },
  {
    id: 'eip155:43114',
    name: 'Avalanche',
    caipChainId: 'eip155:43114' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:43114' }),
  },
  {
    id: 'eip155:324',
    name: 'zkSync Era',
    caipChainId: 'eip155:324' as CaipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: 'eip155:324' }),
  },
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  {
    id: SolScope.Mainnet,
    name: 'Solana',
    caipChainId: SolScope.Mainnet,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: SolScope.Mainnet }),
  },
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  {
    id: TrxScope.Mainnet,
    name: 'Tron',
    caipChainId: TrxScope.Mainnet,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: TrxScope.Mainnet }),
  },
  ///: END:ONLY_INCLUDE_IF
];
