import { Hex } from '@metamask/utils';
import { Action } from 'redux';
import { NetworkConnectionBannerStatus } from '../../components/UI/NetworkConnectionBanner/types';
/**
 * Different action types available for different RPC event flow
 */
export enum NetworkConnectionBannerActionType {
  SHOW_NETWORK_CONNECTION_BANNER = 'SHOW_NETWORK_CONNECTION_BANNER',
  HIDE_NETWORK_CONNECTION_BANNER = 'HIDE_NETWORK_CONNECTION_BANNER',
}

/**
 * Action to show the network connection banner
 * chainId is required to identify which network is having the issue
 * status is required to identify the status of the network connection banner
 */
export interface ShowNetworkConnectionBannerAction extends Action {
  type: NetworkConnectionBannerActionType.SHOW_NETWORK_CONNECTION_BANNER;
  chainId: Hex;
  status: NetworkConnectionBannerStatus;
  networkName: string;
  rpcUrl: string;
  isInfuraEndpoint: boolean;
}

/**
 * Action to hide the network connection banner
 * No parameters needed - just hides the currently visible banner
 */
export interface HideNetworkConnectionBannerAction extends Action {
  type: NetworkConnectionBannerActionType.HIDE_NETWORK_CONNECTION_BANNER;
}

export type NetworkConnectionBannerAction =
  | ShowNetworkConnectionBannerAction
  | HideNetworkConnectionBannerAction;

/**
 * showNetworkConnectionBanner action creator
 * @param {Hex} chainId: the chain id of the network that is having the issue
 * @param {NetworkConnectionBannerStatus} status: the status of the network connection banner
 * @returns {ShowNetworkConnectionBannerAction} - the action object to show the network connection banner
 */
export function showNetworkConnectionBanner({
  chainId,
  status,
  networkName,
  rpcUrl,
  isInfuraEndpoint,
}: {
  chainId: Hex;
  status: NetworkConnectionBannerStatus;
  networkName: string;
  rpcUrl: string;
  isInfuraEndpoint: boolean;
}): ShowNetworkConnectionBannerAction {
  return {
    type: NetworkConnectionBannerActionType.SHOW_NETWORK_CONNECTION_BANNER,
    chainId,
    status,
    networkName,
    rpcUrl,
    isInfuraEndpoint,
  };
}

/**
 * hideNetworkConnectionBanner action creator
 * @returns {HideNetworkConnectionBannerAction} - the action object to hide the network connection banner
 */
export function hideNetworkConnectionBanner(): HideNetworkConnectionBannerAction {
  return {
    type: NetworkConnectionBannerActionType.HIDE_NETWORK_CONNECTION_BANNER,
  };
}
