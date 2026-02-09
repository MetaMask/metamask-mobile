import { Hex, isCaipChainId } from '@metamask/utils';
import {
  isTestNet,
  getTestNetImageByChainId,
  getDefaultNetworkByChainId,
} from '../../../../util/networks';
import {
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  PopularList,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../util/networks/customNetworks';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';

const FAST_NETWORKS: Hex[] = [
  NETWORKS_CHAIN_ID.MEGAETH_MAINNET,
  NETWORKS_CHAIN_ID.MEGAETH_TESTNET_V2,
  NETWORKS_CHAIN_ID.MEGAETH_TESTNET,
];

export const isFastNetwork = (chainId?: Hex): boolean =>
  !!chainId && FAST_NETWORKS.includes(chainId);

export function getNetworkBadgeSource(chainId: Hex) {
  if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
  const defaultNetwork = getDefaultNetworkByChainId(chainId) as
    | {
        imageSource: string;
      }
    | undefined;

  if (defaultNetwork) {
    return defaultNetwork.imageSource;
  }

  const unpopularNetwork = UnpopularNetworkList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const customNetworkImg = CustomNetworkImgMapping[chainId];

  const popularNetwork = PopularList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const network = unpopularNetwork || popularNetwork;
  if (network) {
    return network.rpcPrefs.imageSource;
  }
  if (isCaipChainId(chainId)) {
    return getNonEvmNetworkImageSourceByChainId(chainId);
  }
  if (customNetworkImg) {
    return customNetworkImg;
  }
}
