import {
  BtcScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';
import { NetworkToCaipChainId } from '../../NetworkMultiSelector/NetworkMultiSelector.constants';

export interface TrendingNetwork {
  name: string;
  caipChainId: CaipChainId;
}

/**
 * Networks supported by trending features, kept free of UI concerns (no image
 * resolution) so non-UI modules (e.g. deeplink handlers) can import it safely.
 */
// Before adding a network, you MUST make sure it is supported on both `searchAPI` and `trendingAPI`
export const TRENDING_NETWORKS: TrendingNetwork[] = [
  { name: 'Ethereum', caipChainId: NetworkToCaipChainId.ETHEREUM },
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  { name: 'Solana', caipChainId: NetworkToCaipChainId.SOLANA },
  ///: END:ONLY_INCLUDE_IF
  { name: 'BNB Chain', caipChainId: NetworkToCaipChainId.BNB },
  { name: 'Base', caipChainId: NetworkToCaipChainId.BASE },
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  { name: 'Tron', caipChainId: TrxScope.Mainnet },
  ///: END:ONLY_INCLUDE_IF
  { name: 'Arbitrum', caipChainId: NetworkToCaipChainId.ARBITRUM },
  { name: 'Avalanche', caipChainId: NetworkToCaipChainId.AVALANCHE },
  { name: 'Polygon', caipChainId: NetworkToCaipChainId.POLYGON },
  { name: 'Monad', caipChainId: NetworkToCaipChainId.MONAD },
  { name: 'Linea', caipChainId: NetworkToCaipChainId.LINEA },
  { name: 'OP', caipChainId: NetworkToCaipChainId.OPTIMISM },
  { name: 'Sei', caipChainId: NetworkToCaipChainId.SEI },
  { name: 'zkSync Era', caipChainId: NetworkToCaipChainId.ZKSYNC_ERA },
  { name: 'Robinhood Chain', caipChainId: NetworkToCaipChainId.ROBINHOOD },
  { name: 'Bitcoin', caipChainId: BtcScope.Mainnet },
];

export const TRENDING_CAIP_CHAIN_IDS: CaipChainId[] = TRENDING_NETWORKS.map(
  (network) => network.caipChainId,
);
