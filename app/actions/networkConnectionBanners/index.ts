import { Hex } from '@metamask/utils';
import { Action } from 'redux';

/**
 * Different action types available for different RPC event flow
 */
export enum NetworkConnectionBannersActionType {
  SHOW_SLOW_RPC_CONNECTION_BANNER = 'SHOW_SLOW_RPC_CONNECTION_BANNER',
  HIDE_SLOW_RPC_CONNECTION_BANNER = 'HIDE_SLOW_RPC_CONNECTION_BANNER',
}

/**
 * Action to show the slow RPC connection banner
 * chainId is required to identify which network is slow
 */
export interface ShowSlowRpcConnectionBannerAction extends Action {
  type: NetworkConnectionBannersActionType.SHOW_SLOW_RPC_CONNECTION_BANNER;
  chainId: Hex;
}

/**
 * Action to hide the slow RPC connection banner
 * No parameters needed - just hides the currently visible banner
 */
export interface HideSlowRpcConnectionBannerAction extends Action {
  type: NetworkConnectionBannersActionType.HIDE_SLOW_RPC_CONNECTION_BANNER;
}

export type NetworkConnectionBannersAction =
  | ShowSlowRpcConnectionBannerAction
  | HideSlowRpcConnectionBannerAction;

/**
 * showSlowRpcConnectionBanner action creator
 * @param {Hex} chainId: the chain id of the network that is slow
 * @returns {ShowSlowRpcConnectionBannerAction} - the action object to show the slow rpc connection banner
 */
export function showSlowRpcConnectionBanner(
  chainId: Hex,
): ShowSlowRpcConnectionBannerAction {
  return {
    type: NetworkConnectionBannersActionType.SHOW_SLOW_RPC_CONNECTION_BANNER,
    chainId,
  };
}

/**
 * hideSlowRpcConnectionBanner action creator
 * @returns {HideSlowRpcConnectionBannerAction} - the action object to hide the slow rpc connection banner
 */
export function hideSlowRpcConnectionBanner(): HideSlowRpcConnectionBannerAction {
  return {
    type: NetworkConnectionBannersActionType.HIDE_SLOW_RPC_CONNECTION_BANNER,
  };
}
