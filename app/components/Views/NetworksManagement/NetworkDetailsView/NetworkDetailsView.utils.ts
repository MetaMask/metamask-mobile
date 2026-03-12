import { PopularList } from '../../../../util/networks/customNetworks';
import { BlockExplorerUrl } from '@metamask/controller-utils';
import stripProtocol from '../../../../util/stripProtocol';
import stripKeyFromInfuraUrl from '../../../../util/stripKeyFromInfuraUrl';

import { infuraProjectId } from './NetworkDetailsView.constants';

export const formatNetworkRpcUrl = (rpcUrl: string): string =>
  stripProtocol(stripKeyFromInfuraUrl(rpcUrl) ?? rpcUrl) ?? rpcUrl;

/**
 * Replace the Infura project ID placeholder with the actual key.
 */
export const templateInfuraRpc = (endpoint: string): string =>
  endpoint.endsWith('{infuraProjectId}')
    ? endpoint.replace('{infuraProjectId}', infuraProjectId ?? '')
    : endpoint;

/**
 * Fallback block explorer URL when networkConfiguration doesn't have one.
 * Checks PopularList first (by chainId), then falls back to BlockExplorerUrl.
 */
export const getDefaultBlockExplorerUrl = (
  chainId: string,
  networkType?: string,
): string | undefined => {
  const popularNetwork = PopularList.find(
    (network) => network.chainId === chainId,
  );
  if (popularNetwork?.rpcPrefs?.blockExplorerUrl) {
    return popularNetwork.rpcPrefs.blockExplorerUrl;
  }
  if (
    networkType &&
    BlockExplorerUrl[networkType as keyof typeof BlockExplorerUrl]
  ) {
    return BlockExplorerUrl[networkType as keyof typeof BlockExplorerUrl];
  }
  return undefined;
};
