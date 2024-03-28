import { NetworkProviderState } from '../../actions/networkProvider/state';

export const initialState: Readonly<NetworkProviderState> = {
  networkId: '',
};

/**
 *
 * Network onboarding reducer
 * @returns
 */

function networkProviderReducer(
  state = initialState,
  action: {
    networkId: string;
    type: string;
  } = {
    networkId: '',
    type: '',
  },
) {
  switch (action.type) {
    case 'NETWORK_ID_UPDATED':
      return {
        ...state,
        networkId: action.networkId,
      };
    case 'NETWORK_WILL_UPDATE':
      return {
        ...state,
        networkId: action.networkId,
      };

    default:
      return state;
  }
}

export default networkProviderReducer;
