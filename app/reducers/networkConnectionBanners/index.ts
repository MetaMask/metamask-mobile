import { Hex } from '@metamask/utils';
import {
  NetworkConnectionBannersActionType,
  NetworkConnectionBannerAction,
} from '../../actions/networkConnectionBanners';
import { NetworkConnectionBannerStatus } from '../../components/UI/NetworkConnectionBanner/types';

/**
 * Type for defining what properties will be defined in store
 */
export type NetworkConnectionBannersState =
  | {
      visible: false;
    }
  | {
      visible: true;
      chainId: Hex;
      status: NetworkConnectionBannerStatus;
    };

/**
 * Initial state of the Network Connection Banners event flow
 */
export const initialState: NetworkConnectionBannersState = {
  visible: false,
};

/**
 * Reducer to Network Connection Banners relative event
 * @param {NetworkConnectionBannersState} state: the state of the Network Connection Banners event flow, default to initialState
 * @param {NetworkConnectionBannerAction} action: the action object contain type and payload to change state.
 * @returns {NetworkConnectionBannersState}: the new state of the Network Connection Banners event flow
 */
const networkConnectionBannersReducer = (
  state: NetworkConnectionBannersState = initialState,
  action: NetworkConnectionBannerAction = {
    type: NetworkConnectionBannersActionType.HIDE_NETWORK_CONNECTION_BANNER,
  },
): NetworkConnectionBannersState => {
  switch (action.type) {
    case NetworkConnectionBannersActionType.SHOW_NETWORK_CONNECTION_BANNER:
      return {
        visible: true,
        chainId: action.chainId,
        status: action.status,
      };
    case NetworkConnectionBannersActionType.HIDE_NETWORK_CONNECTION_BANNER:
      return {
        visible: false,
      };
    default:
      return state;
  }
};

export default networkConnectionBannersReducer;
