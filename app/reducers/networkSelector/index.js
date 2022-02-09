export const initialState = {
	networkOnboardedState: [],
};

/**
 *
 * Network onboarding reducer
 * @returns
 */

function networkOnboardReducer(state = initialState, action) {
	switch (action.type) {
		case 'NETWORK_ONBOARDED':
			return {
				...state,
				networkOnboardedState: [{ network: action.payload, onboarded: true }, ...state.networkOnboardedState],
			};
		default:
			return state;
	}
}

export default networkOnboardReducer;
