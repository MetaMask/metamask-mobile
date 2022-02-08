export const NETWORK_ONBOARDED = 'NETWORK_ONBOARDED';

export const initialState = {
	networkOnboardedState: [],
};

export const onboardNetworkAction = (data) => ({
	type: NETWORK_ONBOARDED,
	payload: data,
});

function networkOnboardReducer(state = initialState, action) {
	switch (action.type) {
		case NETWORK_ONBOARDED:
			return {
				...state,
				networkOnboardedState: [{ network: action.payload, onboarded: true }, ...state.networkOnboardedState],
			};
		default:
			return state;
	}
}

export default networkOnboardReducer;
