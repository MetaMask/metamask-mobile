const initialState = {
	approvedHosts: {},
	privacyMode: true,
	thirdPartyApiMode: true,
};

const privacyReducer = (state = initialState, action) => {
	const newHosts = { ...state.approvedHosts };
	switch (action.type) {
		case 'APPROVE_HOST':
			return {
				...state,
				approvedHosts: {
					...state.approvedHosts,
					[action.hostname]: true,
				},
			};
		case 'REJECT_HOST':
			delete newHosts[action.hostname];
			return {
				...state,
				approvedHosts: newHosts,
			};
		case 'CLEAR_HOSTS':
			return {
				...state,
				approvedHosts: {},
			};
		case 'SET_PRIVACY_MODE':
			return {
				...state,
				privacyMode: action.enabled,
			};
		case 'SET_THIRD_PARTY_API_MODE':
			return {
				...state,
				thirdPartyApiMode: action.enabled,
			};
		default:
			return state;
	}
};

export default privacyReducer;
