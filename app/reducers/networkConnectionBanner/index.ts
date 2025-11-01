import { Hex } from '@metamask/utils';
import {
  NetworkConnectionBannerActionType,
  NetworkConnectionBannerAction,
} from '../../actions/networkConnectionBanner';
import { NetworkConnectionBannerStatus } from '../../components/UI/NetworkConnectionBanner/types';

/**
 * Type for defining what properties will be defined in store
 */
export type NetworkConnectionBannerState =
  | {
      visible: false;
    }
  | {
      visible: true;
      chainId: Hex;
      status: NetworkConnectionBannerStatus;
      networkName: string;
      rpcUrl: string;
      isInfuraEndpoint: boolean;
    };

/**
 * Initial state of the Network Connection Banners event flow
 */
export const initialState: NetworkConnectionBannerState = {
  visible: false,
};

/**
 * Reducer to Network Connection Banner relative event
 * @param {NetworkConnectionBannerState} state: the state of the Network Connection Banners event flow, default to initialState
 * @param {NetworkConnectionBannerAction} action: the action object contain type and payload to change state.
 * @returns {NetworkConnectionBannerState}: the new state of the Network Connection Banners event flow
 */
const networkConnectionBannerReducer = (
  state: NetworkConnectionBannerState = initialState,
  action: NetworkConnectionBannerAction = {
    type: NetworkConnectionBannerActionType.HIDE_NETWORK_CONNECTION_BANNER,
  },
): NetworkConnectionBannerState => {
  switch (action.type) {
    case NetworkConnectionBannerActionType.SHOW_NETWORK_CONNECTION_BANNER:
      return {
        visible: true,
        chainId: action.chainId,
        status: action.status,
        networkName: action.networkName,
        rpcUrl: action.rpcUrl,
        isInfuraEndpoint: action.isInfuraEndpoint,
      };
    case NetworkConnectionBannerActionType.HIDE_NETWORK_CONNECTION_BANNER:
      return {
        visible: false,
      };
    default:
      return state;
  }
};

export default networkConnectionBannerReducer;
