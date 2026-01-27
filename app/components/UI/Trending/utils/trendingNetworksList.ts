import {
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import { ProcessedNetwork } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { getNetworkImageSource } from '../../../../util/networks';
import { NetworkToCaipChainId } from '../../NetworkMultiSelector/NetworkMultiSelector.constants';

/**
 * Static list of popular networks for trending features.
 * Returns ProcessedNetwork objects similar to usePopularNetworks hook.
 * This is a static constant that doesn't depend on Redux state.
 */
// Before adding a network, you MUST make sure it is supported on both `searchAPI` and `trendingAPI`
export const TRENDING_NETWORKS_LIST: ProcessedNetwork[] = [
  {
    id: NetworkToCaipChainId.ETHEREUM,
    name: 'Ethereum',
    caipChainId: NetworkToCaipChainId.ETHEREUM,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.ETHEREUM,
    }),
  },
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  {
    id: NetworkToCaipChainId.SOLANA,
    name: 'Solana',
    caipChainId: NetworkToCaipChainId.SOLANA,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.SOLANA,
    }),
  },
  ///: END:ONLY_INCLUDE_IF
  {
    id: NetworkToCaipChainId.BNB,
    name: 'BNB Chain',
    caipChainId: NetworkToCaipChainId.BNB,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: NetworkToCaipChainId.BNB }),
  },
  {
    id: NetworkToCaipChainId.BASE,
    name: 'Base',
    caipChainId: NetworkToCaipChainId.BASE,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.BASE,
    }),
  },
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  {
    id: TrxScope.Mainnet,
    name: 'Tron',
    caipChainId: TrxScope.Mainnet,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: TrxScope.Mainnet }),
  },
  ///: END:ONLY_INCLUDE_IF
  {
    id: NetworkToCaipChainId.ARBITRUM,
    name: 'Arbitrum',
    caipChainId: NetworkToCaipChainId.ARBITRUM,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.ARBITRUM,
    }),
  },
  {
    id: NetworkToCaipChainId.AVALANCHE,
    name: 'Avalanche',
    caipChainId: NetworkToCaipChainId.AVALANCHE,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.AVALANCHE,
    }),
  },
  {
    id: NetworkToCaipChainId.POLYGON,
    name: 'Polygon',
    caipChainId: NetworkToCaipChainId.POLYGON,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.POLYGON,
    }),
  },
  {
    id: NetworkToCaipChainId.LINEA,
    name: 'Linea',
    caipChainId: NetworkToCaipChainId.LINEA,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.LINEA,
    }),
  },
  {
    id: NetworkToCaipChainId.OPTIMISM,
    name: 'OP',
    caipChainId: NetworkToCaipChainId.OPTIMISM,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.OPTIMISM,
    }),
  },
  {
    id: NetworkToCaipChainId.SEI,
    name: 'Sei',
    caipChainId: NetworkToCaipChainId.SEI,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.SEI,
    }),
  },
  {
    id: NetworkToCaipChainId.ZKSYNC_ERA,
    name: 'zkSync Era',
    caipChainId: NetworkToCaipChainId.ZKSYNC_ERA,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.ZKSYNC_ERA,
    }),
  },
];
