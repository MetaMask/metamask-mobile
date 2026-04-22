import { PopularList } from '../../../../util/networks/customNetworks';
import { BlockExplorerUrl } from '@metamask/controller-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import stripProtocol from '../../../../util/stripProtocol';
import stripKeyFromInfuraUrl from '../../../../util/stripKeyFromInfuraUrl';

import { infuraProjectId } from './NetworkDetailsView.constants';
import type { NetworkFormState, RpcEndpoint } from './NetworkDetailsView.types';

export const formatNetworkRpcUrl = (rpcUrl: string): string =>
  stripProtocol(stripKeyFromInfuraUrl(rpcUrl) ?? rpcUrl) ?? rpcUrl;

/** Next form state after appending a custom RPC (same transform as `onRpcItemAdd`). */
export function appendRpcItemToFormState(
  prev: NetworkFormState,
  url: string,
  name: string,
): NetworkFormState {
  if (!url) {
    return prev;
  }
  const newRpcUrl: RpcEndpoint = {
    url,
    name: name ?? '',
    type: RpcEndpointType.Custom,
  };
  return {
    ...prev,
    rpcUrls: [...prev.rpcUrls, newRpcUrl],
    rpcUrl: newRpcUrl.url,
    failoverRpcUrls: undefined,
    rpcName: newRpcUrl.name,
    rpcUrlForm: '',
    rpcNameForm: '',
  };
}

/** Next form state after selecting an RPC endpoint (same transform as `onRpcUrlChangeWithName`). */
export function applyRpcSelectionToFormState(
  prev: NetworkFormState,
  url: string,
  failoverUrls: string[] | undefined,
  name: string,
  type: string,
): NetworkFormState {
  const nameToUse = name || type;
  return {
    ...prev,
    rpcName: nameToUse,
    rpcUrl: url,
    failoverRpcUrls: failoverUrls,
  };
}

/** Next form state after removing an RPC URL from the list (same transform as `onRpcUrlDelete`). */
export function removeRpcUrlFromFormState(
  prev: NetworkFormState,
  url: string,
): NetworkFormState {
  const updated = prev.rpcUrls.filter((rpc) => rpc.url !== url);
  const isCurrentRpc = prev.rpcUrl === url;
  return {
    ...prev,
    rpcUrls: updated,
    ...(isCurrentRpc && updated.length > 0
      ? {
          rpcUrl: updated[0].url,
          failoverRpcUrls: updated[0].failoverUrls,
          rpcName: updated[0].name,
        }
      : {}),
  };
}

/** Next form state after adding a block explorer URL (same transform as `onBlockExplorerItemAdd`). */
export function appendBlockExplorerItemToFormState(
  prev: NetworkFormState,
  url: string,
): NetworkFormState {
  if (!url) {
    return prev;
  }
  if (prev.blockExplorerUrls.includes(url)) {
    return prev;
  }
  return {
    ...prev,
    blockExplorerUrls: [...prev.blockExplorerUrls, url],
    blockExplorerUrl: url,
    blockExplorerUrlForm: undefined,
  };
}

/** Next form state after selecting a block explorer URL (same transform as `onBlockExplorerSelect`). */
export function applyBlockExplorerSelectionToFormState(
  prev: NetworkFormState,
  url: string,
): NetworkFormState {
  return {
    ...prev,
    blockExplorerUrl: url,
  };
}

/** Next form state after removing a block explorer URL (same transform as `onBlockExplorerUrlDelete`). */
export function removeBlockExplorerUrlFromFormState(
  prev: NetworkFormState,
  url: string,
): NetworkFormState {
  return {
    ...prev,
    blockExplorerUrls: prev.blockExplorerUrls.filter((u) => u !== url),
  };
}

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
