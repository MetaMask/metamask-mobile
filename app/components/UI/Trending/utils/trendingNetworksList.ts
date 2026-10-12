import {
  BtcScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';
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
    id: NetworkToCaipChainId.MONAD,
    name: 'Monad',
    caipChainId: NetworkToCaipChainId.MONAD,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.MONAD,
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
  {
    id: NetworkToCaipChainId.STELLAR,
    name: 'Stellar',
    caipChainId: NetworkToCaipChainId.STELLAR,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.STELLAR,
    }),
  },
  {
    id: NetworkToCaipChainId.ROBINHOOD,
    name: 'Robinhood Chain',
    caipChainId: NetworkToCaipChainId.ROBINHOOD,
    isSelected: false,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.ROBINHOOD,
    }),
  },
  {
    id: BtcScope.Mainnet,
    name: 'Bitcoin',
    caipChainId: BtcScope.Mainnet,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: BtcScope.Mainnet }),
  },
];

const RWA_CHAIN_IDS_WITHOUT_ROBINHOOD: NetworkToCaipChainId[] = [
  NetworkToCaipChainId.ETHEREUM,
  NetworkToCaipChainId.BNB,
];

/**
 * RWA networks for the current `ASSETS4098ShowRobinhoodRwa` value.
 * Robinhood Chain is included only when the flag is on.
 */
export const getRwaNetworksList = (
  showRobinhoodRwa: boolean,
): ProcessedNetwork[] => {
  const allowed = new Set<string>(RWA_CHAIN_IDS_WITHOUT_ROBINHOOD);
  if (showRobinhoodRwa) {
    allowed.add(NetworkToCaipChainId.ROBINHOOD);
  }
  return TRENDING_NETWORKS_LIST.filter((network) =>
    allowed.has(network.caipChainId),
  );
};

export const getRwaChainIds = (showRobinhoodRwa: boolean): CaipChainId[] =>
  getRwaNetworksList(showRobinhoodRwa).map((network) => network.caipChainId);

/**
 * RWA networks with Robinhood hidden. Callers that can read
 * `ASSETS4098ShowRobinhoodRwa` should use `getRwaNetworksList` instead.
 */
export const RWA_NETWORKS_LIST: ProcessedNetwork[] = getRwaNetworksList(false);

export const RWA_CHAIN_IDS: CaipChainId[] = getRwaChainIds(false);
