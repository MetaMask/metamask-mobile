import { Hex } from '@metamask/utils';
import {
  NetworkConnectionBannersActionType,
  NetworkConnectionBannersAction,
} from '../../actions/networkConnectionBanners';

/**
 * Interface for defining what properties will be defined in store
 */
export interface NetworkConnectionBannersState {
  visible: boolean;
  chainId?: Hex;
}

/**
 * Initial state of the Network Connection Banners event flow
 */
export const initialState: NetworkConnectionBannersState = {
  visible: false,
  chainId: undefined,
};

/**
 * Reducer to Network Connection Banners relative event
 * @param {NetworkConnectionBannersState} state: the state of the Network Connection Banners event flow, default to initialState
 * @param {NetworkConnectionBannersAction} action: the action object contain type and payload to change state.
 * @returns {NetworkConnectionBannersState}: the new state of the Network Connection Banners event flow
 */
const networkConnectionBannersReducer = (
  state = initialState,
  action: NetworkConnectionBannersAction = {
    type: NetworkConnectionBannersActionType.HIDE_SLOW_RPC_CONNECTION_BANNER,
  },
) => {
  switch (action.type) {
    case NetworkConnectionBannersActionType.SHOW_SLOW_RPC_CONNECTION_BANNER:
      return {
        ...state,
        visible: true,
        chainId: action.chainId,
      };
    case NetworkConnectionBannersActionType.HIDE_SLOW_RPC_CONNECTION_BANNER:
      return {
        ...state,
        visible: false,
        chainId: undefined,
      };
    default:
      return state;
  }
};

export default networkConnectionBannersReducer;
