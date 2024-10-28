export const initialState = {
  networkOnboardedState: {},
  networkState: {
    showNetworkOnboarding: false,
    nativeToken: '',
    networkType: '',
    networkUrl: '',
    requestSources: [] as { hostname: string; source: string }[],
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
    requestSources?: { url: string; source: string }[];
  } = {
    nativeToken: '',
    networkType: '',
    networkUrl: '',
    networkStatus: false,
    showNetworkOnboarding: false,
    type: '',
    payload: undefined,
    requestSources: [],
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
          ...state.networkOnboardedState,
          [action.payload]: true,
        },
      };
    case 'SET_REQUEST_SOURCE': {
      const { hostname, source } = action.payload;

      // Map through the existing requestSources, updating the entry if it exists, or leaving it as-is
      const updatedSources = state.networkState.requestSources.some(
        (entry) => entry.hostname === hostname,
      )
        ? state.networkState.requestSources.map((entry) =>
            entry.hostname === hostname ? { hostname, source } : entry,
          )
        : [...state.networkState.requestSources, { hostname, source }];

      // Return the updated state with modified requestSources array
      return {
        ...state,
        networkState: {
          ...state.networkState,
          requestSources: updatedSources,
        },
      };
    }
    default:
      return state;
  }
}

export default networkOnboardReducer;
