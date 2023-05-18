export const initialState = {
  networkOnboardedState: {},
  networkState: {
    showNetworkOnboarding: false,
    nativeToken: '',
    networkType: '',
    networkUrl: '',
  },
  switchedNetwork: {
    networkUrl: '',
    networkStatus: false,
  },
};

/**
 *
 * Network onboarding reducer
 * @returns
 */

function networkOnboardReducer(
  state = initialState,
  action: {
    nativeToken: string;
    networkType: string;
    networkUrl: string;
    networkStatus: boolean;
    showNetworkOnboarding: boolean;
    type: string;
    payload: any;
  } = {
    nativeToken: '',
    networkType: '',
    networkUrl: '',
    networkStatus: false,
    showNetworkOnboarding: false,
    type: '',
    payload: undefined,
  },
) {
  switch (action.type) {
    case 'SHOW_NETWORK_ONBOARDING':
      return {
        ...state,
        networkState: {
          showNetworkOnboarding: action.showNetworkOnboarding,
          nativeToken: action.nativeToken,
          networkType: action.networkType,
          networkUrl: action.networkUrl,
        },
      };
    case 'NETWORK_SWITCHED':
      return {
        ...state,
        switchedNetwork: {
          networkUrl: action.networkUrl,
          networkStatus: action.networkStatus,
        },
      };
    case 'NETWORK_ONBOARDED':
      return {
        ...state,
        networkState: {
          showNetworkOnboarding: false,
          nativeToken: '',
          networkType: '',
          networkUrl: '',
        },
        networkOnboardedState: {
          [action.payload]: true,
          ...state.networkOnboardedState,
        },
      };
    default:
      return state;
  }
}

export default networkOnboardReducer;
