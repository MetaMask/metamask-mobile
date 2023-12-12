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
  // eslint-disable-next-line @typescript-eslint/default-param-last
  state = initialState,
  action: {
    nativeToken: string;
    networkType: string;
    networkUrl: string;
    networkStatus: boolean;
    showNetworkOnboarding: boolean;
    type: string;
    payload: any;
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
        networkOnboardedState: {
          [action.payload]: true,
          ...state.networkOnboardedState,
        },
        networkState: {
          showNetworkOnboarding: false,
          nativeToken: '',
          networkType: '',
          networkUrl: '',
        },
      };
    default:
      return state;
  }
}

export default networkOnboardReducer;
