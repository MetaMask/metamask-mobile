export const initialState = {
	networkOnboardedState: [],
	networkState: {
		showNetworkOnboarding: false,
		nativeToken: '',
		networkType: '',
		networkUrl: '',
	},
};

/**
 *
 * Network onboarding reducer
 * @returns
 */

function networkOnboardReducer(state = initialState, action) {
	switch (action.type) {
		case 'SHOW_NETWORK_ONBOARDING':
			return {
				...state,
				networkState: {
					showNetworkOnboarding: true,
					nativeToken: action.nativeToken,
					networkType: action.networkType,
					networkUrl: action.networkUrl,
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
				networkOnboardedState: [{ network: action.payload, onboarded: true }, ...state.networkOnboardedState],
			};
		default:
			return state;
	}
}

export default networkOnboardReducer;
