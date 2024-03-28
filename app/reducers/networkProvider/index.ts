import { NetworkProviderState } from '../../actions/networkProvider/state';

export const initialState: Readonly<NetworkProviderState> = {
  networkProvider: { networkId: '' },
};

/**
 *
 * Network onboarding reducer
 * @returns
 */

function networkOnboardReducer(
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
        networkProvider: {
          ...state.networkProvider,
          networkId: action.networkId,
        },
      };
    case 'NETWORK_WILL_UPDATE':
      return {
        ...state,
        networkProvider: {
          ...state.networkProvider,
          networkId: action.networkId,
        },
      };

    default:
      return state;
  }
}

export default networkOnboardReducer;
