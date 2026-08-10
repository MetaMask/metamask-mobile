import type { CaipChainId } from '@metamask/utils';
import { ProcessedNetwork } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { getNetworkImageSource } from '../../../../util/networks';
import { NetworkToCaipChainId } from '../../NetworkMultiSelector/NetworkMultiSelector.constants';
import { TRENDING_NETWORKS } from './trendingNetworks.constants';

/**
 * Static list of popular networks for trending features.
 * Returns ProcessedNetwork objects similar to usePopularNetworks hook.
 * This is a static constant that doesn't depend on Redux state.
 *
 * To add a network, see `TRENDING_NETWORKS` in `trendingNetworks.constants.ts`.
 */
export const TRENDING_NETWORKS_LIST: ProcessedNetwork[] = TRENDING_NETWORKS.map(
  ({ name, caipChainId }) => ({
    id: caipChainId,
    name,
    caipChainId,
    isSelected: false,
    imageSource: getNetworkImageSource({ chainId: caipChainId }),
  }),
);

/**
 * Networks supported for RWA (Real World Asset) tokens.
 */
export const RWA_NETWORKS_LIST: ProcessedNetwork[] =
  TRENDING_NETWORKS_LIST.filter((n) =>
    [NetworkToCaipChainId.ETHEREUM, NetworkToCaipChainId.BNB].includes(
      n.caipChainId as NetworkToCaipChainId,
    ),
  );

export const RWA_CHAIN_IDS: CaipChainId[] = RWA_NETWORKS_LIST.map(
  (n) => n.caipChainId,
);
